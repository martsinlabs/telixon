# Architecture

How Telixon is structured, why, and the invariants that keep it coherent as it grows. Read this before
a non-trivial change.

## How to read this

Each section is `bold claim -> short explanation`. For a two-minute mental model, read
[Organizing principle](#organizing-principle), [Layer stack](#layer-stack), and
[Data flow](#data-flow). Read the rest top to bottom when you need detail; every section is short and
self-contained.

## Goals

Telixon is a phone-number library verified against Google libphonenumber, the reference implementation. Four priorities drive every decision, in order:

1. **Performance.** The input path runs on every keystroke. Allocation and indirection in hot paths
   are defects, not style choices.
2. **Accuracy.** Behavior is verified against Google's libphonenumber, the reference implementation,
   at a pinned commit. Divergence is a bug.
3. **Stability.** The public API is a contract. Additions are deliberate; removals are breaking.
4. **Semantic clarity.** Names, types, and module boundaries make correct use obvious and incorrect
   use awkward.

## Organizing principle

Everything follows from one idea:

> A pure, deterministic engine that does not know where it runs, wrapped in thin, replaceable layers
> that each add exactly one concern and depend only on the layers beneath them.

Dependencies point toward the core; no layer reaches around its neighbor. Hold this invariant and the
rest (headless UI, portability, testability, small bundles) follows.

## Repository layout

A pnpm monorepo. Published libraries live in `packages/`; non-published apps live in `apps/`.

```
telixon/
  packages/
    core/          @telixon/core    pure engine, all phone-number logic
    web-sdk/       @telixon/web-sdk headless DOM adapter for <input> elements
  apps/
    sandbox/       internal dev workbench (Vite + TS), never published
  CLAUDE.md        engineering standards and AI-assistant operating notes
  ARCHITECTURE.md  this document
```

Planned packages (not yet present): `components`, `angular`, `react`, `vue`.
The layer model below is designed so they slot in without reshaping existing packages.

## Layer stack

Each layer adds one concern and depends only on layers beneath it.

| Layer | Where                         | Adds                                                                  | Depends on | Status  |
| ----- | ----------------------------- | --------------------------------------------------------------------- | ---------- | ------- |
| 0     | `core/src/engine` (generated) | Metadata: binary engine layers, provenance-pinned                     | nothing    | present |
| 1     | `core/src/engine` accessor    | Engine: typed access and walk/format primitives                       | layer 0    | present |
| 2     | `core/src/modules`            | Resolution (DFA walk) + query methods (pure reads)                    | layer 1    | present |
| 3     | `core/src/resource-*`         | How the engine artifact is loaded and decoded (node / browser / edge) | layer 1    | present |
| 4     | `@telixon/web-sdk`            | Headless: DOM events to engine ops + `subscribe`                      | core       | present |
| 5     | `angular` / `react` / `vue`   | `subscribe` to framework-native reactive state                        | web-sdk    | planned |
| 6     | `components`                  | Optional drop-in `<tel-input>`; the only renderer                     | web-sdk    | planned |
| 7     | user code                     | All markup, styles, country-selector wiring                           | a binding  | n/a     |

The split keeps the engine free of DOM, reactivity, and framework weight, and lets a caller enter at
the level matching their need:

- **`@telixon/components`**: drop in a component, one line. (planned)
- **`@telixon/web-sdk`**: bring your own UI, roughly ten lines.
- **`@telixon/core`**: bypass the SDK.

UI rendering belongs only in the planned `components` layer; `web-sdk` stays UI-free.

## Data flow

Input is strictly one-directional. The DOM is the source of raw events; the engine is the source of
truth for the resolved value; everything downstream reacts.

```
DOM event
  -> web-sdk translates it to a core insert / delete / caret operation
  -> core resolves and returns InputState
  -> web-sdk applies value and caret to the <input>, then notifies subscribers
  -> framework binding maps the new state to reactive state
  -> user code re-renders
```

The engine is imperative and synchronous: a call returns the next `InputState` directly. Reactivity is
added once, in `web-sdk`, via `subscribe(listener)`; it is not baked into the engine.

## Engine

The engine is the original work and the differentiator.

**It is a generated artifact, not hand-written source.** `core/src/engine` contains no `.ts` files. It
is `index.js` + `index.d.ts` (the accessor API) plus binary layers, compiled from Google's
libphonenumber metadata by a separate tool. Never hand-edit it; changes come from recompiling and
bumping provenance.

**It is a family of deterministic finite-state automata, not per-region data.** Google publishes its
metadata as regular expressions; the compiler turns them into automata. At the core is a recognition
DFA: a number's digits drive deterministic state transitions, and the state reached decides validity
and number type. Region disambiguation and format selection run on dedicated finite-state transducers,
automata that emit a value (a region, a format index) at the end of the walk instead of a yes/no.
Resolving a number is therefore a linear-time table walk, deterministic and backtracking-free, which is
what makes per-keystroke resolution cheap. The recognition automaton is global and unified: one number
is matched against every region at once, with no per-region data to load. The only regular expression
left at runtime is the per-territory national-prefix rewrite, a bounded capture-group transform applied
once per parse. The engine ships as four embedded modules carrying nine binary layers:

```
walk.bin.js      recognition DFA state graph, calling-code dispatch, region disambiguation
verdict.bin.js   baked validity and number-type verdicts, exact-acceptance terminals
scope.bin.js     number-type scope, per-region length masks
metadata.bin.js  formats, masks, territory and reference data (string-table encoded), format selection
```

**Provenance is the audit trail.** `engine/PROVENANCE.json` pins the upstream repository, commit, file
hash, and coverage. Nothing is derived by hand; the file is what lets accuracy be reproduced.

## Metadata delivery

The engine loads as a **single indivisible artifact**. Because the recognition automaton is unified, a
single region cannot be loaded in isolation; there is no per-region lazy loading by design.

The four modules ship as base64-of-gzip ESM (`engine/embedded/*.bin.js`); the library owns loading and
decoding. Initialization is explicit and **asynchronous by default**: `await ensureEngineReady()` from
`@telixon/core` loads the engine on demand and decodes it off the main thread. A synchronous path lives
in a separate thin entry, `@telixon/core/sync-init`, exporting `ensureEngineReadySync()`, which
statically bundles the modules and decodes them in-process. Each uses the fastest decode the runtime has:

- **Node**: dynamic import with native `zlib.gunzip` off the libuv threadpool (async), or static import
  with `zlib.gunzipSync` (`@telixon/core/sync-init`).
- **Browser**: the host bundler code-splits the modules into lazy chunks that `ensureEngineReady()`
  fetches and decodes off the main thread (`DecompressionStream`); `@telixon/core/sync-init` bundles
  them into your JS and decodes with the pure-JS floor.
- **Edge** (`workerd`, `edge-light`, `worker`): `ensureEngineReadySync()` from `@telixon/core/sync-init`,
  called in global scope, initializes once per isolate, outside per-request CPU accounting, with the
  pure-JS floor.

The pure-JS base64 + gunzip floor runs in any runtime and is byte-equality-tested against zlib in CI.

The bundle-size story is code-and-data separation, not "ship fewer regions":

- The JS code is tree-shakeable; a caller pays only for the functions they import.
- The engine artifact is runtime data, out of the initial JS bundle (~119 KB gzipped across four
  content-hashed chunks, ~0.61 MB decompressed). The async entries load it lazily (cached after first
  load on the web); `@telixon/core/sync-init` carries it in the bundle.

`index.node.ts`, `index.browser.ts`, and `index.edge.ts` (selected via package export conditions) bind
`ensureEngineReady()` to the environment's loader and re-export the shared `index.ts`;
`index.sync-init.ts` and `index.sync-init.node.ts` back the `@telixon/core/sync-init` entry. The
provider is process-wide, so either entry readies one engine and the rest of the code stays
environment-agnostic. Initialization is explicit: `await ensureEngineReady()` is the default,
`ensureEngineReadySync()` from `@telixon/core/sync-init` is the synchronous path, and an API call before
either throws `EngineNotReadyError`. `isEngineReady()` is a synchronous readiness predicate. Full
detail: [Initialization](docs/initialization.md).

## Resolution

There is one resolution core. Both entry shapes use it; neither duplicates query logic:

- `parsePhoneNumber(input, options)`: one-shot, for a complete string.
- `createInternationalInputController` / `createNationalInputController`: incremental, per keystroke.

The `PhoneNumber` query surface (`isValid`, `isPossible`, `isPossibleWithReason`, `getNumberType`,
`getNationalNumber`, `getCallingCode`, `getRegion`, `formatE164`, `formatNational`, `formatInternational`,
`formatRfc3966`) is pure reads over an already-resolved snapshot.

## Cross-cutting invariants

Layers give structure; these invariants are what keep it correct. Accuracy is machine-checked
in CI; the rest are enforced in review.

### Accuracy

`packages/core/conformance` runs the public query methods against Google's libphonenumber across every
supported region, on valid numbers, display spellings, deterministic corruptions, and every digit
prefix, and fails CI on any divergence outside an explicit allowlist. The oracle loads Google's
source at **the same commit the engine was compiled from**, so there is no metadata version drift: a
mismatch is always a real engine difference, never a stale reference. The current baseline is on the
[live dashboard](https://telixon.dev/parity.html). See
[conformance/README.md](packages/core/conformance/README.md).

### Performance

The per-keystroke path is hot. The standing rule: avoid allocation, regex, and indirection in hot
paths; prefer charCode parsing and early exits. Outside hot paths, allocation is fine where it improves
clarity. This is a discipline applied in review and backed by the benchmark suite (`pnpm bench`), with
continuous performance regression tracking in CI via CodSpeed. It is not a formal zoning map.

### Bundle size

The lever for bundle size is keeping heavy metadata out of the JS bundle (see Metadata delivery) and
keeping code tree-shakeable. Adding a feature must not pull unrelated code into a caller's bundle.

## Module conventions

These keep modules independent and the dependency graph legible. They are enforced in review.

- **One primary concept per file**, named for the one thing it exports.
- **Self-contained modules.** Each owns its `models/`, `utils/`, and `index.ts`.
- **`index.ts` is a re-export barrel only.** No logic in a barrel.
- **Never import a module's internals.** Import only from another module's `index.ts`, so internal
  layout is free to change without rippling outward.
- **Types live close to usage.** Promote a type to `models/` only once it is shared across modules.

## Naming

The engine and the public API both speak in **regions** (`RegionCode`, `REGION_CODES`, `getRegion`, the
`defaultRegion` config), matching libphonenumber and ECMAScript `Intl`, where a region is an ISO 3166-1 area that
may not be a sovereign country. "Country" appears only as a UI label in the web-sdk country picker, the
word users expect for that dropdown. The term "calling code" names the ITU E.164 dial prefix (the `+1`
number), never the region; the two stay distinct everywhere, including internal names.

## Public API

- Exports are a contract. Add deliberately; a removal is breaking.
- Never expose an internal type through the public API; define explicit public-facing types.
- A caller must not need to understand internals to use a function correctly.

## Error handling

- Pure functions never throw. Where failure is meaningful, return `null` or a typed
  `{ ok: true; value } | { ok: false; error }` result.
- Throw only at unrecoverable system boundaries, such as corrupt binary metadata.
- Never swallow an error silently.

## Hard rules

Pure functions or closure factories by default; classes only for one of four documented patterns:
a polymorphic contract (such as `InputController`), an I/O adapter (such as the resource loaders),
a cached interface implementation (such as `PhoneNumberView`), or a state machine (such as
`NumberResolver`). No `any`. No default exports. No input mutations; always return new values.
Module-level and per-instance memoization caches are permitted when the cached function stays
referentially transparent. No silent failures. The full engineering standards and their rationale
are defined in [CONTRIBUTING.md](CONTRIBUTING.md).

# Contributing

How to set up, develop, and contribute. For the system architecture, see
[ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

- Node, version pinned in [.nvmrc](.nvmrc) (run `nvm use`).
- pnpm 10 (`corepack enable`).
- git.

## Setup

```
git clone https://github.com/martsinlabs/telixon.git
cd telixon
pnpm install --frozen-lockfile
```

## Project layout

A pnpm monorepo.

```
packages/core      @telixon/core    engine and phone-number logic
packages/web-sdk   @telixon/web-sdk headless DOM adapter
apps/docs          landing page and documentation site (telixon.dev)
apps/sandbox       internal dev workbench
examples/          runnable examples, one per topic
```

## Development

Run from the repo root:

| Command                      | Does                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `pnpm test`                  | unit tests (Vitest), offline                                                 |
| `pnpm lint`                  | ESLint                                                                       |
| `pnpm lint:fix`              | ESLint with autofix                                                          |
| `pnpm format`                | Prettier (write)                                                             |
| `pnpm format:check`          | Prettier (check only; used by CI)                                            |
| `pnpm typecheck`             | TypeScript, no emit, all packages                                            |
| `pnpm typecheck:conformance` | TypeScript for the conformance harness                                       |
| `pnpm bench`                 | benchmarks, console output                                                   |
| `pnpm bench:report`          | bench + writes `bench.json`, `bench-badge.json`, `benchmark.html`            |
| `pnpm conformance`           | parity gate vs Google libphonenumber (fetches Google source once per commit) |
| `pnpm fuzz`                  | randomized differential sweep against the oracle                             |
| `pnpm size`                  | `size-limit` budgets for the published entries                               |
| `pnpm build`                 | build all packages                                                           |

## Submitting changes

`main` is protected. Every change lands through a pull request. Merges are squash-only, which makes
the pull request title the commit subject on `main`.

1. Branch off `main`.
2. Make your change.
3. Run and pass, in order: `pnpm test`, `pnpm lint`, `pnpm format`, `pnpm typecheck`. For engine or
   query changes, also run `pnpm conformance`. Fix the root cause and re-run. Skip only for pure
   documentation changes.
4. Push to your fork and open a pull request against `main`. Give it a short, one-line conventional
   title: `type(scope): summary` (for example `feat(core): add parsePhoneNumber`).
5. The `verify`, `test-matrix`, `runtime-*`, `conformance`, `codspeed`, and `bundle` checks must
   pass on the pull request, with the branch up to date with `main`.
6. Keep the pull request small and single-purpose.

Telixon has a single maintainer who reviews and merges.

## Releasing

Packages release independently. A release is a changelog cut, a version bump, a tag, and an
automated publish from CI. `main` is protected; everything except the tag lands through a pull
request.

1. Open a release pull request for the package.
   - Move the `Unreleased` section of `packages/<package>/CHANGELOG.md` under the new version with
     the release date; retarget the comparison links.
   - The changelog decides the bump. Entries under `Removed`, or breaking entries under `Changed`,
     make it major; `Added` makes it minor; `Fixed` alone makes it patch.
   - Set `version` in `packages/<package>/package.json` and refresh the lockfile with
     `pnpm install`.
2. Merge the pull request, then pull `main`.
3. Tag the merge commit as `<package>@v<version>` and push the tag:

   ```sh
   git tag core@v1.0.0 && git push origin core@v1.0.0
   ```

4. The tag triggers `.github/workflows/release-<package>.yml`. It runs typecheck, tests, build, and
   the published-types check (the core workflow also runs the conformance gate), then publishes to
   npm with provenance through `scripts/safe-publish.mjs`. The publish step stamps the package's
   measured bundle size into the published manifest as `bundleSize`; the README size badge reads it
   from the registry.
5. Create the GitHub release from the tag, with the changelog section as the body.

`@telixon/web-sdk` declares `@telixon/core` as a peer dependency; release core first. The web-sdk
workflow stops before publishing when the core version it needs is not on npm.

## Engineering standards

These are the canonical engineering standards for Telixon. They are non-negotiable.

### Functions

- One responsibility per function. No "and" in what it does.
- Pure by default; side effects only at explicit I/O boundaries.
- No boolean flag parameters; no optional parameters that change fundamental behavior. Use separate
  functions.
- Never mutate inputs; always return new values.

### Types

- String-literal unions for closed-set domain primitives (`RegionCode`, `NumberType`).
- Discriminated unions over optional fields for variants.
- `unknown` + type guards at all system boundaries (binary parsing, user input).
- No `as` casts, no type widening. Fix the root cause.
- Types live close to usage; move to `models/` only when shared across modules.

### Error handling

- Pure functions never throw; return `null` or a typed `{ ok: true; value } | { ok: false; error }`
  result where failure is meaningful.
- Throw only at unrecoverable system boundaries (corrupt binary data).
- Never swallow errors silently.

### Module organization

- One primary concept per file.
- Each module is self-contained: own `models/`, `utils/`, `index.ts`.
- `index.ts` is a re-export barrel only. No logic.
- Never import a module's internals. Only its `index.ts`.

### Naming

- Public exports must be self-documenting. No abbreviations, no ambiguity.
- Internal names can be shorter but must stay unambiguous in context.

### Public API

- Exports are a contract. Add deliberately; removal is breaking.
- Never expose internal types through the public API; define explicit public-facing types.
- Callers must not need to understand internals to use a function correctly.

### Performance

- No unnecessary allocations or copies in hot paths.
- Every dependency must be justified by measurable need.
- Bundle size is a hard constraint.

### Hard rules

- Pure functions or closure factories by default. A class is allowed only when one of the
  following patterns applies, and its rationale must be obvious from context:
  - **Polymorphic contract.** Multiple implementations of one interface are selected at runtime
    (for example `InputController` and its `International` / `National` variants).
  - **I/O adapter.** A runtime boundary is bridged behind an interface (for example resource loaders).
  - **Cached interface implementation.** The class exists solely to memoize underlying pure
    functions on a per-instance basis (for example `PhoneNumberView` for `PhoneNumber`). Same input must
    produce the same output across calls; the class adds caching alone.
  - **State machine.** The contract is a sequence of state transitions reached through an
    imperative API (for example `NumberResolver.advance(...)`, `.reset()`, `.snapshot`). The class wraps
    a mutation sequence that has no equivalent pure form.
- **No input mutations.** Function arguments are immutable; always return new values. Module-level
  and per-instance memoization caches are permitted as internal optimizations, provided the cached
  function stays referentially transparent (same key always returns the same value) and inputs are
  never written to.
- No `any`.
- No default exports.
- No silent failures.

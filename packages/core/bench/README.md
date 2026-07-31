# Benchmarks

Compares Telixon against [libphonenumber-js][libphonenumber-js] and
[google-libphonenumber][google-libphonenumber] (a community wrapper around Google's libphonenumber JS
source) across the public query surface. Same corpus, same runner, same code path, all sources in
this directory.

## Run

```bash
pnpm build         # benchmarks measure the built package
pnpm bench         # console only
pnpm bench:report  # also writes dist/{bench.json, bench-badge.json, benchmark.html}
```

Vitest bench (Tinybench) reports `ops/sec`, mean, p99, and ±rme per library per operation. Competitor
versions are resolved at runtime from `node_modules`, pinned in `package.json`.

## Methodology

Every library runs its built artifact. Telixon is imported through the `#dist` specifier, which
resolves to `dist/index.node.js`, the same file npm consumers install; the competitors run their
published `node_modules` builds. A guard fails the suite when `dist` is missing or older than
`src`. The parse scenario runs with a lengthened warmup and sample window so every library reaches
steady JIT state before sampling; the same options apply to all three adapters. The strict-cold
scenario clears Telixon's process-wide memo caches every iteration while leaving the competitors
untouched, which biases that scenario against Telixon by design.

## Corpus

Built at startup from the [oracle](../oracle/) (Google libphonenumber source at the engine's pinned
commit), filtered to the engine's supported regions, one example number per region per type. No
on-disk snapshot, which keeps the bench from drifting away from conformance.

## Scenarios

| Scenario      | What is measured                                            | Models                            |
| ------------- | ----------------------------------------------------------- | --------------------------------- |
| `Parse`       | `parsePhoneNumber` only.                                    | Standalone parse cost.            |
| `Strict cold` | `parse + X`. Telixon module caches cleared every iteration. | One-shot use, no cache reuse.     |
| `Cold`        | `parse + X`. Caches retained across iterations.             | Repeated traffic on same numbers. |
| `Warm`        | Pre-parsed value, method called repeatedly.                 | Re-render, change detection.      |

`Strict cold` is the most conservative measurement and anchors `headline.medianStrictColdRatio` in
`dist/bench.json`. The README badge is a static pointer to the dashboard.

Telixon's `PhoneNumber` memoizes derived values; competitors recompute on every call. Where
libphonenumber-js stores a field as a direct property after parse (`nationalNumber`,
`countryCallingCode`, `number`, `country`), the warm comparison is a property read against
Telixon's cached method call; the dashboard shows the current numbers.

## Files

- `hotpath.bench.ts`: Parse + 11 strict-cold + 11 cold + 11 warm workloads.
- `input-controller.bench.ts`: Telixon-only. Type-through, query suite per keystroke, backspace,
  undo+redo cycle, full unwind. Competitor formatters have no comparable API.
- `competitors.ts`: three adapters, one `PhoneLibraryAdapter` interface.
- `corpus.ts`: live corpus build from the oracle.
- `measure-keystroke-latency.ts`: per-keystroke insert latency distribution (`dist/keystroke-latency.json`).
- `artifacts.ts` + `emit-artifacts.ts` + `benchmark.template.html`: JSON + HTML emitter.

## Caveats

Absolute numbers vary by hardware. Ratios are more stable.

[libphonenumber-js]: https://github.com/catamphetamine/libphonenumber-js
[google-libphonenumber]: https://github.com/ruimarinho/google-libphonenumber

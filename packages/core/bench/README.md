# Benchmarks

Compares Telixon against [libphonenumber-js][libphonenumber-js] and
[google-libphonenumber][google-libphonenumber] (an npm wrapper around Google's libphonenumber JS
source) across the public query surface. Same corpus, same runner, same code path, all sources in
this directory.

## Run

```bash
pnpm bench         # console only
pnpm bench:report  # also writes dist/{bench.json, bench-badge.json, benchmark.html}
```

Vitest bench (Tinybench) reports `ops/sec`, mean, p99, and ±rme per library per operation. Competitor
versions are resolved at runtime from `node_modules`, pinned in `package.json`.

## Corpus

Built at startup from the [oracle](../oracle/) (Google libphonenumber source at the engine's pinned
commit), filtered to the engine's supported regions, one example number per region per type. No
on-disk snapshot, so the bench cannot drift from conformance.

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

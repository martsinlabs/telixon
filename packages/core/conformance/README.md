# Conformance

Proves Telixon's public query methods match [Google libphonenumber][lpn], the reference
implementation, across every supported region.

## Run

```bash
pnpm conformance        # gate: fails on any divergence outside the allowlist
```

Full report with sample mismatches:

```bash
npx vitest run --config vitest.conformance.config.ts --disableConsoleIntercept
```

Excluded from `pnpm test`, so the unit suite stays fast and offline.

## Version-matched oracle

Google publishes no npm package. Its JS port lives as Closure-coupled source in the repo. The oracle
fetches that source at the **same commit the engine was built from** (`src/engine/PROVENANCE.json`)
and runs it on `google-closure-library`. Sources are cached under `.cache/<commit>/`, so only the
first run needs network.

Because the oracle and the engine share one commit, there is **no metadata version drift**: any
mismatch is a real engine difference, never a stale reference.

## How it works

```
corpus ──▶ for each number ──▶ oracle  (Google's answer)
                          └──▶ subject (Telixon's answer)
                                  └──▶ compare ──▶ report ──▶ gate
```

| File                   | Role                                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| `oracle.ts`            | loads Google's source at the engine's commit; example numbers + verdicts |
| `corpus.ts`            | builds the corpus: one Google example number per region × type           |
| `subject.ts`           | runs Telixon over a number                                               |
| `compare.ts`           | diffs the two sides, aggregates per-method match rates                   |
| `report.ts`            | formats the report                                                       |
| `known-divergences.ts` | the allowlist of accepted mismatches + audit                             |
| `conformance.test.ts`  | the gate                                                                 |
| `models.ts`            | shared types                                                             |

## Reading the report

```
oracle and engine pinned to google/libphonenumber@<commit> · no metadata drift
<N> numbers · <covered>/<total> regions · <skipped> skipped

  <method>  <rate>  (<matched>/<total>)
```

The header shows the shared commit and coverage (`skipped` = numbers the oracle could not parse). One
line per method: match rate and `(matched / total)`. Any mismatch prints an indented line:
`expected` is Google, `actual` is Telixon. Live numbers are on the
[dashboard](https://telixon.dev/parity.html).

## Gate

The gate asserts an **exact** match against the oracle, minus an explicit allowlist of accepted
mismatches in `known-divergences.ts` (each with a reason). It fails on:

- any mismatch **not** in the allowlist (a real regression), and
- any allowlist entry that **no longer** occurs (a stale entry to remove).

It also checks coverage: a non-empty corpus, zero unparseable numbers, and most regions sampled.

## As-you-type

`formatAsYouType` compares the international controller's live value (typed through the controller)
against Google's canonical international format. The controller and `formatInternational` share one
format selector and derive their grouping from the same format template, so a complete number renders
identically. While typing, grouping is applied progressively until the number is complete.

## Baseline

Latest: [live dashboard](https://telixon.dev/parity.html).
Reproduce locally: `pnpm conformance`.

## Scope

Positive corpus (valid example numbers, one per region × type) over the international path.

[lpn]: https://github.com/google/libphonenumber

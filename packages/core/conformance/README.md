# Conformance

Proves Telixon's public query methods match [Google libphonenumber][lpn] — the reference
implementation — across every supported region.

## Run

```bash
pnpm conformance        # gate: fails on any divergence outside the allowlist
```

Full report with sample mismatches:

```bash
npx vitest run --config vitest.conformance.config.ts --disableConsoleIntercept
```

Excluded from `pnpm test`, so the unit suite stays fast and version-independent.

## How it works

```
corpus ──▶ for each number ──▶ oracle  (Google's answer)
                          └──▶ subject (Telixon's answer)
                                  └──▶ compare ──▶ report ──▶ gate
```

| File                   | Role                                                           |
| ---------------------- | -------------------------------------------------------------- |
| `corpus.ts`            | builds the corpus: one Google example number per region × type |
| `oracle.ts`            | Google libphonenumber adapter — example numbers + verdicts     |
| `subject.ts`           | runs Telixon over a number                                     |
| `compare.ts`           | diffs the two sides, aggregates per-method match rates         |
| `report.ts`            | formats the report                                             |
| `known-divergences.ts` | the allowlist of accepted mismatches + audit                   |
| `conformance.test.ts`  | the gate                                                       |
| `models.ts`            | shared types                                                   |

## Reading the report

```
engine 1caffa8 · google-libphonenumber@3.2.44
1128 numbers · 245/245 regions · 0 skipped

  isValid               100.00%  (1128/1128)
  isPossibleWithReason   99.91%  (1127/1128)
      CA +13101234  expected=IS_POSSIBLE_LOCAL_ONLY  actual=IS_POSSIBLE
```

The header shows both metadata versions and coverage (`skipped` = numbers the oracle could not
parse). One line per method: match rate and `(matched / total)`. Indented lines are mismatches —
`expected` is Google, `actual` is Telixon.

## Gate

The gate asserts an **exact** match against the oracle, minus an explicit allowlist of accepted
mismatches in `known-divergences.ts` (each with a reason). It fails on:

- any mismatch **not** in the allowlist (a real regression), and
- any allowlist entry that **no longer** occurs (a stale entry to remove).

It also checks coverage: a non-empty corpus, zero unparseable numbers, and most regions sampled.

## Version drift

The engine is built from a pinned libphonenumber commit (`src/engine/PROVENANCE.json`); the oracle is
the latest `google-libphonenumber` on npm. When the two snapshots differ, a mismatch reflects that
drift rather than an engine defect — such cases live in the allowlist with a `reason`.

## Baseline

Engine `1caffa8` vs `google-libphonenumber@3.2.44`, 1128 numbers:

| Method                 | Match   |
| ---------------------- | ------- |
| `isValid`              | 100.00% |
| `isPossible`           | 100.00% |
| `getNationalNumber`    | 100.00% |
| `getNumberType`        | 100.00% |
| `isPossibleWithReason` | 99.91%  |

The single `isPossibleWithReason` miss (CA) is allowlisted version drift, not a logic gap: the pinned
metadata treats a length-7 CA number as a national UAN length (`IS_POSSIBLE`); the older oracle treats
it as local-only (`IS_POSSIBLE_LOCAL_ONLY`).

## Scope

Positive corpus (valid example numbers, one per region × type) over the international path. Planned:
more numbers per type (generator), the national path, negative cases, and format conformance.

[lpn]: https://github.com/google/libphonenumber

# Conformance

Proves Telixon's public query methods match [Google libphonenumber][lpn], the reference
implementation, across every supported region: on valid numbers, on every display spelling of them,
on deterministic corruptions of them, and on every digit prefix of them.

## Run

```bash
pnpm conformance        # gate: fails on any divergence outside the allowlist
```

Full report with sample mismatches:

```bash
npx vitest run --config vitest.conformance.config.ts --disableConsoleIntercept
```

Excluded from `pnpm test`, which keeps the unit suite fast and offline.

## Version-matched oracle

Google publishes no npm package. Its JS port lives as Closure-coupled source in the repo. The oracle
fetches that source at the **same commit the engine was built from** (`src/engine/PROVENANCE.json`)
and runs it on `google-closure-library`. Sources are cached under `.cache/<commit>/`, leaving only
the first run in need of network.

Because the oracle and the engine share one commit, there is **no metadata version drift**: any
mismatch is a real engine difference, never a stale reference.

## How it works

```
corpus ──▶ for each number ──▶ oracle  (Google's answer)
                          └──▶ subject (Telixon's answer)
                                  └──▶ compare ──▶ report ──▶ gate
```

The oracle and the example corpus live in `../oracle/` (shared with the bench so both consume the
exact same Google source). The conformance corpus is derived from the examples in `corpus/`.

| File                   | Role                                                          |
| ---------------------- | ------------------------------------------------------------- |
| `corpus/`              | builds the case corpus: examples, display variants, mutations |
| `subject.ts`           | runs Telixon over an input                                    |
| `compare.ts`           | diffs the two sides, aggregates per-method match rates        |
| `prefix-sweep.ts`      | per-digit-prefix possibility comparison                       |
| `valid-for-region.ts`  | corpus and per-case isValidForRegion set comparison           |
| `report.ts`            | formats the report                                            |
| `known-divergences.ts` | the allowlist of accepted mismatches + audit                  |
| `conformance.test.ts`  | the gate                                                      |
| `models.ts`            | shared types (`Mismatch`, `MethodReport`, `MethodName`, …)    |
| `artifacts.ts`         | writes `parity.json`, `parity-badge.json`, `parity.html`      |
| `as-you-type.ts`       | per-keystroke as-you-type measurement vs Google               |
| `parity.template.html` | HTML template for the dashboard                               |

## Reading the report

```
oracle and engine pinned to google/libphonenumber@<commit> · no metadata drift
<N> cases · <compared> compared · <covered>/<total> regions · <skipped> skipped
  <kind>=<count> · …
  google-rejected mutations judged not possible: <agreed>/<total>

  <method>  <rate>  (<matched>/<total>)
```

The header shows the shared commit, coverage, and the corpus composition by case kind (`skipped` =
example or display-variant inputs the oracle could not parse; must be zero). One line per method:
match rate and `(matched / total)`. Any mismatch prints an indented line, where `expected` is
Google and `actual` is Telixon. The prefix sweep prints its own block after the table.

## Gate

The gate asserts an **exact** match against the oracle, minus an explicit allowlist of accepted
mismatches in `known-divergences.ts` (each with a reason). It fails on:

- any mismatch **not** in the allowlist (a real regression), and
- any allowlist entry that **no longer** occurs (a stale entry to remove).

It also checks coverage: every case kind populated, zero skipped inputs, and every region covered.

Mutated inputs Google refuses to parse have no method-level oracle. For those, the contract is
agreement on rejection: Telixon, which never throws, must judge the same input not possible. A
mutated input Telixon considers possible while Google rejects it at parse fails the gate.

## isValidForRegion

`valid-for-region.ts` compares `isValidForRegion` against Google's `isValidNumberForRegion` as its
own axis, since the method takes a region argument. For each input, both sides report the subset of
candidate regions the number is valid for, and the sets must match verbatim. Candidates are the
regions sharing the input's calling code (the only regions where the answer is non-trivial) plus two
fixed foreign probes confirming the cross-calling-code guard returns false on both sides.

Two sweeps run in the gate:

- **corpus**: every corpus case over its region cluster;
- **case coverage**: one number per distinct engine case (lengths 1-15). `isValidForRegion` is a
  pure function of the end state, the national length, and the region, which makes this sweep cover
  the method's entire reachable domain.

Inputs Google rejects at parse follow the rejection contract: Telixon must judge them valid for no
candidate. Mismatches feed the same allowlist audit as every other axis.

## As-you-type

`measureAsYouType` (in `as-you-type.ts`) replays each corpus number one character at a time through
both input controllers, international and national, and compares the live value at every keystroke
against Google's `AsYouTypeFormatter`. The controllers and `formatInternational` / `formatNational`
share one format selector, which renders a complete number identically; while typing, grouping is
applied progressively. The run prints this as a measurement; the gate ignores it.

## Baseline

Latest: [live dashboard](https://proof.telixon.dev/parity.html).
Reproduce locally: `pnpm conformance`.

## Corpus

Every case derives deterministically from Google's example numbers (one per region per type), so
there is no snapshot to drift and no randomness in the gate. One case is one exact input string
parsed under identical conditions on both sides.

| Family            | Kinds                                                                                                 | Contract                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `example`         | canonical E.164                                                                                       | both sides parse; all methods compared                                            |
| `display-variant` | international display, national display (parsed with the region), RFC3966 URI, padding                | both sides parse; all methods compared                                            |
| `mutation`        | truncated (1-3 digits), extended (1-2 digits), first national digit shifted, unassigned calling codes | all methods compared; if Google rejects at parse, Telixon must judge not possible |

The comparison is differential, which keeps a mutation that happens to stay valid as a case, because
both sides must agree on whatever the verdict is.

The prefix sweep is a fourth axis, where every digit prefix of every example is parsed by both sides and
`isPossibleWithReason` must match verbatim, prefix by prefix. This is the verdict surface the input
controllers expose per keystroke.

[lpn]: https://github.com/google/libphonenumber

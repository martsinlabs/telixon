import { getCallingCodeForRegion, parsePhoneNumber, PhoneNumber, RegionCode } from '@telixon/core';
import { Engine } from '@telixon/core/engine';
import { Oracle } from '../oracle';
import { buildCaseCoverage } from './case-coverage';
import { CorpusCase } from './corpus';
import { EnumerationDomain } from './enumeration-domain';
import { Mismatch, MismatchKind } from './models';

// isValidForRegion is a pure function of (end state, national length, region), so two sweeps close it:
// the corpus sweep checks real Google examples and their variants; the case sweep checks one number per
// distinct engine case, which covers the method's entire reachable domain. Candidates are the regions
// sharing the number's calling code (the only regions where the answer is non-trivial) plus two fixed
// foreign probes confirming the cross-calling-code guard returns false on both sides.
// getCallingCodeForRegion is itself gated against the oracle, so both sides derive identical clusters.

const FOREIGN_PROBE_COUNT = 2;

// The expectation recorded when Google refuses to parse an input: valid for no region.
export const GOOGLE_REJECTS_VALID_FOR_NONE = '(none: Google rejects at parse)';

export interface ValidForRegionSweep {
  // Inputs swept (corpus cases or case-coverage numbers).
  readonly total: number;
  // Inputs Google parsed: the valid-region set is compared verbatim.
  readonly compared: number;
  readonly matched: number;
  // Inputs Google rejects at parse: Telixon must judge them valid for no candidate.
  readonly rejectedByGoogle: number;
  readonly rejectionAgreed: number;
  // Total (input, candidate region) pairs checked across the sweep.
  readonly regionChecks: number;
  // Case sweep only: calling codes of the domain that contributed no number; must stay empty.
  readonly emptyCallingCodes: readonly string[];
  readonly mismatches: readonly Mismatch[];
}

// Candidate regions per calling code: the cluster sharing the code, plus two foreign probes, sorted.
export function buildCandidatesByCallingCode(domain: EnumerationDomain): ReadonlyMap<string, readonly RegionCode[]> {
  const sortedRegions: readonly RegionCode[] = [...domain.regions].sort();

  const clusters = new Map<string, RegionCode[]>();
  for (const region of sortedRegions) {
    const code = getCallingCodeForRegion(region);
    const cluster = clusters.get(code);
    if (cluster) cluster.push(region);
    else clusters.set(code, [region]);
  }

  const candidates = new Map<string, readonly RegionCode[]>();
  for (const [code, cluster] of clusters) {
    const probes: RegionCode[] = [];
    for (const region of sortedRegions) {
      if (probes.length === FOREIGN_PROBE_COUNT) break;
      if (getCallingCodeForRegion(region) !== code) probes.push(region);
    }
    candidates.set(code, [...cluster, ...probes].sort());
  }
  return candidates;
}

function telixonValidSet(
  input: string,
  defaultRegion: RegionCode | undefined,
  candidates: readonly RegionCode[],
): string {
  const phoneNumber: PhoneNumber =
    defaultRegion === undefined ? parsePhoneNumber(input) : parsePhoneNumber(input, { defaultRegion });
  return candidates.filter((region) => phoneNumber.isValidForRegion(region)).join(',');
}

interface SweepCounters {
  total: number;
  compared: number;
  matched: number;
  rejectedByGoogle: number;
  rejectionAgreed: number;
  regionChecks: number;
  emptyCallingCodes: string[];
  mismatches: Mismatch[];
}

function newCounters(): SweepCounters {
  return {
    total: 0,
    compared: 0,
    matched: 0,
    rejectedByGoogle: 0,
    rejectionAgreed: 0,
    regionChecks: 0,
    emptyCallingCodes: [],
    mismatches: [],
  };
}

function compareOne(
  oracle: Oracle,
  counters: SweepCounters,
  kind: MismatchKind,
  regionCode: string,
  input: string,
  defaultRegion: RegionCode | undefined,
  candidates: readonly RegionCode[],
): void {
  counters.total += 1;
  counters.regionChecks += candidates.length;

  const expected = oracle.validForRegions(input, defaultRegion, candidates);
  const actual = telixonValidSet(input, defaultRegion, candidates);

  if (expected === null) {
    counters.rejectedByGoogle += 1;
    if (actual === '') {
      counters.rejectionAgreed += 1;
    } else {
      counters.mismatches.push({
        method: 'isValidForRegion',
        kind,
        regionCode,
        input,
        expected: GOOGLE_REJECTS_VALID_FOR_NONE,
        actual,
      });
    }
    return;
  }

  counters.compared += 1;
  if (expected === actual) {
    counters.matched += 1;
  } else {
    counters.mismatches.push({
      method: 'isValidForRegion',
      kind,
      regionCode,
      input,
      expected: expected === '' ? '(none)' : expected,
      actual: actual === '' ? '(none)' : actual,
    });
  }
}

// Corpus sweep: every corpus case, compared over the candidates of the case's region cluster.
export function sweepValidForRegion(
  oracle: Oracle,
  corpus: readonly CorpusCase[],
  domain: EnumerationDomain,
): ValidForRegionSweep {
  const candidatesByCode = buildCandidatesByCallingCode(domain);
  const regions = new Set<string>(domain.regions);
  const counters = newCounters();

  for (const corpusCase of corpus) {
    const { input, defaultRegion, regionCode } = corpusCase;
    if (!regions.has(regionCode)) continue;
    const candidates = candidatesByCode.get(getCallingCodeForRegion(regionCode as RegionCode));
    if (!candidates) continue;
    compareOne(oracle, counters, 'valid-for-region', regionCode, input, defaultRegion, candidates);
  }

  return counters;
}

// Case sweep: one number per distinct engine case (the method's whole reachable domain), per calling code.
export function sweepValidForRegionCases(
  oracle: Oracle,
  engine: Engine,
  domain: EnumerationDomain,
  minLength: number,
  maxLength: number,
): ValidForRegionSweep {
  const candidatesByCode = buildCandidatesByCallingCode(domain);
  const counters = newCounters();

  for (const callingCode of domain.callingCodes) {
    const candidates = candidatesByCode.get(callingCode);
    const numbers = candidates === undefined ? [] : buildCaseCoverage(engine, [callingCode], minLength, maxLength);
    if (candidates === undefined || numbers.length === 0) {
      // A domain calling code the sweep cannot cover is a broken enumeration, never a smaller domain.
      counters.emptyCallingCodes.push(callingCode);
      continue;
    }
    for (const input of numbers) {
      compareOne(oracle, counters, 'valid-for-region-case', callingCode, input, undefined, candidates);
    }
  }

  return counters;
}

import { getCallingCodeForRegion, REGION_CODES } from '@telixon/core';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { describe, expect, it } from 'vitest';
import { buildCorpus, loadOracle } from '../oracle';
import { exportArtifacts } from './artifacts';
import { formatAsYouTypeMeasurement, internationalProbe, measureAsYouType, nationalProbe } from './as-you-type';
import { buildConformanceReport } from './compare';
import { buildConformanceCorpus, CorpusCaseKind } from './corpus';
import { geographicDomain } from './enumeration-domain';
import { auditMismatches } from './known-divergences';
import { sweepPossibilityPrefixes } from './prefix-sweep';
import { formatConformanceReport, formatPrefixSweepReport, formatValidForRegionReport } from './report';
import { evaluateWithTelixon } from './subject';
import { sweepValidForRegion, sweepValidForRegionCases } from './valid-for-region';

// The case sweep spans every distinct engine case; lengths 1-15 match the case-coverage gate.
const CASE_SWEEP_MIN_LENGTH = 1;
const CASE_SWEEP_MAX_LENGTH = 15;

const oracle = await loadOracle();
const examples = buildCorpus(oracle);
const corpus = buildConformanceCorpus(oracle, examples);
const report = buildConformanceReport(oracle, corpus);
const prefixSweep = sweepPossibilityPrefixes(oracle, examples);
const domain = geographicDomain(oracle);
const validForRegion = sweepValidForRegion(oracle, corpus, domain);
const validForRegionCases = sweepValidForRegionCases(
  oracle,
  getResourceProvider().engine,
  domain,
  CASE_SWEEP_MIN_LENGTH,
  CASE_SWEEP_MAX_LENGTH,
);
const audit = auditMismatches([
  ...report.methods.flatMap((method) => method.mismatches),
  ...report.rejection.mismatches,
  ...prefixSweep.mismatches,
  ...validForRegion.mismatches,
  ...validForRegionCases.mismatches,
]);
const aytInternational = measureAsYouType(oracle, examples, internationalProbe);
const aytNational = measureAsYouType(oracle, examples, nationalProbe);

// Surface the full table, the sweeps, and both as-you-type measurements in the run output.
console.log('\n' + formatConformanceReport(report));
console.log('\n' + formatPrefixSweepReport(prefixSweep));
console.log('\n' + formatValidForRegionReport('corpus', validForRegion));
console.log('\n' + formatValidForRegionReport('one number per engine case', validForRegionCases));
console.log('\n' + formatAsYouTypeMeasurement('International', aytInternational));
console.log('\n' + formatAsYouTypeMeasurement('National', aytNational));

exportArtifacts(report, prefixSweep, audit, validForRegion, validForRegionCases);

const EXPECTED_KINDS: readonly CorpusCaseKind[] = [
  'example',
  'international-display',
  'national-display',
  'rfc3966-uri',
  'whitespace-padded',
  'truncated',
  'extended',
  'first-national-digit-mutated',
  'unassigned-calling-code',
];

describe('conformance vs Google libphonenumber', () => {
  it('covers the region set with a fully parseable example corpus', () => {
    expect(report.corpusSize).toBeGreaterThan(0);
    expect(report.compared).toBeGreaterThan(0);
    expect(report.skipped).toBe(0);
    expect(report.regionsCovered).toBe(report.regionsTotal);
  });

  it('exercises every corpus case kind', () => {
    const populatedKinds = report.composition.filter(({ cases }) => cases > 0).map(({ kind }) => kind);
    expect([...populatedKinds].sort()).toEqual([...EXPECTED_KINDS].sort());
  });

  it('matches the oracle except for the known-divergence allowlist', () => {
    expect(audit.unexpected).toEqual([]);
  });

  it('keeps the known-divergence allowlist free of stale entries', () => {
    expect(audit.stale).toEqual([]);
  });
});

describe('possibility prefix sweep vs Google', () => {
  it('compares a non-trivial prefix set', () => {
    expect(prefixSweep.totalPrefixes).toBeGreaterThan(1000);
    expect(prefixSweep.compared).toBeGreaterThan(0);
  });
});

describe('isValidForRegion vs Google isValidNumberForRegion', () => {
  it('sweeps every corpus case over its calling-code cluster', () => {
    expect(validForRegion.total).toBeGreaterThan(0);
    expect(validForRegion.compared).toBeGreaterThan(0);
    expect(validForRegion.regionChecks).toBeGreaterThan(validForRegion.total);
  });

  it('sweeps one number per engine case, covering the method domain exhaustively', () => {
    expect(validForRegionCases.total).toBeGreaterThan(100_000);
    expect(validForRegionCases.regionChecks).toBeGreaterThan(validForRegionCases.total);
  });
});

describe('getCallingCodeForRegion vs Google getCountryCodeForRegion', () => {
  it('matches Google for every supported region', () => {
    const mismatches = REGION_CODES.filter(
      (region) => getCallingCodeForRegion(region) !== oracle.countryCallingCode(region),
    ).map((region) => ({
      region,
      telixon: getCallingCodeForRegion(region),
      google: oracle.countryCallingCode(region),
    }));

    expect(mismatches).toEqual([]);
  });
});

describe('possible-but-invalid numbers format like Google', () => {
  // NANPA central-office code starting with 1 is invalid, but the number stays possible (10 digits).
  const samples = ['+13101234434', '+14151230000'];

  for (const e164 of samples) {
    it(`${e164}: formats despite being invalid, instead of returning null`, () => {
      const google = oracle.evaluate(e164);
      const telixon = evaluateWithTelixon(e164);

      expect(google).not.toBeNull();
      expect(google!.isPossible).toBe(true);
      expect(google!.isValid).toBe(false);

      expect(telixon.formatE164).not.toBeNull();
      expect(telixon.formatE164).toBe(google!.formatE164);
      expect(telixon.formatInternational).toBe(google!.formatInternational);
      expect(telixon.formatRfc3966).toBe(google!.formatRfc3966);
    });
  }
});

describe('as-you-type vs Google AsYouTypeFormatter (measurement)', () => {
  it('international: measures the controller against Google over the full corpus', () => {
    expect(aytInternational.totalNumbers).toBeGreaterThan(0);
  });

  it('national: measures the controller against Google over the full corpus', () => {
    expect(aytNational.totalNumbers).toBeGreaterThan(0);
  });
});

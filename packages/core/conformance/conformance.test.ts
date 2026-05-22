import { REGION_IDS, getCountryCallingCode } from '@telixon/core';
import { describe, expect, it } from 'vitest';
import { formatAsYouTypeMeasurement, internationalProbe, measureAsYouType, nationalProbe } from './as-you-type';
import { buildConformanceReport } from './compare';
import { buildCorpus } from './corpus';
import { auditMismatches } from './known-divergences';
import { loadOracle } from './oracle';
import { formatConformanceReport } from './report';

const oracle = await loadOracle();
const corpus = buildCorpus(oracle);
const report = buildConformanceReport(oracle, corpus);
const audit = auditMismatches(report.methods.flatMap((method) => method.mismatches));
const aytInternational = measureAsYouType(oracle, corpus, internationalProbe);
const aytNational = measureAsYouType(oracle, corpus, nationalProbe);

// Surface the full table and both as-you-type measurements in the run output.
console.log('\n' + formatConformanceReport(report));
console.log('\n' + formatAsYouTypeMeasurement('International', aytInternational));
console.log('\n' + formatAsYouTypeMeasurement('National', aytNational));

describe('conformance vs Google libphonenumber', () => {
  it('covers the region set with a fully parseable corpus', () => {
    expect(report.corpusSize).toBeGreaterThan(0);
    expect(report.skipped).toBe(0);
    expect(report.regionsCovered).toBeGreaterThan(200);
  });

  it('matches the oracle except for the known-divergence allowlist', () => {
    expect(audit.unexpected).toEqual([]);
  });

  it('keeps the known-divergence allowlist free of stale entries', () => {
    expect(audit.stale).toEqual([]);
  });
});

describe('getCountryCallingCode vs Google getCountryCodeForRegion', () => {
  it('matches Google for every supported region', () => {
    const mismatches = REGION_IDS.filter(
      (region) => getCountryCallingCode(region) !== oracle.countryCallingCode(region),
    ).map((region) => ({ region, telixon: getCountryCallingCode(region), google: oracle.countryCallingCode(region) }));

    expect(mismatches).toEqual([]);
  });
});

describe('as-you-type vs Google AsYouTypeFormatter (measurement)', () => {
  it('international: measures the controller against Google over the full corpus', () => {
    expect(aytInternational.totalNumbers).toBeGreaterThan(0);
  });

  it('national: measures the controller against Google over the full corpus', () => {
    expect(aytNational.totalNumbers).toBeGreaterThan(0);
  });
});

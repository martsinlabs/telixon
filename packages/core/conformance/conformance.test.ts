import { COUNTRY_IDS, getCountryCallingCode } from '@telixon/core';
import { describe, expect, it } from 'vitest';
import { buildConformanceReport } from './compare';
import { buildCorpus } from './corpus';
import { auditMismatches } from './known-divergences';
import { loadOracle } from './oracle';
import { formatConformanceReport } from './report';

const oracle = await loadOracle();
const report = buildConformanceReport(oracle, buildCorpus(oracle));
const audit = auditMismatches(report.methods.flatMap((method) => method.mismatches));

// Surface the full table in the run output.
console.log('\n' + formatConformanceReport(report));

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
    const mismatches = COUNTRY_IDS.filter(
      (region) => getCountryCallingCode(region) !== oracle.countryCallingCode(region),
    ).map((region) => ({ region, telixon: getCountryCallingCode(region), google: oracle.countryCallingCode(region) }));

    expect(mismatches).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { buildConformanceReport } from './compare';
import { buildCorpus } from './corpus';
import { auditMismatches } from './known-divergences';
import { formatConformanceReport } from './report';

const report = buildConformanceReport(buildCorpus());
const mismatches = report.methods.flatMap((method) => method.mismatches);
const audit = auditMismatches(mismatches);

describe('conformance vs Google libphonenumber', () => {
  it('covers the region set with a fully parseable corpus', () => {
    console.log('\n' + formatConformanceReport(report));
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

import { getResourceProvider } from '@telixon/core/resource-provider';
import { describe, expect, it } from 'vitest';
import { loadOracle } from '../oracle';
import { buildCaseCoverage } from './case-coverage';
import { createDivergenceCollector } from './differential';
import { geographicDomain } from './enumeration-domain';

// Per-push parity gate: one number from every case, checked against Google in ~1s. The weekly fuzz
// re-checks the whole space number by number. Lengths 1-15 span every region's national number.

const oracle = await loadOracle();
const { callingCodes } = geographicDomain(oracle);

const MIN_LENGTH = 1;
const MAX_LENGTH = 15;

describe('Case coverage: one number per case vs Google libphonenumber', () => {
  it('matches Google for every case', () => {
    const numbers = buildCaseCoverage(getResourceProvider().engine, callingCodes, MIN_LENGTH, MAX_LENGTH);
    const collector = createDivergenceCollector(oracle);
    for (const input of numbers) collector.add(input, undefined);

    console.log(
      `\nCase coverage: ${numbers.length.toLocaleString()} numbers (one per case) vs Google libphonenumber @ ${oracle.commit} (lengths ${MIN_LENGTH}-${MAX_LENGTH})`,
    );
    console.log(`Skipped (non-geographic, out of scope): ${collector.skipped.toLocaleString()}`);
    console.log(`Divergences: ${collector.total} across ${collector.patterns().length} distinct patterns`);
    for (const pattern of collector.patterns().slice(0, 50)) {
      console.log(
        `  [${pattern.method}] ${pattern.expected} -> ${pattern.actual}  (x${pattern.count})  e.g. "${pattern.exampleInput}"`,
      );
    }

    expect(collector.total).toBe(0);
  }, 120_000);
});

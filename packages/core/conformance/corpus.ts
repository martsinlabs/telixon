import { COUNTRY_IDS } from '@telixon/core';
import { CorpusEntry } from './models';
import { getSupportedRegionCodes, SAMPLED_TYPES, sampleExampleE164 } from './oracle';

const TELIXON_REGIONS: ReadonlySet<string> = new Set<string>(COUNTRY_IDS);

// One Google example number per supported region per type, intersected with the engine's regions.
export function buildCorpus(): CorpusEntry[] {
  const regions: string[] = getSupportedRegionCodes()
    .filter((region) => TELIXON_REGIONS.has(region))
    .sort();

  const corpus: CorpusEntry[] = [];
  for (const regionCode of regions) {
    for (const sampled of SAMPLED_TYPES) {
      const e164: string | null = sampleExampleE164(regionCode, sampled.id);
      if (!e164) continue;
      corpus.push({ regionCode, sampledType: sampled.name, e164 });
    }
  }
  return corpus;
}

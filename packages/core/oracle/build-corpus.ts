import { REGION_IDS } from '@telixon/core';
import { CorpusEntry } from './models';
import { Oracle } from './oracle';

const TELIXON_REGIONS: ReadonlySet<string> = new Set<string>(REGION_IDS);

// One Google example number per supported region per type, intersected with the engine's regions.
export function buildCorpus(oracle: Oracle): CorpusEntry[] {
  const regions: string[] = oracle
    .supportedRegions()
    .filter((region) => TELIXON_REGIONS.has(region))
    .sort();

  const corpus: CorpusEntry[] = [];
  for (const regionCode of regions) {
    for (const sampled of oracle.sampledTypes) {
      const e164: string | null = oracle.sampleExampleE164(regionCode, sampled.id);
      if (!e164) continue;
      corpus.push({ regionCode, sampledType: sampled.name, e164 });
    }
  }
  return corpus;
}

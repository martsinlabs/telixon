import { type RegionId } from '@telixon/core/engine';
import { buildCorpus, loadOracle } from '../oracle';

export interface CorpusEntry {
  readonly e164: string;
  readonly region: RegionId;
}

const oracle = await loadOracle();

export const CORPUS: readonly CorpusEntry[] = buildCorpus(oracle).map((entry) => ({
  e164: entry.e164,
  region: entry.regionCode as RegionId,
}));

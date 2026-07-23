import type { NumberType, RegionCode } from '@telixon/core';

// A seeded generator so a failing session replays from its index alone.
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RandomSource {
  pick<Item>(items: readonly Item[]): Item;
  upTo(bound: number): number;
  chance(probability: number): boolean;
}

export function randomSource(seed: number): RandomSource {
  const next = createRandom(seed);
  return {
    pick: (items) => items[Math.floor(next() * items.length)]!,
    upTo: (bound) => Math.floor(next() * bound),
    chance: (probability) => next() < probability,
  };
}

// Regions that stress the format: mask literals, trunk stripping, and a shared calling code.
export const REGIONS: readonly RegionCode[] = ['US', 'CA', 'GB', 'AR', 'BY', 'BR', 'DE', 'FR', 'JP', 'AU'];

export const NUMBER_TYPES: readonly NumberType[] = ['FIXED_LINE', 'MOBILE', 'TOLL_FREE', 'PREMIUM_RATE', 'VOIP'];

// Bare digits, formatted text, a leading plus, and non-digit noise all reach a real field.
export const INSERT_PAYLOADS: readonly string[] = ['5', '12', '007', '+549', '(201) 555', ' 9-9 ', 'ab', '+'];

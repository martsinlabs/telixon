import type { RegionCode } from '@telixon/core';

const REGIONAL_INDICATOR_BASE: number = 0x1f1e6; // U+1F1E6 REGIONAL INDICATOR SYMBOL LETTER A
const LETTER_A: number = 65; // 'A'.charCodeAt(0)

/**
 * Convert an ISO region code to its flag emoji: the two Unicode regional indicator symbols for its
 * letters. `regionToFlagEmoji('US')` returns the United States flag (U+1F1FA U+1F1F8).
 *
 * Rendering is the platform's choice: systems with flag-emoji support (iOS, macOS, Android, most
 * Linux) show a flag; systems without it (notably Windows) show the two letters. For a flag on every
 * platform, render an SVG set keyed by the region code instead.
 *
 * Every {@link RegionCode} is two ASCII letters, so the result is always a valid regional indicator
 * pair.
 */
export function regionToFlagEmoji(region: RegionCode): string {
  return String.fromCodePoint(
    REGIONAL_INDICATOR_BASE + (region.charCodeAt(0) - LETTER_A),
    REGIONAL_INDICATOR_BASE + (region.charCodeAt(1) - LETTER_A),
  );
}

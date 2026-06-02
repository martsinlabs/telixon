import { MetadataNumberType, NumberType, PhoneNumberExamplePlaceholders, RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

/**
 * @public
 * Per-region, per-type placeholder variants emitted by `@telixon/forge`.
 *
 * Mirrors the engine artifact shape: every variant is optional because the underlying mask
 * for it may not exist in a given region (e.g. `nationalWithPrefix` is absent in regions
 * without a national prefix).
 *
 * - `national`: national-style formatting, no prefix (e.g. `(201) 555-0123`).
 * - `nationalWithPrefix`: national-style formatting with the national prefix digit
 *   (e.g. `1 (201) 555-0123`).
 * - `international`: international body, no leading calling code (e.g. `201-555-0123`).
 */
export type Placeholders = PhoneNumberExamplePlaceholders;

const NUMBER_TYPE_ALIASES: Partial<Record<NumberType, readonly MetadataNumberType[]>> = {
  FIXED_LINE_OR_MOBILE: ['FIXED_LINE', 'MOBILE'],
  UNKNOWN: [],
};

function resolveMetadataTypes(type: NumberType): readonly MetadataNumberType[] {
  return NUMBER_TYPE_ALIASES[type] ?? [type as MetadataNumberType];
}

/**
 * @public
 * Returns the precomputed placeholder variants for a `(region, type)` tuple. Reads
 * directly from the engine artifact; no runtime formatting is performed.
 *
 * Applies the same number type aliasing as `createNumberTypeFilter`: `FIXED_LINE_OR_MOBILE`
 * tries `FIXED_LINE` first and falls back to `MOBILE`; `UNKNOWN` matches nothing.
 *
 * Returns `null` when no example number is recorded for the requested `(region, type)`
 * tuple, or when the region itself is not in the engine reference mapping. Requires
 * ready resources (`await ensureReady()`).
 */
export function getPlaceholders(region: RegionId, type: NumberType): Placeholders | null {
  const { refMapping, territorySpecTable } = getResourceProvider();

  const regionIndex: number | undefined = refMapping.regions.keyToIndex[region];
  if (regionIndex === undefined) return null;

  const spec = territorySpecTable[regionIndex];
  if (!spec) return null;

  for (const metadataType of resolveMetadataTypes(type)) {
    const typeIndex: number = refMapping.numberTypes.indexOf(metadataType);
    if (typeIndex < 0) continue;

    for (const phoneNumberType of spec.numberTypes) {
      if (phoneNumberType.type === typeIndex && phoneNumberType.placeholders) {
        return phoneNumberType.placeholders;
      }
    }
  }

  return null;
}

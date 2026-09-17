import type { RegionCode } from '@telixon/core';

/** Dataset key of `data-region`, the region a row stands for. Read back on clicks and pointer moves. */
export const REGION_DATA_KEY = 'region';

/** Dataset key of `data-active`, set on the row under the keyboard cursor. A styling hook. */
export const ACTIVE_DATA_KEY = 'active';

export const ACTIVE_DATA_VALUE = 'true';

const REGION_ATTRIBUTE = `data-${REGION_DATA_KEY}`;

/** Matches a rendered row from any element inside it. */
export const ROW_SELECTOR = `[${REGION_ATTRIBUTE}]`;

/** Matches the rendered row of one region. */
export function regionRowSelector(region: RegionCode): string {
  return `[${REGION_ATTRIBUTE}="${region}"]`;
}

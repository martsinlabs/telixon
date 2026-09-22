import type { RegionCode } from '@telixon/core';
import type { RegionOption } from '@telixon/web-sdk';

/** Context of a `telixonRegionOption` template, the row of one region. */
export type TelixonRegionOptionContext = {
  readonly $implicit: RegionOption;
};

/**
 * Context of a `telixonRegionTrigger` template. The region is known from the first paint, while its
 * option arrives once the engine has loaded.
 */
export type TelixonRegionTriggerContext = {
  readonly $implicit: RegionCode | null;
  readonly option: RegionOption | null;
};

/**
 * How far the list sits from its anchor, in pixels. `y` is the distance below or above the anchor,
 * while `x` shifts the list along the anchor's edge toward the end.
 */
export type TelixonPopupOffset = {
  readonly x: number;
  readonly y: number;
};

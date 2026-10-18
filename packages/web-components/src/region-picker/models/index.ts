import type { RegionCode } from '@telixon/core';
import type { RegionOption } from '@telixon/web-sdk';

/**
 * How far the list sits from its anchor, in pixels. `y` is the distance below or above the anchor,
 * while `x` shifts the list along the anchor's edge toward the end.
 */
export type TelixonPopupOffset = {
  readonly x: number;
  readonly y: number;
};

/** Builds the row of one region. The picker adds the option attributes itself. */
export type TelixonRenderOption = (option: RegionOption) => HTMLElement;

/**
 * Builds the content of the trigger. The region is known from the first paint, while its option
 * arrives once the field is live.
 */
export type TelixonRenderTrigger = (region: RegionCode | null, option: RegionOption | null) => HTMLElement;

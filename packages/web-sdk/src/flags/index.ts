import type { RegionCode } from '@telixon/core';
import { SPRITE_COLUMNS, SPRITE_REGIONS, SPRITE_ROWS } from './generated/sprite-layout';

/**
 * Translation, as percentages of the sheet element's own size, that brings one cell into its
 * container. Both values are zero or negative.
 */
export type FlagOffset = {
  readonly x: number;
  readonly y: number;
};

const NEUTRAL_CELL_INDEX: number = SPRITE_REGIONS.length;
const CELL_COUNT: number = NEUTRAL_CELL_INDEX + 1;
const COLUMN_STEP: number = 100 / SPRITE_COLUMNS;
const ROW_STEP: number = 100 / SPRITE_ROWS;

const CELL_INDEX_BY_REGION: Map<string, number> = new Map();
for (let index = 0; index < SPRITE_REGIONS.length; index++) CELL_INDEX_BY_REGION.set(SPRITE_REGIONS[index]!, index);

const OFFSET_BY_CELL: (FlagOffset | undefined)[] = new Array(CELL_COUNT);
const TRANSFORM_BY_CELL: (string | undefined)[] = new Array(CELL_COUNT);

function cellIndex(region: RegionCode | null): number {
  if (region === null) return NEUTRAL_CELL_INDEX;
  return CELL_INDEX_BY_REGION.get(region) ?? NEUTRAL_CELL_INDEX;
}

// Percentages are exact for the shipped 16 by 16 sheet. Rounding guards other grids.
function percent(value: number): number {
  return value === 0 ? 0 : -Math.round(value * 10_000) / 10_000;
}

function offsetForCell(index: number): FlagOffset {
  const cached: FlagOffset | undefined = OFFSET_BY_CELL[index];
  if (cached !== undefined) return cached;

  const offset: FlagOffset = Object.freeze({
    x: percent((index % SPRITE_COLUMNS) * COLUMN_STEP),
    y: percent(Math.floor(index / SPRITE_COLUMNS) * ROW_STEP),
  });
  OFFSET_BY_CELL[index] = offset;
  return offset;
}

/**
 * Sprite offset of a region's flag. `null`, and any code the sheet does not carry, resolve to the
 * neutral cell. Repeated calls return the same frozen object.
 *
 * Apply it to the sheet element inside a cell-sized container with `overflow: hidden`, where the
 * sheet spans `columns * 100%` by `rows * 100%` of the container (the shipped `flags.css` sets
 * this for `.tlx-flag` and `.tlx-flag__image`).
 */
export function flagOffset(region: RegionCode | null): FlagOffset {
  return offsetForCell(cellIndex(region));
}

/**
 * The `translate(x%, y%)` value from {@link flagOffset}, ready for `style.transform`.
 */
export function flagTransform(region: RegionCode | null): string {
  const index: number = cellIndex(region);
  const cached: string | undefined = TRANSFORM_BY_CELL[index];
  if (cached !== undefined) return cached;

  const offset: FlagOffset = offsetForCell(index);
  const transform: string = `translate(${offset.x}%, ${offset.y}%)`;
  TRANSFORM_BY_CELL[index] = transform;
  return transform;
}

import { REGION_CODES, type RegionCode } from '@telixon/core';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  SPRITE_CELL_HEIGHT,
  SPRITE_CELL_WIDTH,
  SPRITE_COLUMNS,
  SPRITE_REGIONS,
  SPRITE_ROWS,
} from '../generated/sprite-layout';
import { flagOffset, flagTransform } from '../index';

const ASSETS = new URL('../assets/', import.meta.url);

function expectedOffset(cellIndex: number): { x: number; y: number } {
  const column: number = cellIndex % SPRITE_COLUMNS;
  const row: number = Math.floor(cellIndex / SPRITE_COLUMNS);
  return {
    x: column === 0 ? 0 : -(column * (100 / SPRITE_COLUMNS)),
    y: row === 0 ? 0 : -(row * (100 / SPRITE_ROWS)),
  };
}

describe('flag sprite layout', () => {
  it('lists every engine region in engine order, which is the sheet order', () => {
    expect(SPRITE_REGIONS).toEqual(REGION_CODES);
  });

  it('fits every region and the neutral cell into the grid', () => {
    expect(SPRITE_COLUMNS * SPRITE_ROWS).toBeGreaterThanOrEqual(REGION_CODES.length + 1);
    expect(SPRITE_COLUMNS * (SPRITE_ROWS - 1)).toBeLessThan(REGION_CODES.length + 1);
  });
});

describe('flagOffset', () => {
  it('places the first region at the origin with positive zeros', () => {
    const offset = flagOffset(REGION_CODES[0]!);
    expect(Object.is(offset.x, 0)).toBe(true);
    expect(Object.is(offset.y, 0)).toBe(true);
  });

  it('offsets a region by its cell as percentages of the sheet', () => {
    for (const region of ['US', 'CA', 'GB', 'UA', 'ZW'] as const) {
      expect(flagOffset(region)).toEqual(expectedOffset(REGION_CODES.indexOf(region)));
    }
  });

  it('resolves null and an unknown code to the neutral cell after the last region', () => {
    const neutral = expectedOffset(REGION_CODES.length);
    expect(flagOffset(null)).toEqual(neutral);
    expect(flagOffset('ZZ' as RegionCode)).toEqual(neutral);
  });

  it('returns the same frozen object on repeated calls', () => {
    const first = flagOffset('US');
    expect(flagOffset('US')).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
  });
});

describe('flagTransform', () => {
  it('formats the offset as a translate value', () => {
    const { x, y } = flagOffset('US');
    expect(flagTransform('US')).toBe(`translate(${x}%, ${y}%)`);
    expect(flagTransform(REGION_CODES[0]!)).toBe('translate(0%, 0%)');
  });

  it('formats the neutral cell for null', () => {
    const { x, y } = flagOffset(null);
    expect(flagTransform(null)).toBe(`translate(${x}%, ${y}%)`);
  });

  it('returns the same string on repeated calls', () => {
    expect(flagTransform('CA')).toBe(flagTransform('CA'));
  });
});

describe('shipped assets', () => {
  it('renders the 2x sheet at the layout dimensions', async () => {
    const metadata = await sharp(fileURLToPath(new URL('sprite@2x.png', ASSETS))).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(SPRITE_COLUMNS * SPRITE_CELL_WIDTH);
    expect(metadata.height).toBe(SPRITE_ROWS * SPRITE_CELL_HEIGHT);
  });

  it('renders the 1x sheet at half the layout dimensions', async () => {
    const metadata = await sharp(fileURLToPath(new URL('sprite.png', ASSETS))).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe((SPRITE_COLUMNS * SPRITE_CELL_WIDTH) / 2);
    expect(metadata.height).toBe((SPRITE_ROWS * SPRITE_CELL_HEIGHT) / 2);
  });

  it('spans the sheet across the container in the stylesheet', async () => {
    const css = await readFile(new URL('flags.css', ASSETS), 'utf8');
    expect(css).toContain('.tlx-flag {');
    expect(css).toContain('.tlx-flag__image {');
    expect(css).toContain(`width: ${SPRITE_COLUMNS * 100}%;`);
    expect(css).toContain(`height: ${SPRITE_ROWS * 100}%;`);
    expect(css).toContain('background-size: 100% 100%;');
  });

  it('shows the neutral cell until a transform is set', async () => {
    const css = await readFile(new URL('flags.css', ASSETS), 'utf8');
    expect(css).toContain(`transform: ${flagTransform(null)};`);
  });

  it('carries the 1x sheet by default and the 2x sheet under a resolution media query', async () => {
    const css = await readFile(new URL('flags.css', ASSETS), 'utf8');
    expect(css).toContain('background-image: url(./sprite.png);');
    expect(css).toMatch(
      /@media \(min-resolution: 1\.5dppx\) \{\s*\.tlx-flag__image \{\s*background-image: url\(\.\/sprite@2x\.png\);/,
    );
    expect(css).not.toContain('image-set(');
    expect(css).toContain('print-color-adjust: exact;');
  });

  it('references only files that ship next to the stylesheet', async () => {
    const css = await readFile(new URL('flags.css', ASSETS), 'utf8');
    const references = [...css.matchAll(/url\(([^)]+)\)/g)].map((match) => match[1]!);
    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(reference.startsWith('./')).toBe(true);
      await expect(readFile(new URL(reference, ASSETS))).resolves.toBeInstanceOf(Buffer);
    }
  });
});

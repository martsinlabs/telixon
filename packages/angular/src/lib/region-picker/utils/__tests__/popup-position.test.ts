import { describe, expect, it } from 'vitest';
import { popupPosition, type PopupPositionInput } from '../popup-position';

const viewport = { width: 1000, height: 800 };
const popup = { width: 320, height: 300 };
const anchor = (left: number, top: number, width: number = 60, height: number = 36) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});
const place = (input: Partial<PopupPositionInput>) =>
  popupPosition({ popup, anchor: anchor(100, 100), viewport, isRightToLeft: false, offset: { x: 0, y: 4 }, ...input });

describe('popupPosition', () => {
  it('opens below the anchor at its start edge', () => {
    expect(place({})).toEqual({ top: 140, left: 100, side: 'bottom', align: 'start' });
  });

  it('moves above an anchor near the bottom edge when there is room', () => {
    expect(place({ anchor: anchor(100, 700) })).toMatchObject({ top: 396, side: 'top' });
  });

  it('stays below when neither side has room', () => {
    expect(place({ popup: { width: 320, height: 700 }, anchor: anchor(100, 200) }).side).toBe('bottom');
  });

  it('moves to the end edge of an anchor near the right edge', () => {
    expect(place({ anchor: anchor(900, 100) })).toMatchObject({ left: 640, align: 'end' });
  });

  it('starts from the right edge in right-to-left text and moves to the end edge near the left', () => {
    expect(place({ anchor: anchor(600, 100), isRightToLeft: true })).toMatchObject({ left: 340, align: 'start' });
    expect(place({ anchor: anchor(40, 100), isRightToLeft: true })).toMatchObject({ left: 40, align: 'end' });
  });

  it('keeps a popup wider than the room inside the viewport', () => {
    expect(place({ popup: { width: 900, height: 300 }, anchor: anchor(200, 100) })).toMatchObject({
      left: 100,
      align: 'start',
    });
  });

  it('keeps the offset on either side of the anchor', () => {
    expect(place({ offset: { x: 0, y: 12 } }).top).toBe(148);
    expect(place({ offset: { x: 0, y: 12 }, anchor: anchor(100, 700) }).top).toBe(388);
  });

  it('shifts along the edge toward the end, which mirrors in right-to-left text', () => {
    expect(place({ offset: { x: 10, y: 4 } }).left).toBe(110);
    expect(place({ offset: { x: 10, y: 4 }, anchor: anchor(600, 100), isRightToLeft: true }).left).toBe(330);
  });
});

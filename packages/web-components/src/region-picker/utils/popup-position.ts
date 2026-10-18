import type { TelixonPopupOffset } from '../models';

/** The edges of a box in viewport coordinates, as `getBoundingClientRect` reports them. */
export type BoxEdges = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

export type BoxSize = {
  readonly width: number;
  readonly height: number;
};

export type PopupPositionInput = {
  readonly popup: BoxSize;
  readonly anchor: BoxEdges;
  readonly viewport: BoxSize;
  readonly isRightToLeft: boolean;
  readonly offset: TelixonPopupOffset;
};

/** Where the popup goes in the viewport, with the side of the anchor it opens on and the edge it lines up with. */
export type PopupPosition = {
  readonly top: number;
  readonly left: number;
  readonly side: 'bottom' | 'top';
  readonly align: 'start' | 'end';
};

/**
 * The position of a popup next to its anchor. It opens below the anchor at the start edge. Where the
 * viewport leaves no room there, it moves above the anchor or to the end edge, staying inside the viewport.
 */
export function popupPosition(input: PopupPositionInput): PopupPosition {
  const { popup, anchor, viewport, isRightToLeft, offset } = input;
  const below: number = anchor.bottom + offset.y;
  const above: number = anchor.top - offset.y - popup.height;
  const opensAbove: boolean = below + popup.height > viewport.height && above >= 0;

  const shift: number = isRightToLeft ? -offset.x : offset.x;
  const atStart: number = (isRightToLeft ? anchor.right - popup.width : anchor.left) + shift;
  const atEnd: number = (isRightToLeft ? anchor.left : anchor.right - popup.width) + shift;
  const fits = (left: number): boolean => left >= 0 && left + popup.width <= viewport.width;
  const alignsToEnd: boolean = !fits(atStart) && fits(atEnd);
  const furthestLeft: number = Math.max(0, viewport.width - popup.width);

  return {
    top: opensAbove ? above : below,
    left: Math.min(Math.max(alignsToEnd ? atEnd : atStart, 0), furthestLeft),
    side: opensAbove ? 'top' : 'bottom',
    align: alignsToEnd ? 'end' : 'start',
  };
}

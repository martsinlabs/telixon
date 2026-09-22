import type { Renderer2 } from '@angular/core';
import { POPUP_ALIGN_ATTRIBUTE, POPUP_SIDE_ATTRIBUTE, RIGHT_TO_LEFT } from '../constants/popup';
import type { TelixonPopupOffset } from '../models';
import { popupPosition, type PopupPosition } from './popup-position';
import { trackViewport } from './track-viewport';

export type PopupPresenterOptions = {
  popup: () => HTMLElement;
  /** The element whose text direction the popup follows, and its anchor by default. */
  host: HTMLElement;
  renderer: Renderer2;
  view: Window | null;
};

/** Shows a popup in the top layer next to an anchor and keeps it there while the page moves. */
export type PopupPresenter = {
  /** Open the popup next to `anchor`, or next to the host without one. An anchor also gives the popup its width. */
  show(anchor: HTMLElement | undefined, offset: TelixonPopupOffset): void;
  /** Close the popup. */
  hide(): void;
  /** Stop following the page. The popup itself leaves with its element. */
  destroy(): void;
};

export function createPopupPresenter(options: PopupPresenterOptions): PopupPresenter {
  const { popup, host, renderer, view } = options;
  let isInTopLayer: boolean = false;
  let stopTracking: (() => void) | null = null;

  function place(anchor: HTMLElement | undefined, offset: TelixonPopupOffset): void {
    if (view === null) return;
    const element: HTMLElement = popup();
    const anchorBox: DOMRect = (anchor ?? host).getBoundingClientRect();
    // The width has to be in place before the popup is measured.
    if (anchor !== undefined) renderer.setStyle(element, 'width', `${anchorBox.width}px`);

    const position: PopupPosition = popupPosition({
      popup: element.getBoundingClientRect(),
      anchor: anchorBox,
      viewport: { width: view.innerWidth, height: view.innerHeight },
      isRightToLeft: view.getComputedStyle(host).direction === RIGHT_TO_LEFT,
      offset,
    });
    renderer.setAttribute(element, POPUP_SIDE_ATTRIBUTE, position.side);
    renderer.setAttribute(element, POPUP_ALIGN_ATTRIBUTE, position.align);
    if (!isInTopLayer) return;
    renderer.setStyle(element, 'top', `${position.top}px`);
    renderer.setStyle(element, 'left', `${position.left}px`);
  }

  function stopFollowing(): void {
    stopTracking?.();
    stopTracking = null;
  }

  return {
    show(anchor: HTMLElement | undefined, offset: TelixonPopupOffset): void {
      const element: HTMLElement = popup();
      // A browser without the Popover API keeps the popup where the stylesheet puts it.
      if (typeof element.showPopover === 'function' && !isInTopLayer) {
        element.showPopover();
        isInTopLayer = true;
      }
      place(anchor, offset);
      if (view !== null && stopTracking === null) {
        stopTracking = trackViewport(view, element, () => place(anchor, offset));
      }
    },

    hide(): void {
      stopFollowing();
      if (!isInTopLayer) return;
      popup().hidePopover();
      isInTopLayer = false;
    },

    destroy: stopFollowing,
  };
}

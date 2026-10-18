import { IN_TOP_LAYER_SELECTOR, POPUP_ALIGN_ATTRIBUTE, POPUP_SIDE_ATTRIBUTE, RIGHT_TO_LEFT } from '../constants/popup';
import type { TelixonPopupOffset } from '../models';
import { popupPosition, type PopupPosition } from './popup-position';
import { trackViewport } from './track-viewport';

export type PopupPresenterOptions = {
  popup: HTMLElement;
  /** The element whose text direction the popup follows, and its anchor by default. */
  host: HTMLElement;
};

/** Shows a popup in the top layer next to an anchor and keeps it there while the page moves. */
export type PopupPresenter = {
  /** Open the popup next to `anchor`, or next to the host without one. An anchor also gives the popup its width. */
  show(anchor: HTMLElement | null, offset: TelixonPopupOffset): void;
  /** Close the popup. */
  hide(): void;
  /** Stop following the page. The popup itself leaves with its element. */
  destroy(): void;
};

export function createPopupPresenter(options: PopupPresenterOptions): PopupPresenter {
  const { popup, host } = options;
  let stopTracking: (() => void) | null = null;

  // The browser hides a popover on its own when the element leaves the document. The popup itself is the only record.
  function isInTopLayer(): boolean {
    return popup.matches(IN_TOP_LAYER_SELECTOR);
  }

  function place(anchor: HTMLElement | null, offset: TelixonPopupOffset): void {
    const view: Window | null = host.ownerDocument.defaultView;
    if (view === null) return;
    const anchorBox: DOMRect = (anchor ?? host).getBoundingClientRect();
    // The width has to be in place before the popup is measured.
    if (anchor !== null) popup.style.width = `${anchorBox.width}px`;

    const position: PopupPosition = popupPosition({
      popup: popup.getBoundingClientRect(),
      anchor: anchorBox,
      viewport: { width: view.innerWidth, height: view.innerHeight },
      isRightToLeft: view.getComputedStyle(host).direction === RIGHT_TO_LEFT,
      offset,
    });
    popup.setAttribute(POPUP_SIDE_ATTRIBUTE, position.side);
    popup.setAttribute(POPUP_ALIGN_ATTRIBUTE, position.align);
    if (!isInTopLayer()) return;
    popup.style.top = `${position.top}px`;
    popup.style.left = `${position.left}px`;
  }

  function stopFollowing(): void {
    stopTracking?.();
    stopTracking = null;
  }

  return {
    show(anchor: HTMLElement | null, offset: TelixonPopupOffset): void {
      // A browser without the Popover API keeps the popup where the stylesheet puts it.
      if (typeof popup.showPopover === 'function' && !isInTopLayer()) popup.showPopover();
      place(anchor, offset);
      const view: Window | null = host.ownerDocument.defaultView;
      if (view !== null && stopTracking === null) {
        stopTracking = trackViewport(view, popup, () => place(anchor, offset));
      }
    },

    hide(): void {
      stopFollowing();
      if (isInTopLayer()) popup.hidePopover();
    },

    destroy: stopFollowing,
  };
}

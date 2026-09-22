import type { TelixonPopupOffset } from '../models';

/** The side of the anchor the list opened on, `bottom` or `top`. A styling hook. */
export const POPUP_SIDE_ATTRIBUTE = 'data-side';

/** The anchor edge the list lines up with, `start` or `end`. A styling hook. */
export const POPUP_ALIGN_ATTRIBUTE = 'data-align';

/** The computed `direction` of right-to-left text. */
export const RIGHT_TO_LEFT = 'rtl';

/** Four pixels below the anchor at its start edge. */
export const DEFAULT_POPUP_OFFSET: TelixonPopupOffset = Object.freeze({ x: 0, y: 4 });

/** The custom properties the stylesheet reads where the Popover API is absent. */
export const POPUP_OFFSET_X_PROPERTY = '--tlx-picker-popup-offset-x';
export const POPUP_OFFSET_Y_PROPERTY = '--tlx-picker-popup-offset-y';

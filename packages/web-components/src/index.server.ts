export * from '@telixon/core';
export * from '@telixon/web-sdk';
export * from '@telixon/web-sdk/flags';
export { FLAG_TAG, PHONE_FIELD_TAG, REGION_PICKER_TAG } from './constants/tag-names';
export { CHANGE_EVENT, STATE_EVENT } from './phone-field/constants/events';
export type {
  TelixonPhoneChangeDetail,
  TelixonPhoneFieldOptions,
  TelixonPhoneMessage,
  TelixonPhoneStateDetail,
} from './phone-field/models';
export type { TelixonPopupOffset, TelixonRenderOption, TelixonRenderTrigger } from './region-picker/models';

const SERVER_MESSAGE =
  '@telixon/web-components defines its elements in a browser. Call defineTelixonElements() on the client.';

/**
 * The server-side entry, resolved under the `node` condition. A server renders the tags as plain
 * HTML and never upgrades them. The elements are not defined here, which a call surfaces by throwing.
 */
export function defineTelixonElements(): void {
  throw new Error(SERVER_MESSAGE);
}

/** The element classes exist in a browser only. On a server a construction attempt throws. */
export class TelixonPhoneFieldElement {
  constructor() {
    throw new Error(SERVER_MESSAGE);
  }
}

export class TelixonRegionPickerElement {
  constructor() {
    throw new Error(SERVER_MESSAGE);
  }
}

export class TelixonFlagElement {
  constructor() {
    throw new Error(SERVER_MESSAGE);
  }
}

export * from '@telixon/core';
export * from '@telixon/web-sdk';
export * from '@telixon/web-sdk/flags';
export { FLAG_TAG, PHONE_FIELD_TAG, REGION_PICKER_TAG } from './constants/tag-names';
export * from './define';
export * from './flag';
export * from './phone-field';
export * from './region-picker';

import type { TelixonFlagElement } from './flag';
import type { TelixonPhoneFieldElement } from './phone-field';
import type { TelixonRegionPickerElement } from './region-picker';

declare global {
  interface HTMLElementTagNameMap {
    'telixon-phone-field': TelixonPhoneFieldElement;
    'telixon-region-picker': TelixonRegionPickerElement;
    'telixon-flag': TelixonFlagElement;
  }
}

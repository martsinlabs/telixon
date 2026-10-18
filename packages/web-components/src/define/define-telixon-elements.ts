import { FLAG_TAG, PHONE_FIELD_TAG, REGION_PICKER_TAG } from '../constants/tag-names';
import { TelixonFlagElement } from '../flag';
import { TelixonPhoneFieldElement } from '../phone-field';
import { TelixonRegionPickerElement } from '../region-picker';
import { defineElement } from './utils/define-element';

/**
 * Registers `<telixon-phone-field>`, `<telixon-region-picker>`, and `<telixon-flag>`. Idempotent.
 * Nothing registers at import time, which leaves the timing to the page.
 */
export function defineTelixonElements(): void {
  defineElement(PHONE_FIELD_TAG, TelixonPhoneFieldElement);
  defineElement(REGION_PICKER_TAG, TelixonRegionPickerElement);
  defineElement(FLAG_TAG, TelixonFlagElement);
}

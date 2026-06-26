import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '..';

const US_MOBILE_INTL = '1' + getExampleNumber('US', 'MOBILE');
const US_TOLL_FREE_INTL = '1' + getExampleNumber('US', 'TOLL_FREE');

describe('InternationalInputController: numberTypeFilter', () => {
  it('restricts validity to the filtered type', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });

    controller.setValue(US_TOLL_FREE_INTL);
    expect(controller.getPhoneNumber().isValid()).toBe(true);

    controller.setNumberTypeFilter(['MOBILE']);
    controller.setValue(US_TOLL_FREE_INTL);
    expect(controller.getPhoneNumber().isValid()).toBe(false);

    controller.setValue(US_MOBILE_INTL);
    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it('resolves region independent of the active number-type filter', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setNumberTypeFilter(['MOBILE']);

    // A toll-free number does not match the MOBILE filter, yet its region is still US.
    expect(controller.setValue(US_TOLL_FREE_INTL).region).toBe('US');
    expect(controller.setValue(US_MOBILE_INTL).region).toBe('US');
  });
});

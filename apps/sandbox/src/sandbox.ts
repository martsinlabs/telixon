import { createPhoneInput, PhoneInput } from '@telixon/web-sdk';
import { countryEl, initialValueEl, phoneInputEl } from './elements';
import type { Controller, Mode } from './types';
import { record, sync } from './view';

export type { Controller, Mode } from './types';

const DEFAULT_COUNTRY = 'US';

let current: Controller | null = null;

export function getCurrent(): Controller | null {
  return current;
}

export function attach(mode: Mode, value: string = initialValueEl.value): void {
  current?.unsubscribe();
  current?.phone.destroy();

  const phone = mount(mode, value);
  const unsubscribe = phone.subscribe(() => sync(current));

  current = { mode, phone, unsubscribe };
  sync(current);
  record(`attach(${mode})`);
}

export function mount(mode: Mode, value: string): PhoneInput {
  if (mode === 'national') {
    return createPhoneInput({
      mode: 'national',
      country: countryEl.value || DEFAULT_COUNTRY,
      initialValue: value,
      input: phoneInputEl,
    });
  }

  return createPhoneInput({
    mode: 'international',
    defaultCountry: countryEl.value || DEFAULT_COUNTRY,
    display: { callingCodeInInput: true, plusPrefix: true },
    initialValue: value,
    input: phoneInputEl,
  });
}

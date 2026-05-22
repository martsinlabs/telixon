export type { InternationalInputControllerConfig } from './modules/input-controller/international-input-controller';
export { InputController } from './modules/input-controller/models';
export type { InputState } from './modules/input-controller/models';
export type { NationalInputControllerConfig } from './modules/input-controller/national-input-controller';
export type { PhoneNumber, PhoneNumberValidationResult } from './modules/phone-number';

export { createInternationalInputController } from './modules/input-controller/international-input-controller';
export { createNationalInputController } from './modules/input-controller/national-input-controller';

export { getCountryCallingCode } from './modules/country-calling-code';

export { ensureReady } from './resource-provider';

export { COUNTRY_IDS } from './engine';
export type { CountryId, NumberType } from './engine';

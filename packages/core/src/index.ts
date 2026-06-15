export type { InternationalInputControllerConfig } from './modules/input-controller/international-input-controller';
export { InputController } from './modules/input-controller/models';
export type { InputState } from './modules/input-controller/models';
export type { NationalInputControllerConfig } from './modules/input-controller/national-input-controller';
export type { PhoneNumber, PhoneNumberValidationResult, ValidationError } from './modules/phone-number';

export { createInternationalInputController } from './modules/input-controller/international-input-controller';
export { createNationalInputController } from './modules/input-controller/national-input-controller';

export { parsePhoneNumber } from './modules/parse-phone-number';
export type { ParsePhoneNumberOptions } from './modules/parse-phone-number';

export { getCallingCodeForRegion } from './modules/calling-code-for-region';

export { countrySupportsNumberType } from './modules/country-number-types';

export { getPlaceholders, isNationalPrefixOptional } from './modules/placeholders';
export type { Placeholders } from './modules/placeholders';

export { isEngineReady } from './resource-provider';

export { TelixonNotReadyError } from './errors';

export { REGION_IDS } from './engine';
export type { NumberType, RegionId } from './engine';

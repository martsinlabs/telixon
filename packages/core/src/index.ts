export { parsePhoneNumber } from './modules/parse-phone-number';
export type { ParsePhoneNumberOptions } from './modules/parse-phone-number';
export type { PhoneNumber, PhoneNumberValidationResult, ValidationError } from './modules/phone-number';

export { createInternationalInputController } from './modules/input-controller/international-input-controller';
export type {
  InternationalDisplayConfig,
  InternationalInputControllerConfig,
} from './modules/input-controller/international-input-controller';
export type { InputController, InputState } from './modules/input-controller/models';
export { createNationalInputController } from './modules/input-controller/national-input-controller';
export type { NationalInputControllerConfig } from './modules/input-controller/national-input-controller';

export { getCallingCodeForCountry } from './modules/calling-code-for-country';
export { countrySupportsNumberTypes } from './modules/country-number-types';
export { getPlaceholders, isNationalPrefixOptional } from './modules/placeholders';
export type { Placeholders } from './modules/placeholders';

export { TelixonNotReadyError } from './errors';
export { isEngineReady } from './resource-provider';

export { REGION_IDS } from './engine';
export type { NumberType, RegionId } from './engine';
export { NUMBER_TYPES } from './number-types';

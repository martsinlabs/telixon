export { parsePhoneNumber } from './modules/parse-phone-number';
export type { ParsePhoneNumberOptions } from './modules/parse-phone-number';
export type { PhoneNumber, PossibilityResult, ValidationError } from './modules/phone-number';

export { createInternationalInputController } from './modules/input-controller/international-input-controller';
export type {
  InternationalDisplayConfig,
  InternationalInputControllerConfig,
} from './modules/input-controller/international-input-controller';
export type { InputController, InputState } from './modules/input-controller/models';
export { createNationalInputController } from './modules/input-controller/national-input-controller';
export type { NationalInputControllerConfig } from './modules/input-controller/national-input-controller';

export { getCallingCodeForRegion } from './modules/calling-code-for-region';
export { getPlaceholders, isNationalPrefixOptional } from './modules/placeholders';
export type { Placeholders } from './modules/placeholders';
export { regionSupportsNumberTypes } from './modules/region-number-types';

export { EngineNotReadyError } from './errors';
export { isEngineReady } from './resource-provider';

export { REGION_CODES } from './engine';
export type { NumberType, RegionCode } from './engine';
export { NUMBER_TYPES } from './number-types';

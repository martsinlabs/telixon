import type { InputController } from '@telixon/core';
import { createInternationalInputController, createNationalInputController } from '@telixon/core';
import type { InternationalPhoneInputOptions, NationalPhoneInputOptions, PhoneInputOptions } from '../models';

function createNationalController(options: NationalPhoneInputOptions): InputController {
  const {
    input: _input,
    mode: _mode,
    regionFilter: _regionFilter,
    numberTypeFilter: _numberTypeFilter,
    placeholderNumberType: _placeholderNumberType,
    ...config
  } = options;

  return createNationalInputController(config);
}

function createInternationalController(options: InternationalPhoneInputOptions): InputController {
  const {
    input: _input,
    mode: _mode,
    regionFilter: _regionFilter,
    numberTypeFilter: _numberTypeFilter,
    placeholderNumberType: _placeholderNumberType,
    ...config
  } = options;

  return createInternationalInputController(config);
}

export function buildController(options: PhoneInputOptions): InputController {
  return options.mode === 'national' ? createNationalController(options) : createInternationalController(options);
}

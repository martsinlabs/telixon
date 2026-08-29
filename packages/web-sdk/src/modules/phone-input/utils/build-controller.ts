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
  // A value already present in the DOM input (server-rendered, restored, autofilled before attach)
  // seeds the controller unless the consumer passes an explicit initialValue.
  const seeded: PhoneInputOptions =
    options.initialValue === undefined && options.input.value !== ''
      ? { ...options, initialValue: options.input.value }
      : options;

  return seeded.mode === 'national' ? createNationalController(seeded) : createInternationalController(seeded);
}

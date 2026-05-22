import { createNationalInputController } from '../national-input-controller';
import { registerControllerBenches } from './register-controller-benches';

registerControllerBenches('NationalInputController (AR)', () => createNationalInputController({ country: 'AR' }), {
  setValueInput: '011 15-3434-3444',
  typedInput: '011 15-3434-3444',
  selectionStart: 4,
  selectionEnd: 10,
});

// +1 is shared (NANPA): country resolution iterates regions with per-pattern regex.
registerControllerBenches(
  'NationalInputController (US, +1 NANPA)',
  () => createNationalInputController({ country: 'US' }),
  {
    setValueInput: '(213) 373-4253',
    typedInput: '2133734253',
    selectionStart: 4,
    selectionEnd: 10,
  },
);

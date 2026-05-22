import { createInternationalInputController } from '../international-input-controller';
import { registerControllerBenches } from './register-controller-benches';

registerControllerBenches(
  'InternationalInputController (AR)',
  () => createInternationalInputController({ defaultCountry: 'AR' }),
  {
    setValueInput: '+54 9 11 3434-3444',
    typedInput: '91134343444',
    selectionStart: 4,
    selectionEnd: 11,
  },
);

// +1 is shared (NANPA), so country and format selection iterate regions with per-pattern regex —
// the multi-region hot path the single-region AR suite does not exercise.
registerControllerBenches(
  'InternationalInputController (US, +1 NANPA)',
  () => createInternationalInputController({ defaultCountry: 'US' }),
  {
    setValueInput: '+1 213 373 4253',
    typedInput: '2133734253',
    selectionStart: 4,
    selectionEnd: 10,
  },
);

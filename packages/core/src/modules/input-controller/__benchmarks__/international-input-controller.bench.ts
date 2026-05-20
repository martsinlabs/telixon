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

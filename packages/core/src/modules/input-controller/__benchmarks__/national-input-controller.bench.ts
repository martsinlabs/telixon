import { createNationalInputController } from '../national-input-controller';
import { registerControllerBenches } from './register-controller-benches';

registerControllerBenches('NationalInputController (AR)', () => createNationalInputController({ country: 'AR' }), {
  setValueInput: '011 15-3434-3444',
  typedInput: '011 15-3434-3444',
  selectionStart: 4,
  selectionEnd: 10,
});

import { ensureEngineReady } from '@telixon/core';
import { createPhoneInput } from '@telixon/web-sdk';

await ensureEngineReady();

const input = document.querySelector('#phone-field input');
const status = document.querySelector('#phone-field .phone-field-status');

const phone = createPhoneInput({
  mode: 'international',
  display: { callingCodeInInput: true, plusPrefix: 'erasable' },
  input,
});

function renderStatus(state) {
  if (state.value === '') {
    status.textContent = 'Type a number.';
    status.dataset.tone = '';
    return;
  }

  if (state.validationError === null) {
    status.textContent = 'Valid: ' + state.region + ' ' + phone.getPhoneNumber().formatE164();
    status.dataset.tone = 'valid';
    return;
  }

  status.textContent = state.validationError.kind;
  status.dataset.tone = 'error';
}

phone.subscribe(renderStatus);
renderStatus(phone.getState());

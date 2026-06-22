import type { PhoneInputState } from '@telixon/web-sdk';
import '../style.css';

import { bootstrapResources } from '../shared/bootstrap';
import { mustGet } from '../shared/must-get';
import { renderNav } from '../shared/nav';
import { createPhoneField, flagEmoji, type PhoneFieldHandle, type PhoneFieldOptions } from '../shared/phone-field';

renderNav('variations');

void bootstrap();

async function bootstrap(): Promise<void> {
  const ok = await bootstrapResources(reportFatal);
  if (!ok) return;

  mountAndWire('national', { mode: 'national', country: 'US' });

  mountAndWire('international-plus', {
    mode: 'international',
    display: 'plus',
    defaultCountry: 'US',
  });

  mountAndWire('international-no-plus', {
    mode: 'international',
    display: 'no-plus',
    defaultCountry: 'US',
  });

  mountAndWire('international-split', {
    mode: 'international',
    display: 'split',
    defaultCountry: 'US',
  });
}

function mountAndWire(key: string, options: PhoneFieldOptions): PhoneFieldHandle {
  const slot = mustGet(`[data-mount="${key}"]`, HTMLDivElement);
  const field = createPhoneField(options);
  slot.replaceChildren(field.root);

  const chip = mustGet(`[data-info="${key}"]`, HTMLSpanElement);
  const paint = (state: PhoneInputState): void => {
    chip.textContent = state.country === null ? 'n/a' : `${flagEmoji(state.country)}  ${state.country}`;
  };
  field.subscribe(paint);
  paint(field.getState());

  return field;
}

function reportFatal(message: string): void {
  const main = document.querySelector('.main');
  if (main instanceof HTMLElement) main.textContent = message;
}

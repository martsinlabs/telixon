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

  mountAndWire('national', { mode: 'national', defaultRegion: 'US' });

  mountAndWire('international-plus', {
    mode: 'international',
    display: 'plus',
    defaultRegion: 'US',
  });

  mountAndWire('international-no-plus', {
    mode: 'international',
    display: 'no-plus',
    defaultRegion: 'US',
  });

  mountAndWire('international-split', {
    mode: 'international',
    display: 'split',
    defaultRegion: 'US',
  });
}

function mountAndWire(key: string, options: PhoneFieldOptions): PhoneFieldHandle {
  const slot = mustGet(`[data-mount="${key}"]`, HTMLDivElement);
  const field = createPhoneField(options);
  slot.replaceChildren(field.root);

  const chip = mustGet(`[data-info="${key}"]`, HTMLSpanElement);
  const paint = (state: PhoneInputState): void => {
    chip.textContent = state.region === null ? 'n/a' : `${flagEmoji(state.region)}  ${state.region}`;
  };
  field.subscribe(paint);
  paint(field.getState());

  return field;
}

function reportFatal(message: string): void {
  const main = document.querySelector('.main');
  if (main instanceof HTMLElement) main.textContent = message;
}

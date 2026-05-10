import { getResourceProvider } from '@telixon/core/resource-provider';
import './style.css';

import {
  applyCountryBtn,
  applyInitialValueBtn,
  clearValueBtn,
  countryEl,
  initialValueEl,
  modeEl,
  reattachBtn,
  redoBtn,
  setValueBtn,
  stateEl,
  undoBtn,
  warningEl,
} from './elements';
import { attach, getCurrent, mount, type Mode } from './sandbox';
import { record, sync } from './view';

stateEl.textContent = 'Loading…';

void bootstrap();

modeEl.addEventListener('change', () => attach(resolveMode()));

applyInitialValueBtn.addEventListener('click', () => attach(resolveMode(), initialValueEl.value));

applyCountryBtn.addEventListener('click', () => {
  const country = countryEl.value || 'US';
  const ctrl = getCurrent();
  ctrl?.phone.setCountry(country);
  sync(ctrl);
  record(`setCountry("${country}")`);
});

setValueBtn.addEventListener('click', () => {
  const ctrl = getCurrent();
  ctrl?.phone.setValue(initialValueEl.value);
  sync(ctrl);
  record(`setValue("${initialValueEl.value}")`);
});

clearValueBtn.addEventListener('click', () => {
  const ctrl = getCurrent();
  ctrl?.phone.setValue('');
  sync(ctrl);
  record('setValue("")');
});

undoBtn.addEventListener('click', () => {
  const ctrl = getCurrent();
  ctrl?.phone.undo();
  sync(ctrl);
  record('undo()');
});

redoBtn.addEventListener('click', () => {
  const ctrl = getCurrent();
  ctrl?.phone.redo();
  sync(ctrl);
  record('redo()');
});

reattachBtn.addEventListener('click', () => {
  try {
    mount(resolveMode(), initialValueEl.value);
    record('duplicate attach — unexpectedly succeeded');
  } catch (err) {
    record(err instanceof Error ? err.message : 'Unknown error');
  }
});

async function bootstrap(): Promise<void> {
  try {
    await getResourceProvider().ensureReady();
    attach(resolveMode());
    record('resources ready');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    stateEl.textContent = msg;
    warningEl.textContent = msg;
    record(msg);
  }
}

function resolveMode(): Mode {
  return modeEl.value === 'international' ? 'international' : 'national';
}

import { ensureReady, type NumberType, type RegionId } from '@telixon/core';
import './style.css';

import { createChipFilter } from './chip-filter';
import {
  applyCountryBtn,
  applyFiltersBtn,
  applyInitialValueBtn,
  clearFiltersBtn,
  clearValueBtn,
  countryEl,
  countryFilterEl,
  initialValueEl,
  modeEl,
  numberTypeFilterEl,
  reattachBtn,
  redoBtn,
  sealBtn,
  setValueBtn,
  stateEl,
  strictEl,
  undoBtn,
  warningEl,
} from './elements';
import { isCountryId } from './guards';
import { attach, getCurrent, mount, type Mode } from './sandbox';
import { record, sync } from './view';

const numberTypeFilter = createChipFilter<NumberType>(numberTypeFilterEl, {
  options: [
    { value: 'FIXED_LINE', label: 'Fixed line' },
    { value: 'MOBILE', label: 'Mobile' },
    { value: 'FIXED_LINE_OR_MOBILE', label: 'Fixed line or mobile' },
    { value: 'TOLL_FREE', label: 'Toll free' },
    { value: 'PREMIUM_RATE', label: 'Premium rate' },
    { value: 'SHARED_COST', label: 'Shared cost' },
    { value: 'VOIP', label: 'VoIP' },
    { value: 'PERSONAL_NUMBER', label: 'Personal number' },
    { value: 'PAGER', label: 'Pager' },
    { value: 'UAN', label: 'UAN' },
    { value: 'VOICEMAIL', label: 'Voicemail' },
  ],
});

stateEl.textContent = 'Loading…';

void bootstrap();

modeEl.addEventListener('change', () => attach(resolveMode()));

strictEl.addEventListener('change', () => attach(resolveMode()));

applyInitialValueBtn.addEventListener('click', () => attach(resolveMode(), initialValueEl.value));

applyCountryBtn.addEventListener('click', () => {
  const raw = countryEl.value.toUpperCase();
  if (!isCountryId(raw)) {
    record(`setCountry skipped: invalid country "${raw}"`);
    return;
  }
  const ctrl = getCurrent();
  ctrl?.phone.setCountry(raw);
  sync(ctrl);
  record(`setCountry("${raw}")`);
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

sealBtn.addEventListener('click', () => {
  const ctrl = getCurrent();
  ctrl?.phone.seal();
  sync(ctrl);
  record('seal()');
});

applyFiltersBtn.addEventListener('click', () => {
  const ctrl = getCurrent();
  if (!ctrl) return;

  const countries = parseCountryFilter(countryFilterEl.value);
  const selected = numberTypeFilter.getValues();
  const numberTypes = selected.length > 0 ? selected : null;

  ctrl.phone.setCountryFilter(countries);
  ctrl.phone.setNumberTypeFilter(numberTypes);
  sync(ctrl);
  record(`setCountryFilter(${JSON.stringify(countries)}) · setNumberTypeFilter(${JSON.stringify(numberTypes)})`);
});

clearFiltersBtn.addEventListener('click', () => {
  const ctrl = getCurrent();
  countryFilterEl.value = '';
  numberTypeFilter.setValues([]);
  ctrl?.phone.setCountryFilter(null);
  ctrl?.phone.setNumberTypeFilter(null);
  sync(ctrl);
  record('filters cleared');
});

reattachBtn.addEventListener('click', () => {
  try {
    mount(resolveMode(), initialValueEl.value);
    record('duplicate attach: unexpectedly succeeded');
  } catch (err) {
    record(err instanceof Error ? err.message : 'Unknown error');
  }
});

async function bootstrap(): Promise<void> {
  try {
    await ensureReady();
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

function parseCountryFilter(value: string): RegionId[] | null {
  const items: RegionId[] = value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(isCountryId);
  return items.length > 0 ? items : null;
}

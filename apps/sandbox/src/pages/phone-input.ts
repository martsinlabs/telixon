import { type NumberType, type RegionCode } from '@telixon/core';
import '../style.css';

import { attach, getCurrent, mount, type Mode } from '../phone-input/controller';
import {
  applyFiltersBtn,
  applyInitialValueBtn,
  applyRegionBtn,
  clearFiltersBtn,
  clearHistoryBtn,
  clearValueBtn,
  initialValueEl,
  modeEl,
  numberTypeFilterEl,
  reattachBtn,
  redoBtn,
  regionEl,
  regionFilterEl,
  setValueBtn,
  stateEl,
  strictEl,
  undoBtn,
  warningEl,
} from '../phone-input/elements';
import { record, sync } from '../phone-input/view';
import { bootstrapResources } from '../shared/bootstrap';
import { createChipFilter } from '../shared/chip-filter';
import { isRegionId } from '../shared/guards';
import { renderNav } from '../shared/nav';

renderNav('phone-input');

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

applyRegionBtn.addEventListener('click', () => {
  const raw = regionEl.value.toUpperCase();
  if (!isRegionId(raw)) {
    record(`setRegion skipped: invalid region "${raw}"`);
    return;
  }
  const ctrl = getCurrent();
  ctrl?.phone.setRegion(raw);
  sync(ctrl);
  record(`setRegion("${raw}")`);
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

clearHistoryBtn.addEventListener('click', () => {
  const ctrl = getCurrent();
  ctrl?.phone.clearHistory();
  sync(ctrl);
  record('clearHistory()');
});

applyFiltersBtn.addEventListener('click', () => {
  const ctrl = getCurrent();
  if (!ctrl) return;

  const countries = parseRegionFilter(regionFilterEl.value);
  const selected = numberTypeFilter.getValues();
  const numberTypes = selected.length > 0 ? selected : null;

  ctrl.phone.setRegionFilter(countries);
  ctrl.phone.setNumberTypeFilter(numberTypes);
  sync(ctrl);
  record(`setRegionFilter(${JSON.stringify(countries)}) · setNumberTypeFilter(${JSON.stringify(numberTypes)})`);
});

clearFiltersBtn.addEventListener('click', () => {
  const ctrl = getCurrent();
  regionFilterEl.value = '';
  numberTypeFilter.setValues([]);
  ctrl?.phone.setRegionFilter(null);
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
  const ok = await bootstrapResources((msg) => {
    stateEl.textContent = msg;
    warningEl.textContent = msg;
    record(msg);
  });
  if (!ok) return;
  attach(resolveMode());
  record('resources ready');
}

function resolveMode(): Mode {
  return modeEl.value === 'international' ? 'international' : 'national';
}

function parseRegionFilter(value: string): RegionCode[] | null {
  const items: RegionCode[] = value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(isRegionId);
  return items.length > 0 ? items : null;
}

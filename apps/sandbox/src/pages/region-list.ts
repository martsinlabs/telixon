import type { NumberType, RegionCode } from '@telixon/core';
import { createRegionList, type RegionList, type RegionListSort } from '@telixon/web-sdk';
import '../style.css';

import {
  applyConfigBtn,
  applyFiltersBtn,
  clearFiltersBtn,
  localeEl,
  numberTypeFilterEl,
  prioritizeEl,
  refreshBtn,
  regionFilterEl,
  searchEl,
  sortEl,
  stateEl,
} from '../region-list/elements';
import { render } from '../region-list/view';
import { bootstrapResources } from '../shared/bootstrap';
import { createChipFilter } from '../shared/chip-filter';
import { isRegionId } from '../shared/guards';
import { renderNav } from '../shared/nav';
import { NUMBER_TYPE_OPTIONS } from '../shared/number-type-options';

renderNav('region-list');

const numberTypeFilter = createChipFilter<NumberType>(numberTypeFilterEl, { options: NUMBER_TYPE_OPTIONS });

stateEl.textContent = 'Loading…';

let list: RegionList | null = null;

void bootstrap();

searchEl.addEventListener('input', () => list?.search(searchEl.value));

applyConfigBtn.addEventListener('click', () => buildList());

refreshBtn.addEventListener('click', () => list?.refresh());

applyFiltersBtn.addEventListener('click', () => {
  if (list === null) return;
  list.setRegionFilter(parseRegions(regionFilterEl.value));
  const selected = numberTypeFilter.getValues();
  list.setNumberTypeFilter(selected.length > 0 ? selected : null);
});

clearFiltersBtn.addEventListener('click', () => {
  regionFilterEl.value = '';
  numberTypeFilter.setValues([]);
  list?.setRegionFilter(null);
  list?.setNumberTypeFilter(null);
});

async function bootstrap(): Promise<void> {
  const ok = await bootstrapResources((msg) => (stateEl.textContent = msg));
  if (!ok) return;
  buildList();
}

function buildList(): void {
  list?.destroy();

  list = createRegionList({
    locale: localeEl.value,
    sort: sortEl.value as RegionListSort<undefined>,
    prioritize: parseRegions(prioritizeEl.value) ?? [],
    searchQuery: searchEl.value,
    regionFilter: parseRegions(regionFilterEl.value),
    numberTypeFilter: resolveNumberTypeFilter(),
  });

  list.subscribe(render);
  render(list.getState());
}

function resolveNumberTypeFilter(): readonly NumberType[] | null {
  const selected = numberTypeFilter.getValues();
  return selected.length > 0 ? selected : null;
}

function parseRegions(value: string): RegionCode[] | null {
  const items: RegionCode[] = value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(isRegionId);
  return items.length > 0 ? items : null;
}

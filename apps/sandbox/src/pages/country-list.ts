import type { NumberType, RegionCode } from '@telixon/core';
import { createCountryList, type CountryList, type CountryListSort } from '@telixon/web-sdk';
import '../style.css';

import {
  applyConfigBtn,
  applyFiltersBtn,
  clearFiltersBtn,
  countryFilterEl,
  localeEl,
  numberTypeFilterEl,
  prioritizeEl,
  refreshBtn,
  searchEl,
  sortEl,
  stateEl,
} from '../country-list/elements';
import { render } from '../country-list/view';
import { bootstrapResources } from '../shared/bootstrap';
import { createChipFilter } from '../shared/chip-filter';
import { isRegionId } from '../shared/guards';
import { renderNav } from '../shared/nav';

renderNav('country-list');

const numberTypeFilter = createChipFilter<NumberType>(numberTypeFilterEl, {
  options: [
    { value: 'FIXED_LINE', label: 'Fixed line' },
    { value: 'MOBILE', label: 'Mobile' },
    { value: 'FIXED_LINE_OR_MOBILE', label: 'Fixed line or mobile' },
    { value: 'TOLL_FREE', label: 'Toll free' },
    { value: 'PREMIUM_RATE', label: 'Premium rate' },
    { value: 'VOIP', label: 'VoIP' },
    { value: 'PAGER', label: 'Pager' },
    { value: 'UAN', label: 'UAN' },
  ],
});

stateEl.textContent = 'Loading…';

let list: CountryList | null = null;

void bootstrap();

searchEl.addEventListener('input', () => list?.search(searchEl.value));

applyConfigBtn.addEventListener('click', () => buildList());

refreshBtn.addEventListener('click', () => list?.refresh());

applyFiltersBtn.addEventListener('click', () => {
  if (list === null) return;
  list.setCountryFilter(parseCountries(countryFilterEl.value));
  const selected = numberTypeFilter.getValues();
  list.setNumberTypeFilter(selected.length > 0 ? selected : null);
});

clearFiltersBtn.addEventListener('click', () => {
  countryFilterEl.value = '';
  numberTypeFilter.setValues([]);
  list?.setCountryFilter(null);
  list?.setNumberTypeFilter(null);
});

async function bootstrap(): Promise<void> {
  const ok = await bootstrapResources((msg) => (stateEl.textContent = msg));
  if (!ok) return;
  buildList();
}

function buildList(): void {
  list?.destroy();

  list = createCountryList({
    locale: localeEl.value,
    sort: sortEl.value as CountryListSort<undefined>,
    prioritize: parseCountries(prioritizeEl.value) ?? [],
    searchQuery: searchEl.value,
    countryFilter: parseCountries(countryFilterEl.value),
    numberTypeFilter: resolveNumberTypeFilter(),
  });

  list.subscribe(render);
  render(list.getState());
}

function resolveNumberTypeFilter(): readonly NumberType[] | null {
  const selected = numberTypeFilter.getValues();
  return selected.length > 0 ? selected : null;
}

function parseCountries(value: string): RegionCode[] | null {
  const items: RegionCode[] = value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(isRegionId);
  return items.length > 0 ? items : null;
}

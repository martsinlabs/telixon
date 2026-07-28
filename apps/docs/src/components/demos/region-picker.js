import { ensureEngineReady } from '@telixon/core';
import { createRegionList, regionToFlagEmoji } from '@telixon/web-sdk';

await ensureEngineReady();

const search = document.querySelector('#region-picker input');
const list = document.querySelector('#region-picker ul');
const status = document.querySelector('#region-picker .region-picker-status');

const regions = createRegionList({
  prioritize: ['US', 'CA', 'GB'],
  dataFactory: ({ region }) => regionToFlagEmoji(region),
});

let selected = 'US';

// Shown when the search matches nothing.
const emptyRow = document.createElement('li');
emptyRow.className = 'region-picker-empty';
emptyRow.textContent = 'No matches';

// Full rebuild when the search changes the option set.
function renderList(state) {
  if (state.options.length === 0) {
    list.replaceChildren(emptyRow);
    return;
  }

  list.replaceChildren(
    ...state.options.map((option) => {
      const row = document.createElement('li');
      row.id = 'region-picker-option-' + option.region;
      row.dataset.region = option.region;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(option.region === selected));

      const flag = document.createElement('span');
      flag.textContent = option.data;
      const name = document.createElement('span');
      name.textContent = option.displayName;
      const code = document.createElement('span');
      code.className = 'region-picker-code';
      code.textContent = '+' + option.callingCode;

      row.append(flag, name, code);
      return row;
    }),
  );
}

// Move the highlight without rebuilding the list.
function markSelected(region) {
  const previous = list.querySelector('[aria-selected="true"]');
  if (previous) previous.setAttribute('aria-selected', 'false');
  const next = list.querySelector(`[data-region="${region}"]`);
  if (next) next.setAttribute('aria-selected', 'true');
}

// The keyboard cursor. Focus stays in the search while aria-activedescendant names the active row.
let activeRegion = null;

function setActive(region) {
  const previous = list.querySelector('[data-active="true"]');
  if (previous) previous.removeAttribute('data-active');
  search.removeAttribute('aria-activedescendant');
  activeRegion = null;

  const next = region === null ? null : list.querySelector(`[data-region="${region}"]`);
  if (next === null) return;
  activeRegion = region;
  next.setAttribute('data-active', 'true');
  search.setAttribute('aria-activedescendant', next.id);
  // Scroll the list only; scrollIntoView would drag every scrollable ancestor, the page included.
  const rowRect = next.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  if (rowRect.top < listRect.top) list.scrollTop += rowRect.top - listRect.top;
  else if (rowRect.bottom > listRect.bottom) list.scrollTop += rowRect.bottom - listRect.bottom;
}

// Wraps past either end; without a cursor, Down starts at the first row and Up at the last.
function moveActive(step) {
  const rows = [...list.children];
  if (rows.length === 0) return;
  const index = rows.findIndex((row) => row.dataset.region === activeRegion);
  const nextIndex = index === -1 ? (step > 0 ? 0 : rows.length - 1) : (index + step + rows.length) % rows.length;
  setActive(rows[nextIndex].dataset.region);
}

function select(region) {
  const option = regions.getState().options.find((candidate) => candidate.region === region);
  if (option === undefined) return;
  selected = region;
  markSelected(region);
  status.textContent = 'Selected: ' + option.displayName + ' (+' + option.callingCode + ')';
}

search.addEventListener('input', () => regions.search(search.value));
search.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    moveActive(event.key === 'ArrowDown' ? 1 : -1);
    return;
  }
  if (event.key === 'Enter' && activeRegion !== null) {
    event.preventDefault();
    select(activeRegion);
  }
});
list.addEventListener('click', (event) => {
  const row = event.target.closest('li');
  if (row) select(row.dataset.region);
});

// A new option set moves the cursor to the first row, which lets Enter pick the top match.
regions.subscribe((state) => {
  renderList(state);
  setActive(state.options.length > 0 ? state.options[0].region : null);
});

// The subscription fires only on later changes; render the initial state manually.
renderList(regions.getState());
status.textContent = 'Selected: United States (+1)';

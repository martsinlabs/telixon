import { ensureEngineReady, getCallingCodeForRegion } from '@telixon/core';
import { createPhoneInput, createRegionList, regionToFlagEmoji } from '@telixon/web-sdk';

await ensureEngineReady();

// Elements of the field and its popup.
const root = document.querySelector('#complete-field');
const trigger = root.querySelector('.phone-field-region');
const flag = root.querySelector('.phone-field-flag');
const code = root.querySelector('.phone-field-code');
const input = root.querySelector('#phone-field-input');
const status = root.querySelector('.phone-field-status');
const popup = root.querySelector('.phone-field-menu');
const control = root.querySelector('.phone-field-control');
const search = root.querySelector('.phone-field-search');
const list = root.querySelector('ul');

// The picker and the phone are independent machines.
const regions = createRegionList({
  prioritize: ['US', 'CA', 'GB'],
  dataFactory: ({ region }) => regionToFlagEmoji(region),
});

const phone = createPhoneInput({
  mode: 'international',
  defaultRegion: 'US',
  display: { callingCodeInInput: false },
  input,
});

// The selected region in one shared shape.
function regionOption(region) {
  return { region, callingCode: getCallingCodeForRegion(region), data: regionToFlagEmoji(region) };
}

let selected = regionOption('US');

function renderTrigger() {
  flag.textContent = selected.data;
  code.textContent = '+' + selected.callingCode;
}

// Full rebuild when the search changes the option set.
function renderList(state) {
  list.replaceChildren(
    ...state.options.map((option) => {
      const row = document.createElement('li');
      row.id = 'phone-field-option-' + option.region;
      row.dataset.region = option.region;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(option.region === selected.region));

      const rowFlag = document.createElement('span');
      rowFlag.textContent = option.data;
      const rowName = document.createElement('span');
      rowName.textContent = option.displayName;
      const rowCode = document.createElement('span');
      rowCode.className = 'phone-field-option-code';
      rowCode.textContent = '+' + option.callingCode;

      row.append(rowFlag, rowName, rowCode);
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

function renderStatus(state) {
  input.placeholder = state.placeholder ?? '';

  if (state.value === '') {
    status.textContent = 'Type a number.';
    status.dataset.tone = '';
    return;
  }

  if (state.validationError === null) {
    status.textContent = 'Valid: ' + phone.getPhoneNumber().formatE164();
    status.dataset.tone = 'valid';
    return;
  }

  status.textContent = state.validationError.kind;
  status.dataset.tone = 'error';
}

// Reflect the chosen region in the button and the list.
function applySelection(region) {
  selected = regionOption(region);
  renderTrigger();
  markSelected(region);
}

// Under a shared calling code the digits decide the region, so follow it.
function followResolvedRegion(region) {
  if (region === null || region === selected.region) return;
  applySelection(region);
}

// Flip the popup above the field when the viewport below cannot fit it.
function positionPopup() {
  popup.style.bottom = '';
  const controlRect = control.getBoundingClientRect();
  const needed = popup.offsetHeight + 8;
  if (window.innerHeight - controlRect.bottom < needed && controlRect.top > needed) {
    popup.style.bottom = `${root.offsetHeight - control.offsetTop + 6}px`;
  }
}

function openPopup() {
  popup.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  search.value = '';
  regions.search('');
  list.scrollTop = 0;
  positionPopup();
  setActive(selected.region);
  search.focus({ preventScroll: true });
}

function closePopup() {
  popup.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  setActive(null);
}

// The only bridge from the picker to the phone.
function select(region) {
  applySelection(region);
  phone.setRegion(region);
  closePopup();
  input.focus();
}

trigger.addEventListener('click', () => (popup.hidden ? openPopup() : closePopup()));
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
root.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !popup.hidden) {
    closePopup();
    trigger.focus();
  }
});
// Dismiss on the press itself, so releasing a text-selection drag outside never closes the popup.
// In a framework component, remove this document listener on unmount, next to each machine's destroy.
function dismissOnOutsidePress(event) {
  if (!popup.hidden && !root.contains(event.target)) closePopup();
}
document.addEventListener('pointerdown', dismissOnOutsidePress);
// Tabbing out of the widget closes the popup; a null relatedTarget means a click, which the handlers above own.
root.addEventListener('focusout', (event) => {
  if (!popup.hidden && event.relatedTarget && !root.contains(event.relatedTarget)) closePopup();
});

// A new option set moves the cursor to the first row, so Enter picks the top match.
regions.subscribe((state) => {
  renderList(state);
  setActive(state.options.length > 0 ? state.options[0].region : null);
});
phone.subscribe((state) => {
  followResolvedRegion(state.region);
  renderStatus(state);
});

// The subscriptions fire only on later changes, so render the initial state manually.
renderTrigger();
renderList(regions.getState());
renderStatus(phone.getState());

import { ensureEngineReady } from '@telixon/core';
import { attachRegionPicker, createPhoneInput, createRegionList, createRegionPicker } from '@telixon/web-sdk';
import { flagTransform } from '@telixon/web-sdk/flags';

await ensureEngineReady();

// The field holds the region button with its flag and calling code, the input, and the status line.
const root = document.querySelector('#complete-field');
const control = root.querySelector('.phone-field-control');
const trigger = root.querySelector('.phone-field-region');
const flag = trigger.querySelector('.tlx-flag__image');
const code = trigger.querySelector('.phone-field-code');
const input = root.querySelector('#phone-field-input');
const status = root.querySelector('.phone-field-status');

// The popup holds the search box and the list.
const popup = root.querySelector('.phone-field-menu');
const search = root.querySelector('.phone-field-search');
const listbox = root.querySelector('ul');

// Three headless widgets. The phone owns the region, which the picker follows.
const regions = createRegionList({ prioritize: ['US', 'CA', 'GB'] });

const phone = createPhoneInput({
  mode: 'international',
  defaultRegion: 'US',
  display: { callingCodeInInput: false },
  input,
});

const picker = createRegionPicker({ regions, phone });

// One sprite cell. The transform brings the region's flag into view.
function flagCell(region) {
  const cell = document.createElement('span');
  cell.className = 'tlx-flag';
  cell.setAttribute('aria-hidden', 'true');
  const image = document.createElement('span');
  image.className = 'tlx-flag__image';
  image.style.transform = flagTransform(region);
  cell.append(image);
  return cell;
}

// A row is a flag, a name, and a calling code. The adapter adds the option attributes.
function renderOption(option) {
  const row = document.createElement('li');
  const name = document.createElement('span');
  name.textContent = option.displayName;
  const rowCode = document.createElement('span');
  rowCode.className = 'phone-field-option-code';
  rowCode.textContent = '+' + option.callingCode;
  row.append(flagCell(option.region), name, rowCode);
  return row;
}

// Shown when the search matches nothing.
function renderEmpty() {
  const row = document.createElement('li');
  row.className = 'phone-field-empty';
  row.textContent = 'No matches';
  return row;
}

// The button shows the selected region. An empty selection shows the neutral cell.
function renderTrigger(selected) {
  flag.style.transform = flagTransform(selected === null ? null : selected.region);
  code.textContent = selected === null ? '' : '+' + selected.callingCode;
}

// The adapter wires the DOM and hands focus back to the input after a pick.
attachRegionPicker({
  picker,
  trigger,
  popup,
  search,
  listbox,
  renderOption,
  renderEmpty,
  renderTrigger,
  returnFocusTo: input,
});

// Flip the popup above the field when the viewport below cannot fit it. The adapter subscribed
// first, which leaves the popup visible and measurable here.
function positionPopup() {
  popup.style.bottom = '';
  const controlRect = control.getBoundingClientRect();
  const needed = popup.offsetHeight + 8;
  if (window.innerHeight - controlRect.bottom < needed && controlRect.top > needed) {
    popup.style.bottom = `${root.offsetHeight - control.offsetTop + 6}px`;
  }
}

// Once per opening. Later emits while open, such as typing in the search box, leave the position alone.
let wasOpen = false;
picker.subscribe((state) => {
  if (state.open && !wasOpen) positionPopup();
  wasOpen = state.open;
});

// The placeholder and the status line follow the phone.
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

phone.subscribe(renderStatus);

// The subscription fires only on later changes; render the initial state manually.
renderStatus(phone.getState());

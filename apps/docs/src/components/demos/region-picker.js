import { ensureEngineReady } from '@telixon/core';
import { attachRegionPicker, createRegionList, createRegionPicker } from '@telixon/web-sdk';
import { flagTransform } from '@telixon/web-sdk/flags';

await ensureEngineReady();

// The button with its flag and name, the popup with the search box and the list, and the status line.
const root = document.querySelector('#region-picker');
const trigger = root.querySelector('.region-picker-trigger');
const flag = trigger.querySelector('.tlx-flag__image');
const name = trigger.querySelector('.region-picker-name');
const popup = root.querySelector('.region-picker-menu');
const search = root.querySelector('.region-picker-search');
const listbox = root.querySelector('ul');
const status = root.querySelector('.region-picker-status');

// The list is the material. The picker holds the open state, the keyboard cursor, and the selection.
const regions = createRegionList({ prioritize: ['US', 'CA', 'GB'] });
const picker = createRegionPicker({ regions });

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
  const rowName = document.createElement('span');
  rowName.textContent = option.displayName;
  const code = document.createElement('span');
  code.className = 'region-picker-code';
  code.textContent = '+' + option.callingCode;
  row.append(flagCell(option.region), rowName, code);
  return row;
}

// Shown when the search matches nothing.
function renderEmpty() {
  const row = document.createElement('li');
  row.className = 'region-picker-empty';
  row.textContent = 'No matches';
  return row;
}

// The button and the status line show the selection.
function renderTrigger(selected) {
  flag.style.transform = flagTransform(selected === null ? null : selected.region);
  name.textContent = selected === null ? 'Select a region' : selected.displayName;
  status.textContent =
    selected === null ? 'Nothing selected.' : `Selected: ${selected.displayName} (+${selected.callingCode})`;
}

// Start on the United States. Without a phone, the picker keeps the selection itself.
picker.select('US');

// The adapter wires the DOM. renderTrigger runs once now and again on every change of the selection.
attachRegionPicker({ picker, trigger, popup, search, listbox, renderOption, renderEmpty, renderTrigger });

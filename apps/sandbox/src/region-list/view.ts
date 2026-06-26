import type { RegionListState, RegionOption } from '@telixon/web-sdk';
import { countEl, optionsEl, stateEl } from './elements';

export function render(state: RegionListState): void {
  countEl.textContent = String(state.options.length);

  optionsEl.replaceChildren();
  for (const option of state.options) {
    optionsEl.appendChild(renderRow(option));
  }

  stateEl.textContent = JSON.stringify(
    {
      locale: state.locale,
      regionFilter: state.regionFilter,
      numberTypeFilter: state.numberTypeFilter,
      searchQuery: state.searchQuery,
      optionsCount: state.options.length,
    },
    null,
    2,
  );
}

function renderRow(option: RegionOption): HTMLLIElement {
  const li: HTMLLIElement = document.createElement('li');
  li.className = 'option-row';

  const code: HTMLSpanElement = document.createElement('span');
  code.className = 'option-code';
  code.textContent = option.region;

  const name: HTMLSpanElement = document.createElement('span');
  name.className = 'option-name';
  name.textContent = option.displayName;

  const calling: HTMLSpanElement = document.createElement('span');
  calling.className = 'option-calling';
  calling.textContent = `+${option.callingCode}`;

  li.append(code, name, calling);
  return li;
}

export type PhoneFieldDom = {
  root: HTMLDivElement;
  input: HTMLInputElement;
  regionBtn: HTMLButtonElement | null;
  regionFlag: HTMLSpanElement | null;
  regionDial: HTMLSpanElement | null;
  dropdown: HTMLDivElement | null;
  search: HTMLInputElement | null;
  options: HTMLUListElement | null;
};

export function buildPhoneFieldDom(opts: { withSelector: boolean }): PhoneFieldDom {
  const root: HTMLDivElement = document.createElement('div');
  root.className = 'phone-field';

  let regionBtn: HTMLButtonElement | null = null;
  let regionFlag: HTMLSpanElement | null = null;
  let regionDial: HTMLSpanElement | null = null;
  let dropdown: HTMLDivElement | null = null;
  let search: HTMLInputElement | null = null;
  let options: HTMLUListElement | null = null;

  if (opts.withSelector) {
    regionBtn = document.createElement('button');
    regionBtn.type = 'button';
    regionBtn.className = 'phone-field-region';
    regionBtn.setAttribute('aria-haspopup', 'listbox');
    regionBtn.setAttribute('aria-expanded', 'false');

    regionFlag = document.createElement('span');
    regionFlag.className = 'phone-field-flag';

    regionDial = document.createElement('span');
    regionDial.className = 'phone-field-dial';

    const chevron: HTMLSpanElement = document.createElement('span');
    chevron.className = 'phone-field-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '▾';

    regionBtn.append(regionFlag, regionDial, chevron);
    root.appendChild(regionBtn);
  }

  const input: HTMLInputElement = document.createElement('input');
  input.className = 'phone-field-input';
  input.type = 'tel';
  input.inputMode = 'tel';
  input.autocomplete = 'tel';
  input.spellcheck = false;
  root.appendChild(input);

  if (opts.withSelector) {
    dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    dropdown.hidden = true;

    const searchWrap: HTMLDivElement = document.createElement('div');
    searchWrap.className = 'dropdown-search';

    search = document.createElement('input');
    search.className = 'control';
    search.type = 'text';
    search.placeholder = 'Search region or code…';
    search.autocomplete = 'off';
    search.spellcheck = false;

    searchWrap.appendChild(search);

    options = document.createElement('ul');
    options.className = 'option-list option-list--interactive';
    options.setAttribute('role', 'listbox');

    dropdown.append(searchWrap, options);
    root.appendChild(dropdown);
  }

  return { root, input, regionBtn, regionFlag, regionDial, dropdown, search, options };
}

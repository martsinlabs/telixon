export type PhoneFieldDom = {
  root: HTMLDivElement;
  input: HTMLInputElement;
  countryBtn: HTMLButtonElement | null;
  countryFlag: HTMLSpanElement | null;
  countryDial: HTMLSpanElement | null;
  dropdown: HTMLDivElement | null;
  search: HTMLInputElement | null;
  options: HTMLUListElement | null;
};

export function buildPhoneFieldDom(opts: { withSelector: boolean; placeholder?: string }): PhoneFieldDom {
  const root: HTMLDivElement = document.createElement('div');
  root.className = 'phone-field';

  let countryBtn: HTMLButtonElement | null = null;
  let countryFlag: HTMLSpanElement | null = null;
  let countryDial: HTMLSpanElement | null = null;
  let dropdown: HTMLDivElement | null = null;
  let search: HTMLInputElement | null = null;
  let options: HTMLUListElement | null = null;

  if (opts.withSelector) {
    countryBtn = document.createElement('button');
    countryBtn.type = 'button';
    countryBtn.className = 'phone-field-country';
    countryBtn.setAttribute('aria-haspopup', 'listbox');
    countryBtn.setAttribute('aria-expanded', 'false');

    countryFlag = document.createElement('span');
    countryFlag.className = 'phone-field-flag';

    countryDial = document.createElement('span');
    countryDial.className = 'phone-field-dial';

    const chevron: HTMLSpanElement = document.createElement('span');
    chevron.className = 'phone-field-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '▾';

    countryBtn.append(countryFlag, countryDial, chevron);
    root.appendChild(countryBtn);
  }

  const input: HTMLInputElement = document.createElement('input');
  input.className = 'phone-field-input';
  input.type = 'tel';
  input.inputMode = 'tel';
  input.autocomplete = 'tel';
  input.spellcheck = false;
  input.placeholder = opts.placeholder ?? '';
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
    search.placeholder = 'Search country or code…';
    search.autocomplete = 'off';
    search.spellcheck = false;

    searchWrap.appendChild(search);

    options = document.createElement('ul');
    options.className = 'option-list option-list--interactive';
    options.setAttribute('role', 'listbox');

    dropdown.append(searchWrap, options);
    root.appendChild(dropdown);
  }

  return { root, input, countryBtn, countryFlag, countryDial, dropdown, search, options };
}

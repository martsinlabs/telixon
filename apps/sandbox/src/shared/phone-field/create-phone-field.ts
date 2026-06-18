import { getCallingCodeForCountry, type RegionId } from '@telixon/core';
import {
  createCountryList,
  createPhoneInput,
  type CountryList,
  type CountryListState,
  type CountryOption,
  type PhoneInput,
  type PhoneInputListener,
  type PhoneInputState,
} from '@telixon/web-sdk';
import { isCountryId } from '../guards';
import { buildPhoneFieldDom, type PhoneFieldDom } from './dom';
import { flagEmoji } from './flag';

/**
 * National-mode phone field. Country is chosen via the selector (or fixed when `showSelector: false`)
 * and the input holds only national digits formatted with the country's national mask.
 */
export type NationalPhoneFieldOptions = {
  mode: 'national';
  country: RegionId;
  initialValue?: string;
  showSelector?: boolean;
  countryFilter?: readonly RegionId[];
};

/**
 * International-mode phone field with the calling code embedded in the input value.
 *
 * - `display: 'plus'`: input starts with `+` (e.g. `+1 201-555-0123`).
 * - `display: 'no-plus'`: input starts with the calling code digits (e.g. `1 201-555-0123`).
 *
 * No separate selector is rendered; the country is resolved live from the typed calling code.
 */
export type InternationalEmbeddedOptions = {
  mode: 'international';
  display: 'plus' | 'no-plus';
  defaultCountry?: RegionId;
  initialValue?: string;
};

/**
 * International-mode phone field with the calling code rendered outside the input (in the selector).
 * The input holds the national digits formatted with the international body mask
 * (e.g. `201-555-0123`, no parens). `defaultCountry` is required because there is no calling code in
 * the input to resolve from.
 */
export type InternationalSplitOptions = {
  mode: 'international';
  display: 'split';
  defaultCountry: RegionId;
  showSelector?: boolean;
  countryFilter?: readonly RegionId[];
  initialValue?: string;
};

export type PhoneFieldOptions = NationalPhoneFieldOptions | InternationalEmbeddedOptions | InternationalSplitOptions;

/**
 * Handle returned by {@link createPhoneField}. Wraps the underlying `PhoneInput` controller and
 * owns the rendered DOM root so the caller can mount, observe, and destroy as a single unit.
 */
export type PhoneFieldHandle = {
  /** Root element to mount into the page. */
  root: HTMLDivElement;
  /** The underlying headless controller; expose its full API for callers that need more than read access. */
  phone: PhoneInput;
  /** Read the current PhoneInput state without subscribing. */
  getState(): PhoneInputState;
  /** Subscribe to PhoneInput state changes. Returns an unsubscribe function. */
  subscribe(listener: PhoneInputListener): () => void;
  /** Detach all DOM listeners, destroy the PhoneInput controller, and remove the root from the DOM. */
  destroy(): void;
};

/**
 * Build a self-contained phone-input UI: a styled input bound to a Telixon `PhoneInput` controller,
 * with an optional country selector dropdown wired via `CountryList`.
 *
 * The factory chooses the right `PhoneInput` configuration from the discriminated `options` union
 * and decides whether to render the selector based on the mode:
 *
 * - National: selector rendered by default; pass `showSelector: false` to hide.
 * - International embedded (`display: 'plus' | 'no-plus'`): no selector (calling code is in the input).
 * - International split (`display: 'split'`): selector rendered by default; pass `showSelector: false` to hide.
 */
export function createPhoneField(options: PhoneFieldOptions): PhoneFieldHandle {
  const showSelector: boolean = resolveShowSelector(options);

  const dom: PhoneFieldDom = buildPhoneFieldDom({ withSelector: showSelector });

  const phone: PhoneInput = buildPhoneController(options, dom.input);

  dom.input.placeholder = phone.getState().placeholder ?? '';
  const unsubscribePlaceholder: () => void = phone.subscribe((state: PhoneInputState) => {
    dom.input.placeholder = state.placeholder ?? '';
  });

  let selectorCleanup: (() => void) | null = null;

  if (showSelector) {
    const initialCountry: RegionId = resolveInitialCountry(options);
    const countryFilter: readonly RegionId[] | undefined =
      'countryFilter' in options ? options.countryFilter : undefined;

    selectorCleanup = wireSelector({
      dom,
      phone,
      initialCountry,
      ...(countryFilter !== undefined && { countryFilter }),
    });
  }

  return {
    root: dom.root,
    phone,
    getState: () => phone.getState(),
    subscribe: (listener: PhoneInputListener) => phone.subscribe(listener),
    destroy: () => {
      unsubscribePlaceholder();
      selectorCleanup?.();
      phone.destroy();
      dom.root.remove();
    },
  };
}

function resolveShowSelector(options: PhoneFieldOptions): boolean {
  if (options.mode === 'national') return options.showSelector !== false;
  if (options.display === 'split') return options.showSelector !== false;
  return false;
}

function resolveInitialCountry(options: PhoneFieldOptions): RegionId {
  if (options.mode === 'national') return options.country;
  if (options.display === 'split') return options.defaultCountry;
  throw new Error('resolveInitialCountry: only called when a selector is rendered (national or split)');
}

function buildPhoneController(options: PhoneFieldOptions, input: HTMLInputElement): PhoneInput {
  if (options.mode === 'national') {
    return createPhoneInput({
      mode: 'national',
      country: options.country,
      input,
      ...(options.initialValue !== undefined && { initialValue: options.initialValue }),
    });
  }

  if (options.display === 'split') {
    return createPhoneInput({
      mode: 'international',
      display: { callingCodeInInput: false },
      defaultCountry: options.defaultCountry,
      input,
      ...(options.initialValue !== undefined && { initialValue: options.initialValue }),
    });
  }

  return createPhoneInput({
    mode: 'international',
    display: { callingCodeInInput: true, plusPrefix: options.display === 'plus' },
    input,
    ...(options.defaultCountry !== undefined && { defaultCountry: options.defaultCountry }),
    ...(options.initialValue !== undefined && { initialValue: options.initialValue }),
  });
}

type SelectorWiringOptions = {
  dom: PhoneFieldDom;
  phone: PhoneInput;
  initialCountry: RegionId;
  countryFilter?: readonly RegionId[];
};

function wireSelector({ dom, phone, initialCountry, countryFilter }: SelectorWiringOptions): () => void {
  const { countryBtn, countryFlag, countryDial, dropdown, search, options } = dom;
  if (
    countryBtn === null ||
    countryFlag === null ||
    countryDial === null ||
    dropdown === null ||
    search === null ||
    options === null
  ) {
    throw new Error('wireSelector: called with a DOM that has no selector elements');
  }

  const list: CountryList = createCountryList({
    sort: 'alphabetical',
    countryFilter: countryFilter ?? null,
  });

  let selectedCountry: RegionId = initialCountry;
  let open: boolean = false;

  updateCountryButton(selectedCountry);
  renderOptions(list.getState());

  const unsubscribeList: () => void = list.subscribe(renderOptions);
  const unsubscribePhone: () => void = phone.subscribe((state: PhoneInputState) => {
    if (state.country !== null && state.country !== selectedCountry) {
      selectedCountry = state.country;
      updateCountryButton(selectedCountry);
      renderOptions(list.getState());
    }
  });

  const handleButtonClick = (): void => (open ? close() : openDropdown());
  const handleSearchInput = (): void => list.search(search.value);
  const handleDocClick = (event: MouseEvent): void => {
    if (!open) return;
    if (event.target instanceof Node && dom.root.contains(event.target)) return;
    close();
  };
  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && open) {
      close();
      countryBtn.focus();
    }
  };

  countryBtn.addEventListener('click', handleButtonClick);
  search.addEventListener('input', handleSearchInput);
  document.addEventListener('click', handleDocClick);
  document.addEventListener('keydown', handleKeydown);

  return () => {
    countryBtn.removeEventListener('click', handleButtonClick);
    search.removeEventListener('input', handleSearchInput);
    document.removeEventListener('click', handleDocClick);
    document.removeEventListener('keydown', handleKeydown);
    unsubscribeList();
    unsubscribePhone();
    list.destroy();
  };

  function openDropdown(): void {
    open = true;
    dropdown!.hidden = false;
    countryBtn!.setAttribute('aria-expanded', 'true');
    search!.value = '';
    list.search('');
    search!.focus();
  }

  function close(): void {
    open = false;
    dropdown!.hidden = true;
    countryBtn!.setAttribute('aria-expanded', 'false');
  }

  function selectCountry(country: RegionId): void {
    selectedCountry = country;
    phone.setCountry(country);
    updateCountryButton(country);
    renderOptions(list.getState());
    close();
    dom.input.focus();
  }

  function updateCountryButton(country: RegionId): void {
    countryFlag!.textContent = flagEmoji(country);
    countryDial!.textContent = `+${getCallingCodeForCountry(country)}`;
  }

  function renderOptions(state: CountryListState): void {
    options!.replaceChildren();
    for (const option of state.options) {
      options!.appendChild(renderOptionRow(option));
    }
  }

  function renderOptionRow(option: CountryOption): HTMLLIElement {
    const li: HTMLLIElement = document.createElement('li');
    li.className = 'option-row option-row--clickable';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(option.country === selectedCountry));
    if (option.country === selectedCountry) li.classList.add('option-row--active');

    const flag: HTMLSpanElement = document.createElement('span');
    flag.className = 'option-flag';
    flag.textContent = flagEmoji(option.country);

    const name: HTMLSpanElement = document.createElement('span');
    name.className = 'option-name';
    name.textContent = option.displayName;

    const dial: HTMLSpanElement = document.createElement('span');
    dial.className = 'option-calling';
    dial.textContent = `+${option.callingCode}`;

    li.append(flag, name, dial);
    li.addEventListener('click', () => {
      if (!isCountryId(option.country)) return;
      selectCountry(option.country);
    });

    return li;
  }
}

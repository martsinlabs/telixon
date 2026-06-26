import { getCallingCodeForRegion, type RegionCode } from '@telixon/core';
import {
  createPhoneInput,
  createRegionList,
  regionToFlagEmoji,
  type PhoneInput,
  type PhoneInputListener,
  type PhoneInputState,
  type RegionList,
  type RegionListState,
  type RegionOption,
} from '@telixon/web-sdk';
import { isRegionId } from '../guards';
import { buildPhoneFieldDom, type PhoneFieldDom } from './dom';

/**
 * National-mode phone field. Region is chosen via the selector (or fixed when `showSelector: false`)
 * and the input holds only national digits formatted with the region's national mask.
 */
export type NationalPhoneFieldOptions = {
  mode: 'national';
  defaultRegion: RegionCode;
  initialValue?: string;
  showSelector?: boolean;
  regionFilter?: readonly RegionCode[];
};

/**
 * International-mode phone field with the calling code embedded in the input value.
 *
 * - `display: 'plus'`: input starts with `+` (e.g. `+1 201-555-0123`).
 * - `display: 'no-plus'`: input starts with the calling code digits (e.g. `1 201-555-0123`).
 *
 * No separate selector is rendered; the region is resolved live from the typed calling code.
 */
export type InternationalEmbeddedOptions = {
  mode: 'international';
  display: 'plus' | 'no-plus';
  defaultRegion?: RegionCode;
  initialValue?: string;
};

/**
 * International-mode phone field with the calling code rendered outside the input (in the selector).
 * The input holds the national digits formatted with the international body mask
 * (e.g. `201-555-0123`, no parens). `defaultRegion` is required because there is no calling code in
 * the input to resolve from.
 */
export type InternationalSplitOptions = {
  mode: 'international';
  display: 'split';
  defaultRegion: RegionCode;
  showSelector?: boolean;
  regionFilter?: readonly RegionCode[];
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
 * with an optional region selector dropdown wired via `RegionList`.
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
    const initialRegion: RegionCode = resolveInitialRegion(options);
    const regionFilter: readonly RegionCode[] | undefined =
      'regionFilter' in options ? options.regionFilter : undefined;

    selectorCleanup = wireSelector({
      dom,
      phone,
      initialRegion,
      ...(regionFilter !== undefined && { regionFilter }),
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

function resolveInitialRegion(options: PhoneFieldOptions): RegionCode {
  if (options.mode === 'national') return options.defaultRegion;
  if (options.display === 'split') return options.defaultRegion;
  throw new Error('resolveInitialRegion: only called when a selector is rendered (national or split)');
}

function buildPhoneController(options: PhoneFieldOptions, input: HTMLInputElement): PhoneInput {
  if (options.mode === 'national') {
    return createPhoneInput({
      mode: 'national',
      defaultRegion: options.defaultRegion,
      input,
      ...(options.initialValue !== undefined && { initialValue: options.initialValue }),
    });
  }

  if (options.display === 'split') {
    return createPhoneInput({
      mode: 'international',
      display: { callingCodeInInput: false },
      defaultRegion: options.defaultRegion,
      input,
      ...(options.initialValue !== undefined && { initialValue: options.initialValue }),
    });
  }

  return createPhoneInput({
    mode: 'international',
    display: { callingCodeInInput: true, plusPrefix: options.display === 'plus' },
    input,
    ...(options.defaultRegion !== undefined && { defaultRegion: options.defaultRegion }),
    ...(options.initialValue !== undefined && { initialValue: options.initialValue }),
  });
}

type SelectorWiringOptions = {
  dom: PhoneFieldDom;
  phone: PhoneInput;
  initialRegion: RegionCode;
  regionFilter?: readonly RegionCode[];
};

function wireSelector({ dom, phone, initialRegion, regionFilter }: SelectorWiringOptions): () => void {
  const { regionBtn, regionFlag, regionDial, dropdown, search, options } = dom;
  if (
    regionBtn === null ||
    regionFlag === null ||
    regionDial === null ||
    dropdown === null ||
    search === null ||
    options === null
  ) {
    throw new Error('wireSelector: called with a DOM that has no selector elements');
  }

  const list: RegionList = createRegionList({
    sort: 'alphabetical',
    regionFilter: regionFilter ?? null,
  });

  let selectedRegion: RegionCode = initialRegion;
  let open: boolean = false;

  updateRegionButton(selectedRegion);
  renderOptions(list.getState());

  const unsubscribeList: () => void = list.subscribe(renderOptions);
  const unsubscribePhone: () => void = phone.subscribe((state: PhoneInputState) => {
    if (state.region !== null && state.region !== selectedRegion) {
      selectedRegion = state.region;
      updateRegionButton(selectedRegion);
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
      regionBtn.focus();
    }
  };

  regionBtn.addEventListener('click', handleButtonClick);
  search.addEventListener('input', handleSearchInput);
  document.addEventListener('click', handleDocClick);
  document.addEventListener('keydown', handleKeydown);

  return () => {
    regionBtn.removeEventListener('click', handleButtonClick);
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
    regionBtn!.setAttribute('aria-expanded', 'true');
    search!.value = '';
    list.search('');
    search!.focus();
  }

  function close(): void {
    open = false;
    dropdown!.hidden = true;
    regionBtn!.setAttribute('aria-expanded', 'false');
  }

  function selectRegion(region: RegionCode): void {
    selectedRegion = region;
    phone.setRegion(region);
    updateRegionButton(region);
    renderOptions(list.getState());
    close();
    dom.input.focus();
  }

  function updateRegionButton(region: RegionCode): void {
    regionFlag!.textContent = regionToFlagEmoji(region);
    regionDial!.textContent = `+${getCallingCodeForRegion(region)}`;
  }

  function renderOptions(state: RegionListState): void {
    options!.replaceChildren();
    for (const option of state.options) {
      options!.appendChild(renderOptionRow(option));
    }
  }

  function renderOptionRow(option: RegionOption): HTMLLIElement {
    const li: HTMLLIElement = document.createElement('li');
    li.className = 'option-row option-row--clickable';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(option.region === selectedRegion));
    if (option.region === selectedRegion) li.classList.add('option-row--active');

    const flag: HTMLSpanElement = document.createElement('span');
    flag.className = 'option-flag';
    flag.textContent = regionToFlagEmoji(option.region);

    const name: HTMLSpanElement = document.createElement('span');
    name.className = 'option-name';
    name.textContent = option.displayName;

    const dial: HTMLSpanElement = document.createElement('span');
    dial.className = 'option-calling';
    dial.textContent = `+${option.callingCode}`;

    li.append(flag, name, dial);
    li.addEventListener('click', () => {
      if (!isRegionId(option.region)) return;
      selectRegion(option.region);
    });

    return li;
  }
}

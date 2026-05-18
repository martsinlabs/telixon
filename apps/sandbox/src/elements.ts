export function el<T extends Element>(selector: string, Type: { new (): T }): T {
  const found = document.querySelector(selector);
  if (!(found instanceof Type)) throw new Error(`Missing element: ${selector}`);
  return found;
}

export const modeEl = el('#mode', HTMLSelectElement);
export const countryEl = el('#country', HTMLInputElement);
export const initialValueEl = el('#initial-value', HTMLInputElement);
export const phoneInputEl = el('#phone-input', HTMLInputElement);
export const applyInitialValueBtn = el('#apply-initial-value', HTMLButtonElement);
export const applyCountryBtn = el('#apply-country', HTMLButtonElement);
export const setValueBtn = el('#set-value', HTMLButtonElement);
export const clearValueBtn = el('#clear-value', HTMLButtonElement);
export const countryFilterEl = el('#country-filter', HTMLInputElement);
export const numberTypeFilterEl = el('#number-type-filter', HTMLDivElement);
export const applyFiltersBtn = el('#apply-filters', HTMLButtonElement);
export const clearFiltersBtn = el('#clear-filters', HTMLButtonElement);
export const strictEl = el('#strict', HTMLInputElement);
export const undoBtn = el('#undo', HTMLButtonElement);
export const redoBtn = el('#redo', HTMLButtonElement);
export const sealBtn = el('#seal', HTMLButtonElement);
export const reattachBtn = el('#reattach', HTMLButtonElement);
export const stateEl = el('#state', HTMLPreElement);
export const eventsEl = el('#events', HTMLPreElement);
export const warningEl = el('#warning', HTMLParagraphElement);

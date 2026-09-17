/** The element carrying the combobox role. The search field owns it, or the trigger without one. */
export function comboboxHost(trigger: HTMLButtonElement, search: HTMLInputElement | null): HTMLElement {
  return search ?? trigger;
}

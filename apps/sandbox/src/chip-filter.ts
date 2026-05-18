export type ChipFilterOption<T extends string> = {
  value: T;
  label: string;
};

export type ChipFilterConfig<T extends string> = {
  options: readonly ChipFilterOption<T>[];
  onChange?: (selected: T[]) => void;
};

export type ChipFilter<T extends string> = {
  getValues(): T[];
  setValues(values: readonly T[]): void;
};

export function createChipFilter<T extends string>(container: HTMLElement, config: ChipFilterConfig<T>): ChipFilter<T> {
  const selected = new Set<T>();
  const chipElements = new Map<T, HTMLButtonElement>();

  container.classList.add('chip-filter');
  container.replaceChildren();

  for (const opt of config.options) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = opt.label;
    chip.addEventListener('click', () => toggleValue(opt.value));
    chipElements.set(opt.value, chip);
    container.appendChild(chip);
  }

  return {
    getValues: () => Array.from(selected),
    setValues: (values: readonly T[]) => {
      selected.clear();
      for (const value of values) selected.add(value);
      render();
    },
  };

  function render(): void {
    for (const [value, el] of chipElements) {
      el.classList.toggle('chip--selected', selected.has(value));
    }
  }

  function toggleValue(value: T): void {
    if (selected.has(value)) selected.delete(value);
    else selected.add(value);
    render();
    config.onChange?.(Array.from(selected));
  }
}

import type { RegionOption } from '../region-list/models';
import type { AttachRegionPickerOptions, RegionPickerAttachment } from './models';
import { bindPickerEvents } from './utils/bind-picker-events';
import { createElementIds, type ElementIds } from './utils/element-ids';
import { createOptionRows, type OptionRows } from './utils/option-rows';
import { createPickerRenderer, type PickerRenderer } from './utils/picker-renderer';
import { markComboboxHost, markListbox, markSearchField, markTrigger } from './utils/static-attributes';

/**
 * Wire a trigger, a popup with an optional search field, and a listbox to a region picker.
 *
 * Clicks, keys, typing, pointer moves, outside presses, and focus leaving flow in. The popup's
 * `hidden`, the rows, the option and combobox attributes, the cursor, the search field's value, and
 * focus flow out. The adapter builds no elements of its own. Rows come from `renderOption` and the
 * empty element from `renderEmpty`. The trigger's content, the styling, and the popup's position
 * stay with the caller.
 */
export function attachRegionPicker<T = undefined>(options: AttachRegionPickerOptions<T>): RegionPickerAttachment {
  const { picker, trigger, popup, listbox, renderOption } = options;
  const search: HTMLInputElement | null = options.search ?? null;
  const renderTrigger: ((selected: RegionOption<T> | null) => void) | null = options.renderTrigger ?? null;
  const renderEmpty: (() => HTMLElement) | null = options.renderEmpty ?? null;
  const returnFocusTo: HTMLElement = options.returnFocusTo ?? trigger;
  const autoFocus: boolean = options.autoFocus ?? true;
  // The search field is the combobox host. Without one the trigger takes that part.
  const host: HTMLElement = search ?? trigger;

  const ids: ElementIds = createElementIds(listbox.id);
  markTrigger(trigger, ids.listbox);
  markComboboxHost(host, ids.listbox);
  if (search !== null) markSearchField(search);
  markListbox(listbox, ids.listbox);

  const rows: OptionRows<T> = createOptionRows({ listbox, renderOption, renderEmpty, optionId: ids.option });
  const renderer: PickerRenderer<T> = createPickerRenderer({
    trigger,
    popup,
    host,
    search,
    listbox,
    rows,
    renderTrigger,
    autoFocus,
  });
  const unbindEvents: () => void = bindPickerEvents({
    picker,
    trigger,
    popup,
    search,
    listbox,
    rows,
    renderer,
    returnFocusTo,
  });
  const unsubscribe: () => void = picker.subscribe(renderer.render);
  renderer.render(picker.getState());

  let isDestroyed: boolean = false;

  return {
    destroy(): void {
      if (isDestroyed) return;
      isDestroyed = true;
      unsubscribe();
      unbindEvents();
    },
  };
}

import type { RegionOption } from '../region-list/models';
import { bindRegionPicker } from './bind-region-picker';
import type { AttachRegionPickerOptions, RegionPickerAttachment, RegionPickerBinding } from './models';
import { createOptionRows, type OptionRows } from './utils/option-rows';
import { createPickerRenderer, type PickerRenderer } from './utils/picker-renderer';

/**
 * Wire a trigger, a popup with an optional search field, and a listbox to a region picker.
 *
 * Clicks, keys, typing, pointer moves, outside presses, and focus leaving flow in. The popup's
 * `hidden`, the rows, the option and combobox attributes, the cursor, the search field's value, and
 * focus flow out. The adapter builds no elements of its own. Rows come from `renderOption` and the
 * empty element from `renderEmpty`. The trigger's content, the styling, and the popup's position
 * stay with the caller.
 *
 * It is {@link bindRegionPicker} with the rendering on top.
 */
export function attachRegionPicker<T = undefined>(options: AttachRegionPickerOptions<T>): RegionPickerAttachment {
  const { picker, trigger, popup, listbox, renderOption } = options;
  const search: HTMLInputElement | null = options.search ?? null;
  const renderTrigger: ((selected: RegionOption<T> | null) => void) | null = options.renderTrigger ?? null;
  const renderEmpty: (() => HTMLElement) | null = options.renderEmpty ?? null;
  const autoFocus: boolean = options.autoFocus ?? true;

  // Every field the binding reads is already part of these options.
  const binding: RegionPickerBinding = bindRegionPicker(options);

  const rows: OptionRows<T> = createOptionRows({ listbox, renderOption, renderEmpty, optionId: binding.ids.option });
  const renderer: PickerRenderer<T> = createPickerRenderer({
    trigger,
    popup,
    search,
    listbox,
    rows,
    renderTrigger,
    revealCursor: binding.revealCursor,
    autoFocus,
  });
  const unsubscribe: () => void = picker.subscribe(renderer.render);
  renderer.render(picker.getState());

  let isDestroyed: boolean = false;

  return {
    destroy(): void {
      if (isDestroyed) return;
      isDestroyed = true;
      unsubscribe();
      binding.destroy();
    },
  };
}

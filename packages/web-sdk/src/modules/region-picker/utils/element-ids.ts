import type { RegionCode } from '@telixon/core';
import { LISTBOX_ID_PREFIX, OPTION_ID_PREFIX } from '../constants/element-ids';
import type { RegionPickerElementIds } from '../models';

// Every binding gets its own number, which keeps row ids unique across the pickers on a page.
let bindingCount: number = 0;

/** Ids for one binding. A listbox that already carries an id keeps it. */
export function createElementIds(existingListboxId: string): RegionPickerElementIds {
  const binding: number = ++bindingCount;

  return {
    listbox: existingListboxId === '' ? `${LISTBOX_ID_PREFIX}-${binding}` : existingListboxId,
    option: (region: RegionCode): string => `${OPTION_ID_PREFIX}-${binding}-${region}`,
  };
}

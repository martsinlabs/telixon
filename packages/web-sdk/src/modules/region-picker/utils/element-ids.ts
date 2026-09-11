import type { RegionCode } from '@telixon/core';
import { LISTBOX_ID_PREFIX, OPTION_ID_PREFIX } from '../constants/element-ids';

/** The ids one attachment writes, which `aria-controls` and `aria-activedescendant` point at. */
export type ElementIds = {
  readonly listbox: string;
  option(region: RegionCode): string;
};

// Every attachment gets its own number, which keeps row ids unique across the pickers on a page.
let attachmentCount: number = 0;

/** Ids for one attachment. A listbox that already carries an id keeps it. */
export function createElementIds(existingListboxId: string): ElementIds {
  const attachment: number = ++attachmentCount;

  return {
    listbox: existingListboxId === '' ? `${LISTBOX_ID_PREFIX}-${attachment}` : existingListboxId,
    option: (region: RegionCode): string => `${OPTION_ID_PREFIX}-${attachment}-${region}`,
  };
}

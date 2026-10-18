import type { RegionListSort } from '@telixon/web-sdk';
import { REGION_PICKER_TAG } from '../../constants/tag-names';
import { SORT_ATTRIBUTE } from '../constants/attributes';
import { ALPHABETICAL_SORT, CALLING_CODE_SORT } from '../constants/sort';

/** The row order the `sort` attribute names. Absent means alphabetical. */
export function readSort(value: string | null): RegionListSort {
  if (value === null || value === ALPHABETICAL_SORT) return ALPHABETICAL_SORT;
  if (value === CALLING_CODE_SORT) return CALLING_CODE_SORT;
  throw new TypeError(`<${REGION_PICKER_TAG}> does not accept ${SORT_ATTRIBUTE}="${value}".`);
}

import type { PickerListOptions } from './picker-connection';

/** Whether two sets of list options build the same list. The priority regions compare item by item. */
export function sameListOptions(a: PickerListOptions, b: PickerListOptions): boolean {
  if (a.sort !== b.sort || a.prioritize.length !== b.prioritize.length) return false;
  return a.prioritize.every((region, index) => region === b.prioritize[index]);
}

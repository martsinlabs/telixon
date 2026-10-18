import { ROLE_ATTRIBUTE } from '../../constants/aria';
import { EMPTY_CLASS } from '../constants/classes';
import { STATUS_ROLE } from '../constants/markup';
import { EMPTY_PART, PART_ATTRIBUTE } from '../constants/parts';

/** The element shown in the listbox while no region matches the search. */
export function renderEmpty(document: Document, text: string): HTMLElement {
  const empty: HTMLDivElement = document.createElement('div');
  empty.className = EMPTY_CLASS;
  empty.setAttribute(PART_ATTRIBUTE, EMPTY_PART);
  empty.setAttribute(ROLE_ATTRIBUTE, STATUS_ROLE);
  empty.textContent = text;
  return empty;
}

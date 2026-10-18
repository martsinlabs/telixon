import { LISTBOX_CLASS, POPUP_CLASS, SEARCH_CLASS, TRIGGER_CLASS } from '../constants/classes';
import {
  AUTOCAPITALIZE_ATTRIBUTE,
  AUTOCAPITALIZE_NONE,
  AUTOCOMPLETE_ATTRIBUTE,
  AUTOCOMPLETE_OFF,
  BUTTON_TYPE,
  MANUAL_POPOVER,
  POPOVER_ATTRIBUTE,
  SPELLCHECK_ATTRIBUTE,
  SPELLCHECK_OFF,
  TEXT_TYPE,
  TYPE_ATTRIBUTE,
} from '../constants/markup';
import { LISTBOX_PART, PART_ATTRIBUTE, POPUP_PART, SEARCH_PART, TRIGGER_PART } from '../constants/parts';

/** The elements of the picker, built once inside its shadow root. */
export type PickerMarkup = {
  readonly trigger: HTMLButtonElement;
  readonly popup: HTMLElement;
  readonly search: HTMLInputElement;
  readonly listbox: HTMLElement;
};

/**
 * Builds the trigger, the popup, the search field, and the listbox inside `root`. The shadow root
 * keeps them out of the page's own markup, which a framework hydrating the page never sees.
 */
export function buildPickerMarkup(root: ShadowRoot): PickerMarkup {
  const document: Document = root.ownerDocument;

  const trigger: HTMLButtonElement = document.createElement('button');
  trigger.className = TRIGGER_CLASS;
  trigger.setAttribute(PART_ATTRIBUTE, TRIGGER_PART);
  trigger.setAttribute(TYPE_ATTRIBUTE, BUTTON_TYPE);

  const popup: HTMLDivElement = document.createElement('div');
  popup.className = POPUP_CLASS;
  popup.setAttribute(PART_ATTRIBUTE, POPUP_PART);
  popup.setAttribute(POPOVER_ATTRIBUTE, MANUAL_POPOVER);
  popup.hidden = true;

  const search: HTMLInputElement = document.createElement('input');
  search.className = SEARCH_CLASS;
  search.setAttribute(PART_ATTRIBUTE, SEARCH_PART);
  search.setAttribute(TYPE_ATTRIBUTE, TEXT_TYPE);
  search.setAttribute(AUTOCOMPLETE_ATTRIBUTE, AUTOCOMPLETE_OFF);
  search.setAttribute(AUTOCAPITALIZE_ATTRIBUTE, AUTOCAPITALIZE_NONE);
  search.setAttribute(SPELLCHECK_ATTRIBUTE, SPELLCHECK_OFF);

  const listbox: HTMLUListElement = document.createElement('ul');
  listbox.className = LISTBOX_CLASS;
  listbox.setAttribute(PART_ATTRIBUTE, LISTBOX_PART);

  popup.append(search, listbox);
  root.append(trigger, popup);
  return { trigger, popup, search, listbox };
}

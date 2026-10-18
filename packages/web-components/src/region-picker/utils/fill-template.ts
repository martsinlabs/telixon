import type { RegionCode } from '@telixon/core';
import type { RegionOption } from '@telixon/web-sdk';
import { FLAG_TAG } from '../../constants/tag-names';
import { FLAG_REGION_ATTRIBUTE } from '../../flag';
import {
  CALLING_CODE_FIELD,
  CALLING_CODE_PREFIX,
  DISPLAY_NAME_FIELD,
  FIELD_ATTRIBUTE,
  FIELD_SELECTOR,
  REGION_FIELD,
} from '../constants/markup';

function fieldText(field: string | null, region: RegionCode | null, option: RegionOption | null): string | null {
  if (field === DISPLAY_NAME_FIELD) return option?.displayName ?? '';
  if (field === CALLING_CODE_FIELD) return option === null ? '' : `${CALLING_CODE_PREFIX}${option.callingCode}`;
  if (field === REGION_FIELD) return region ?? '';
  return null;
}

/**
 * A copy of a template's content with the region filled in. Elements marked `data-field` get the
 * region's name, calling code, or code as text. `telixon-flag` elements get its region.
 */
export function fillTemplate(
  template: HTMLTemplateElement,
  region: RegionCode | null,
  option: RegionOption | null,
): DocumentFragment {
  const content: DocumentFragment = template.ownerDocument.importNode(template.content, true);
  for (const element of content.querySelectorAll<HTMLElement>(FIELD_SELECTOR)) {
    const text: string | null = fieldText(element.getAttribute(FIELD_ATTRIBUTE), region, option);
    if (text !== null) element.textContent = text;
  }
  for (const flag of content.querySelectorAll<HTMLElement>(FLAG_TAG)) {
    if (region === null) flag.removeAttribute(FLAG_REGION_ATTRIBUTE);
    else flag.setAttribute(FLAG_REGION_ATTRIBUTE, region);
  }
  return content;
}

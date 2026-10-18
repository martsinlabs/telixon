import type { RegionCode } from '@telixon/core';
import type { RegionOption } from '@telixon/web-sdk';
import { ARIA_HIDDEN_ATTRIBUTE, ARIA_HIDDEN_VALUE } from '../../constants/aria';
import { FLAG_TAG } from '../../constants/tag-names';
import { FLAG_REGION_ATTRIBUTE } from '../../flag';
import { CALLING_CODE_CLASS, CHEVRON_CLASS } from '../constants/classes';
import { CALLING_CODE_PREFIX } from '../constants/markup';
import { CALLING_CODE_PART, CHEVRON_PART, PART_ATTRIBUTE } from '../constants/parts';
import type { TelixonRenderTrigger } from '../models';
import { exposeFlags } from './expose-flags';
import { fillTemplate } from './fill-template';

/** The default trigger content, with the flag, the calling code where the field keeps it out of its text, and a chevron. */
export function renderDefaultTrigger(
  document: Document,
  region: RegionCode | null,
  option: RegionOption | null,
  withCallingCode: boolean,
): DocumentFragment {
  const content: DocumentFragment = document.createDocumentFragment();

  const flag: HTMLElement = document.createElement(FLAG_TAG);
  if (region !== null) flag.setAttribute(FLAG_REGION_ATTRIBUTE, region);
  content.append(flag);

  if (withCallingCode && option !== null) {
    const callingCode: HTMLSpanElement = document.createElement('span');
    callingCode.className = CALLING_CODE_CLASS;
    callingCode.setAttribute(PART_ATTRIBUTE, CALLING_CODE_PART);
    callingCode.textContent = `${CALLING_CODE_PREFIX}${option.callingCode}`;
    content.append(callingCode);
  }

  const chevron: HTMLSpanElement = document.createElement('span');
  chevron.className = CHEVRON_CLASS;
  chevron.setAttribute(PART_ATTRIBUTE, CHEVRON_PART);
  chevron.setAttribute(ARIA_HIDDEN_ATTRIBUTE, ARIA_HIDDEN_VALUE);
  content.append(chevron);
  return content;
}

/** The trigger content in force, which is the property, then the `<template slot="trigger">`, then the default. */
export function triggerContent(
  document: Document,
  property: TelixonRenderTrigger | null,
  template: HTMLTemplateElement | null,
  region: RegionCode | null,
  option: RegionOption | null,
  withCallingCode: boolean,
): Node {
  const content: Node =
    property !== null
      ? property(region, option)
      : template !== null
        ? fillTemplate(template, region, option)
        : renderDefaultTrigger(document, region, option, withCallingCode);
  exposeFlags(content);
  return content;
}

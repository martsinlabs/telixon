import type { RegionOption } from '@telixon/web-sdk';
import { FLAG_TAG } from '../../constants/tag-names';
import { FLAG_REGION_ATTRIBUTE } from '../../flag';
import { OPTION_CALLING_CODE_CLASS, OPTION_CLASS, OPTION_NAME_CLASS } from '../constants/classes';
import { CALLING_CODE_PREFIX } from '../constants/markup';
import { OPTION_CALLING_CODE_PART, OPTION_NAME_PART, OPTION_PART, PART_ATTRIBUTE } from '../constants/parts';
import type { TelixonRenderOption } from '../models';
import { exposeFlags } from './expose-flags';
import { fillTemplate } from './fill-template';

/** The default row, with the flag, the region's name, and its calling code. */
export function renderDefaultOption(document: Document, option: RegionOption): HTMLElement {
  const row: HTMLLIElement = document.createElement('li');
  row.className = OPTION_CLASS;
  row.setAttribute(PART_ATTRIBUTE, OPTION_PART);

  const flag: HTMLElement = document.createElement(FLAG_TAG);
  flag.setAttribute(FLAG_REGION_ATTRIBUTE, option.region);

  const name: HTMLSpanElement = document.createElement('span');
  name.className = OPTION_NAME_CLASS;
  name.setAttribute(PART_ATTRIBUTE, OPTION_NAME_PART);
  name.textContent = option.displayName;

  const callingCode: HTMLSpanElement = document.createElement('span');
  callingCode.className = OPTION_CALLING_CODE_CLASS;
  callingCode.setAttribute(PART_ATTRIBUTE, OPTION_CALLING_CODE_PART);
  callingCode.textContent = `${CALLING_CODE_PREFIX}${option.callingCode}`;

  row.append(flag, name, callingCode);
  return row;
}

/** A row from a `<template slot="option">`, its content filled with the region. */
export function renderTemplateOption(template: HTMLTemplateElement, option: RegionOption): HTMLElement {
  const row: HTMLLIElement = template.ownerDocument.createElement('li');
  row.className = OPTION_CLASS;
  row.setAttribute(PART_ATTRIBUTE, OPTION_PART);
  row.append(fillTemplate(template, option.region, option));
  return row;
}

/** The row renderer in force, which is the property, then the template, then the default. Every row leaves with its flags exposed. */
export function optionRenderer(
  document: Document,
  property: TelixonRenderOption | null,
  template: HTMLTemplateElement | null,
): TelixonRenderOption {
  const render: TelixonRenderOption =
    property !== null
      ? property
      : template !== null
        ? (option: RegionOption): HTMLElement => renderTemplateOption(template, option)
        : (option: RegionOption): HTMLElement => renderDefaultOption(document, option);
  return (option: RegionOption): HTMLElement => {
    const row: HTMLElement = render(option);
    exposeFlags(row);
    return row;
  };
}

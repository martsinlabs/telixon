import { LANG_ATTRIBUTE, LANG_SELECTOR } from '../constants/attributes';

/**
 * The locale of the region names, in the order of the arguments. The `locale` attribute wins, then
 * the closest `lang` around the picker, then the browser's language.
 */
export function resolveLocale(attribute: string | null, host: Element): string {
  if (attribute !== null && attribute !== '') return attribute;
  const lang: string | null = host.closest(LANG_SELECTOR)?.getAttribute(LANG_ATTRIBUTE) ?? null;
  if (lang !== null && lang !== '') return lang;
  return navigator.language;
}

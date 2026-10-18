import { REGION_PICKER_TAG } from '../../constants/tag-names';

/** The selector as given, once the browser has parsed it. A selector it rejects throws at the author's call. */
export function validateSelector(selector: string, attribute: string, document: Document): string {
  try {
    document.createElement('div').matches(selector);
  } catch {
    throw new TypeError(`<${REGION_PICKER_TAG}> does not accept ${attribute}="${selector}", which is not a selector.`);
  }
  return selector;
}

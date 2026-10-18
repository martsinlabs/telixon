import { TelixonPhoneFieldElement } from '../../phone-field';

function elementById(host: Element, id: string | null): Element | null {
  if (id === null || id === '') return null;
  const root: Node = host.getRootNode();
  if (root instanceof Document || root instanceof ShadowRoot) return root.getElementById(id);
  return null;
}

function fieldAround(element: Element | null): TelixonPhoneFieldElement | null {
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    if (node instanceof TelixonPhoneFieldElement) return node;
  }
  return null;
}

/**
 * The phone field a picker belongs to, in the order of the arguments. The `forElement` property
 * wins, then the element the `for` attribute names by id, then the closest field around the picker
 * itself. An element inside a field, such as its input, stands for the field.
 */
export function resolveTarget(
  forElement: Element | null,
  forAttribute: string | null,
  host: Element,
): TelixonPhoneFieldElement | null {
  if (forElement !== null) return fieldAround(forElement);
  if (forAttribute !== null) return fieldAround(elementById(host, forAttribute));
  return fieldAround(host.parentElement);
}

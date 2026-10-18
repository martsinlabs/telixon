type FieldListener = () => void;

// The channel between a phone field and the pickers that follow it, kept out of the public surface.
const LISTENERS_BY_FIELD: WeakMap<Element, Set<FieldListener>> = new WeakMap();

/**
 * Hear when `field` changes what a picker follows, which is its widget, or its options while no
 * widget exists yet. Returns the function that stops listening.
 */
export function subscribeToField(field: Element, listener: FieldListener): () => void {
  let listeners: Set<FieldListener> | undefined = LISTENERS_BY_FIELD.get(field);
  if (listeners === undefined) {
    listeners = new Set();
    LISTENERS_BY_FIELD.set(field, listeners);
  }
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

/** Tell the listeners of `field` to read it again. A listener that throws is reported and never stops the field. */
export function announceFieldChange(field: Element): void {
  const listeners: Set<FieldListener> | undefined = LISTENERS_BY_FIELD.get(field);
  if (listeners === undefined) return;
  for (const listener of listeners) {
    try {
      listener();
    } catch (error: unknown) {
      reportError(error);
    }
  }
}

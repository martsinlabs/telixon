/** Add a typed listener and return the function that removes it. */
export function listen<K extends keyof GlobalEventHandlersEventMap>(
  target: GlobalEventHandlers,
  type: K,
  handler: (event: GlobalEventHandlersEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void {
  target.addEventListener(type, handler, options);
  return (): void => target.removeEventListener(type, handler, options);
}

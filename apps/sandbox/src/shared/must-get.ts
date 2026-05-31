export function mustGet<T extends Element>(selector: string, Type: { new (): T }): T {
  const found = document.querySelector(selector);
  if (!(found instanceof Type)) throw new Error(`Missing element: ${selector}`);
  return found;
}

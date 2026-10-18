/**
 * Registers `constructor` under `tag`. A tag already registered with the same class is left alone,
 * while a tag registered with another class throws, which surfaces a second copy of the package.
 */
export function defineElement(tag: string, constructor: CustomElementConstructor): void {
  const registered: CustomElementConstructor | undefined = customElements.get(tag);
  if (registered === constructor) return;
  if (registered !== undefined) throw new Error(`<${tag}> is already defined by another class.`);
  customElements.define(tag, constructor);
}

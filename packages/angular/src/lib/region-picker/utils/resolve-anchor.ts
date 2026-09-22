/**
 * The element a list lines up with. A selector names the closest ancestor of the picker that matches
 * it, which reaches the box a form field draws around the picker. Without a match the picker anchors itself.
 */
export function resolveAnchor(host: HTMLElement, anchor: HTMLElement | string | undefined): HTMLElement | undefined {
  if (typeof anchor !== 'string') return anchor;
  return host.closest<HTMLElement>(anchor) ?? undefined;
}

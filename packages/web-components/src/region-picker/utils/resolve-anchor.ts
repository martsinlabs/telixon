/**
 * The element a list lines up with. A selector names the closest ancestor of the picker that matches
 * it, which reaches the box a form field draws around the picker. Without a match the picker anchors itself.
 */
export function resolveAnchor(anchor: HTMLElement | string | null, host: HTMLElement): HTMLElement | null {
  if (typeof anchor !== 'string') return anchor;
  return host.closest<HTMLElement>(anchor);
}

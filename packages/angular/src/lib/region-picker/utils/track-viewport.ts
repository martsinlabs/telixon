/**
 * Calls back when the page scrolls or the window resizes, which is when a popup in the top layer
 * has to follow its anchor. Scrolling inside `ignored` does not count. Returns the function that stops it.
 */
export function trackViewport(view: Window, ignored: Node, onChange: () => void): () => void {
  function handleScroll(event: Event): void {
    if (event.target instanceof Node && ignored.contains(event.target)) return;
    onChange();
  }

  // Scroll events do not bubble. The capture phase sees the scroll of every ancestor.
  view.addEventListener('scroll', handleScroll, { capture: true, passive: true });
  view.addEventListener('resize', onChange);

  return (): void => {
    view.removeEventListener('scroll', handleScroll, { capture: true });
    view.removeEventListener('resize', onChange);
  };
}

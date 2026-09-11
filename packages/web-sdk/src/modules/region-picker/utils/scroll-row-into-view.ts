/** Bring a row inside the listbox's own scroll box. `scrollIntoView` would drag every ancestor along. */
export function scrollRowIntoView(listbox: HTMLElement, row: HTMLElement): void {
  const rowRect: DOMRect = row.getBoundingClientRect();
  const listRect: DOMRect = listbox.getBoundingClientRect();
  if (rowRect.height === 0 || listRect.height === 0) return;

  if (rowRect.top < listRect.top) listbox.scrollTop += rowRect.top - listRect.top;
  else if (rowRect.bottom > listRect.bottom) listbox.scrollTop += rowRect.bottom - listRect.bottom;
}

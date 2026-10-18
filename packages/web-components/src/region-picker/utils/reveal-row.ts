/** Scrolls the listbox alone until `row` is in view, which leaves the page where it was. */
export function revealRow(listbox: HTMLElement, row: HTMLElement): void {
  const rowBox: DOMRect = row.getBoundingClientRect();
  const listBox: DOMRect = listbox.getBoundingClientRect();
  if (rowBox.top < listBox.top) listbox.scrollTop += rowBox.top - listBox.top;
  else if (rowBox.bottom > listBox.bottom) listbox.scrollTop += rowBox.bottom - listBox.bottom;
}

// One constructed sheet per document and text, shared by every shadow root that adopts it.
const SHEETS_BY_DOCUMENT: WeakMap<Document, Map<string, CSSStyleSheet>> = new WeakMap();

function sheetFor(document: Document, text: string): CSSStyleSheet | null {
  const view: (Window & typeof globalThis) | null = document.defaultView;
  if (view === null) return null;
  let sheets: Map<string, CSSStyleSheet> | undefined = SHEETS_BY_DOCUMENT.get(document);
  if (sheets === undefined) {
    sheets = new Map();
    SHEETS_BY_DOCUMENT.set(document, sheets);
  }
  const cached: CSSStyleSheet | undefined = sheets.get(text);
  if (cached !== undefined) return cached;
  const sheet: CSSStyleSheet = new view.CSSStyleSheet();
  sheet.replaceSync(text);
  sheets.set(text, sheet);
  return sheet;
}

/**
 * Gives a shadow root the stylesheet built from `text`, or `null` while its document has no window
 * to build one in. Rules of the page on `::part()` outrank it.
 */
export function adoptStylesheet(root: ShadowRoot, text: string): CSSStyleSheet | null {
  const sheet: CSSStyleSheet | null = sheetFor(root.ownerDocument, text);
  if (sheet !== null) root.adoptedStyleSheets = [sheet];
  return sheet;
}

import {
  formatNumber,
  FormattingDirection,
  NationalPrefixRules,
  normalizeNationalNumber,
  PhoneNumberFormattingContext,
} from '@telixon/core/engine';

/**
 * Maps the typed digits onto the digit characters of the rendered value.
 *
 * Some masks write literal digits into the rendering and some regions hide a typed digit, so the
 * two streams can differ. The alignment tells edits which typed digits stand behind each rendered
 * digit character.
 */
export interface DigitAlignment {
  /** Start of the typed range behind each rendered digit character. */
  readonly typedStartByRenderedDigit: readonly number[];
  /** End of the typed range behind each rendered digit character; equals the start for a mask literal. */
  readonly typedEndByRenderedDigit: readonly number[];
  /** Rendered digit count that places the caret for each typed caret position. */
  readonly renderedDigitCountByTypedBoundary: readonly number[];
}

const ZERO_CHAR_CODE = 48;
const NINE_CHAR_CODE = 57;

function isDigitCharCode(charCode: number): boolean {
  return charCode >= ZERO_CHAR_CODE && charCode <= NINE_CHAR_CODE;
}

/** Counts the digit characters of `value` strictly before `position`. */
export function countDigitsBefore(value: string, position: number): number {
  const limit: number = Math.max(0, Math.min(position, value.length));
  let count = 0;
  for (let index = 0; index < limit; index++) {
    if (isDigitCharCode(value.charCodeAt(index))) count++;
  }
  return count;
}

function collectRenderedDigitPositions(formatted: string): number[] {
  const positions: number[] = [];
  for (let index = 0; index < formatted.length; index++) {
    if (isDigitCharCode(formatted.charCodeAt(index))) positions.push(index);
  }
  return positions;
}

// The display caret for every typed boundary, read from the engine's single normalize pass.
function displayBoundariesByTyped(
  typedDigits: string,
  displayDigits: string,
  prefixRules: NationalPrefixRules | undefined,
): number[] {
  if (typedDigits === displayDigits || prefixRules === undefined) {
    const boundaries: number[] = new Array<number>(typedDigits.length + 1);
    for (let index = 0; index <= typedDigits.length; index++) boundaries[index] = index;
    return boundaries;
  }

  return normalizeNationalNumber(typedDigits, prefixRules, 0, undefined, true).displayCaretByTyped!;
}

/**
 * Builds the alignment for one rendered state. Returns `null` when the typed digits and the
 * rendered digit characters already match one to one (the common case).
 */
export function buildDigitAlignment(
  typedDigits: string,
  context: PhoneNumberFormattingContext,
  formatted: string,
  prefixRules: NationalPrefixRules | undefined,
  direction: FormattingDirection,
): DigitAlignment | null {
  const displayDigits: string = context.nationalNumber;
  const renderedDigitPositions: number[] = collectRenderedDigitPositions(formatted);

  // No alignment is needed while the rendered digit characters equal the typed digits exactly.
  let renderedDigits = '';
  for (const position of renderedDigitPositions) renderedDigits += formatted[position];
  if (renderedDigits === typedDigits) return null;

  // The engine records where each display digit landed during its single format walk.
  const positionByDisplay: number[] = formatNumber(context, 0, direction, true).digitPositions ?? [];

  const displayByRenderedPosition = new Map<number, number>();
  for (let displayIndex = 0; displayIndex < positionByDisplay.length; displayIndex++) {
    if (positionByDisplay[displayIndex]! >= 0)
      displayByRenderedPosition.set(positionByDisplay[displayIndex]!, displayIndex);
  }

  const displayBoundaries: number[] = displayBoundariesByTyped(typedDigits, displayDigits, prefixRules);

  // The typed digits standing behind each display digit.
  const typedStartByDisplay: number[] = new Array<number>(displayDigits.length).fill(typedDigits.length);
  const typedEndByDisplay: number[] = new Array<number>(displayDigits.length).fill(typedDigits.length);
  for (let displayIndex = 0; displayIndex < displayDigits.length; displayIndex++) {
    let start: number = typedDigits.length;
    let end: number = typedDigits.length;
    for (let typedIndex = 0; typedIndex < typedDigits.length; typedIndex++) {
      const covers: boolean =
        displayBoundaries[typedIndex]! <= displayIndex && displayIndex < displayBoundaries[typedIndex + 1]!;
      if (covers && start === typedDigits.length) start = typedIndex;
      if (covers) end = typedIndex + 1;
    }
    typedStartByDisplay[displayIndex] = start === typedDigits.length ? end : start;
    typedEndByDisplay[displayIndex] = end;
  }

  const typedStartByRenderedDigit: number[] = [];
  const typedEndByRenderedDigit: number[] = [];
  const displayByRenderedDigit: number[] = [];
  let lastTypedEnd = 0;
  for (const position of renderedDigitPositions) {
    const displayIndex: number | undefined = displayByRenderedPosition.get(position);
    if (displayIndex === undefined) {
      // A mask literal has no typed digits behind it.
      typedStartByRenderedDigit.push(lastTypedEnd);
      typedEndByRenderedDigit.push(lastTypedEnd);
      displayByRenderedDigit.push(-1);
      continue;
    }
    const start: number = Math.max(lastTypedEnd, typedStartByDisplay[displayIndex]!);
    const end: number = Math.max(start, typedEndByDisplay[displayIndex]!);
    typedStartByRenderedDigit.push(start);
    typedEndByRenderedDigit.push(end);
    displayByRenderedDigit.push(displayIndex);
    lastTypedEnd = end;
  }

  const renderedDigitCountByTypedBoundary: number[] = new Array<number>(typedDigits.length + 1);
  for (let typedBoundary = 0; typedBoundary <= typedDigits.length; typedBoundary++) {
    const displayBoundary: number = displayBoundaries[typedBoundary]!;
    if (displayBoundary === 0) {
      renderedDigitCountByTypedBoundary[typedBoundary] = 0;
      continue;
    }
    let count: number = renderedDigitPositions.length;
    for (let renderedIndex = 0; renderedIndex < displayByRenderedDigit.length; renderedIndex++) {
      const displayIndex: number = displayByRenderedDigit[renderedIndex]!;
      if (displayIndex !== -1 && displayIndex >= displayBoundary) {
        count = renderedIndex;
        break;
      }
    }
    renderedDigitCountByTypedBoundary[typedBoundary] = count;
  }

  return { typedStartByRenderedDigit, typedEndByRenderedDigit, renderedDigitCountByTypedBoundary };
}

/**
 * Maps a selection in the rendered value onto the typed digits. A range that starts at the field
 * start also covers the typed digits the rendering hides in front.
 */
export function typedRangeForSelection(
  alignment: DigitAlignment | null,
  typedLength: number,
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { start: number; end: number } {
  const digitStart: number = countDigitsBefore(value, selectionStart);
  const digitEnd: number = countDigitsBefore(value, selectionEnd);

  if (alignment === null) {
    return { start: Math.min(digitStart, typedLength), end: Math.min(digitEnd, typedLength) };
  }

  const { typedStartByRenderedDigit, typedEndByRenderedDigit } = alignment;
  const renderedCount: number = typedStartByRenderedDigit.length;

  // A collapsed selection is an insertion point. It lands after any hidden digits.
  if (digitEnd <= digitStart) {
    const insertAt: number = digitStart >= renderedCount ? typedLength : typedStartByRenderedDigit[digitStart]!;
    return { start: insertAt, end: insertAt };
  }

  const start: number =
    digitStart === 0 ? 0 : digitStart >= renderedCount ? typedLength : typedEndByRenderedDigit[digitStart - 1]!;

  const end: number = digitEnd >= renderedCount ? typedLength : Math.max(start, typedStartByRenderedDigit[digitEnd]!);
  return { start, end };
}

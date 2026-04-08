import { CallingCodeLayer, getNextGraphState, GraphLayer, isCallingCodeStateTerminal } from '@telixon/core/engine';
import { InputChange, InputResolveContext, InputSnapshot } from '.';

export function resolveInput(value: string, change: InputChange, context: InputResolveContext): InputSnapshot {
  const valueLength: number = value.length;
  const selectionStart: number = Math.max(0, Math.min(change.selectionStart, valueLength));
  const selectionEnd: number = Math.max(selectionStart, Math.min(change.selectionEnd, valueLength));

  let charCode: number;
  let digit: number;

  let digitIndex = 0;
  let graphState = context.callingCode ? context.callingCode.graphState : 0;

  const graphLayer: GraphLayer = context.graphLayer;
  const callingCodeLayer: CallingCodeLayer = context.callingCodeLayer;
  const shouldResolveCallingCode: boolean = !context.callingCode;
  let shouldCheckCallingCode: boolean = shouldResolveCallingCode;

  const digits: number[] = new Array<number>(valueLength + change.insertText.length);
  let splitIndex = -1;

  // ---- BEFORE ----
  for (let index = 0; index < selectionStart; index++) {
    charCode = value.charCodeAt(index);
    digit = charCode - 48;

    if (digit < 0 || digit > 9) continue;

    digits[digitIndex++] = digit;

    graphState = getNextGraphState(graphLayer, graphState, digit);

    if (shouldCheckCallingCode && isCallingCodeStateTerminal(callingCodeLayer, graphState)) {
      splitIndex = digitIndex;
      shouldCheckCallingCode = false;
    }
  }

  // ---- INSERT ----
  for (let index = 0; index < change.insertText.length; index++) {
    charCode = change.insertText.charCodeAt(index);
    digit = charCode - 48;

    if (digit < 0 || digit > 9) continue;

    digits[digitIndex++] = digit;

    graphState = getNextGraphState(graphLayer, graphState, digit);

    if (shouldCheckCallingCode && isCallingCodeStateTerminal(callingCodeLayer, graphState)) {
      splitIndex = digitIndex;
      shouldCheckCallingCode = false;
    }
  }

  const caretPosition = digitIndex;

  // ---- AFTER ----
  for (let index = selectionEnd; index < valueLength; index++) {
    charCode = value.charCodeAt(index);
    digit = charCode - 48;

    if (digit < 0 || digit > 9) continue;

    digits[digitIndex++] = digit;

    graphState = getNextGraphState(graphLayer, graphState, digit);

    if (shouldCheckCallingCode && isCallingCodeStateTerminal(callingCodeLayer, graphState)) {
      splitIndex = digitIndex;
      shouldCheckCallingCode = false;
    }
  }

  // ---- BUILD STRINGS ----
  const allDigits: number[] = digits.slice(0, digitIndex);

  let callingCode: string;
  let nationalNumber: string;

  if (shouldResolveCallingCode) {
    callingCode = splitIndex < 0 ? allDigits.join('') : allDigits.slice(0, splitIndex).join('');
    nationalNumber = splitIndex < 0 ? '' : allDigits.slice(splitIndex).join('');
  } else {
    callingCode = context.callingCode!.value;
    nationalNumber = allDigits.join('');
  }

  return { graphState, callingCode, nationalNumber, caretPosition };
}

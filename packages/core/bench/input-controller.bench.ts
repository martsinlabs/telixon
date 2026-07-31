import { createInternationalInputController, ensureEngineReady, type InputController } from '#dist';
import { afterAll, bench, describe } from 'vitest';
import { consume, flushSink } from './consume';
import { CORPUS } from './corpus';
import './require-fresh-dist';

await ensureEngineReady();

afterAll(flushSink);

const controller: InputController = createInternationalInputController({ initialValue: '' });

function typeFullNumber(numberString: string): { value: string; selectionEnd: number } {
  controller.setValue('');
  controller.clearHistory(); // isolate each number: undo/redo benches must unwind only this number's keystrokes.
  let value: string = '';
  let selectionEnd: number = 0;
  for (let characterIndex = 0; characterIndex < numberString.length; characterIndex++) {
    const state = controller.insert(value, numberString[characterIndex]!, selectionEnd, selectionEnd);
    value = state.value;
    selectionEnd = state.selectionEnd;
  }
  consume(value);
  return { value, selectionEnd };
}

describe('input-controller: type-through full number (corpus pass)', () => {
  bench('insert per keystroke', () => {
    for (const entry of CORPUS) {
      typeFullNumber(entry.e164);
    }
  });
});

describe('input-controller: type-through + core PhoneNumber query methods per keystroke (corpus pass)', () => {
  bench('insert + 7 query methods per keystroke', () => {
    for (const entry of CORPUS) {
      controller.setValue('');
      controller.clearHistory();
      let value: string = '';
      let selectionEnd: number = 0;
      for (let characterIndex = 0; characterIndex < entry.e164.length; characterIndex++) {
        const state = controller.insert(value, entry.e164[characterIndex]!, selectionEnd, selectionEnd);
        value = state.value;
        selectionEnd = state.selectionEnd;
        const phoneNumber = controller.getPhoneNumber();
        consume(phoneNumber.isValid());
        consume(phoneNumber.isPossible());
        consume(phoneNumber.getNumberType());
        consume(phoneNumber.getRegion());
        consume(phoneNumber.getNationalNumber());
        consume(phoneNumber.getCallingCode());
        consume(phoneNumber.formatInternational());
      }
    }
  });
});

describe('input-controller: backspace at caret after full type-through (corpus pass)', () => {
  bench('deleteBackward per keystroke', () => {
    for (const entry of CORPUS) {
      const typed = typeFullNumber(entry.e164);
      let value: string = typed.value;
      let selectionEnd: number = typed.selectionEnd;
      while (selectionEnd > 0) {
        const state = controller.deleteBackward(value, selectionEnd, selectionEnd);
        value = state.value;
        selectionEnd = state.selectionEnd;
      }
    }
  });
});

describe('input-controller: type-through + undo + redo (corpus pass)', () => {
  bench('history cycle per number', () => {
    for (const entry of CORPUS) {
      typeFullNumber(entry.e164);
      controller.undo();
      controller.redo();
    }
  });
});

describe('input-controller: full undo back to empty + redo to full (corpus pass)', () => {
  bench('undo every keystroke, then redo every keystroke', () => {
    for (const entry of CORPUS) {
      typeFullNumber(entry.e164);
      while (controller.canUndo) controller.undo();
      while (controller.canRedo) controller.redo();
    }
  });
});

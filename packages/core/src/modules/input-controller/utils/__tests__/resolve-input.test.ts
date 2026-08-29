import { describe, expect, it } from 'vitest';
import { resolveInput } from '../resolve-input';

function run(value: string, insertText: string, selectionStart: number, selectionEnd: number) {
  let digits = '';
  const caretIndex = resolveInput(value, { insertText, selectionStart, selectionEnd }, (digit) => {
    digits += String(digit);
  });
  return { digits, caretIndex };
}

describe('resolveInput selection semantics', () => {
  it('consumes the selected digits when the inserted text carries none', () => {
    expect(run('123456', '+', 1, 4)).toEqual({ digits: '156', caretIndex: 1 });
  });

  it('consumes the selected digits on a plain deletion', () => {
    expect(run('123456', '', 1, 4)).toEqual({ digits: '156', caretIndex: 1 });
  });

  it('replaces the selected digits with the inserted ones', () => {
    expect(run('123456', '9', 1, 4)).toEqual({ digits: '1956', caretIndex: 2 });
  });

  it('keeps every digit when a digit-less insert lands on a collapsed caret', () => {
    expect(run('123456', '+', 2, 2)).toEqual({ digits: '123456', caretIndex: 2 });
  });

  it('reads formatted values digit-by-digit around the selection', () => {
    expect(run('(415) 555-0132', '9', 6, 9)).toEqual({ digits: '41590132', caretIndex: 4 });
  });
});

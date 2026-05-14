import { describe, expect, it } from 'vitest';
import { InputStateHistory } from '../input-state-history';
import { InputControllerState } from '../models';

function makeState(value: string, country: string | null = null, selectionStart = 0): InputControllerState {
  return {
    value,
    country,
    selectionStart,
    selectionEnd: selectionStart,
    state: 0,
    terminalStates: [],
    profileRef: null,
    formatIndex: null,
  };
}

describe('InputStateHistory.push — de-duplication', () => {
  it('replaces the current entry in place when value and country are unchanged', () => {
    const history = new InputStateHistory(makeState('123'));
    history.push(makeState('123', null, 3));

    expect(history.current.selectionStart).toBe(3);
    expect(history.canUndo).toBe(false);
  });

  it('grows the stack when the value changes', () => {
    const history = new InputStateHistory(makeState('123'));
    history.push(makeState('1234'));

    expect(history.current.value).toBe('1234');
    expect(history.canUndo).toBe(true);
  });

  it('treats a country change as a distinct entry even when value is identical', () => {
    const history = new InputStateHistory(makeState('123', 'US'));
    history.push(makeState('123', 'CA'));

    expect(history.current.country).toBe('CA');
    expect(history.canUndo).toBe(true);
  });
});

describe('InputStateHistory.push — maxSize overflow', () => {
  it('shifts the oldest entry off when capacity is exceeded', () => {
    const history = new InputStateHistory(makeState('a'), 3);
    history.push(makeState('b'));
    history.push(makeState('c'));
    history.push(makeState('d'));

    // Stack should now hold [b, c, d], current = d.
    expect(history.current.value).toBe('d');
    expect(history.canUndo).toBe(true);

    history.undo();
    expect(history.current.value).toBe('c');

    history.undo();
    expect(history.current.value).toBe('b');

    // The original 'a' was shifted out; cannot undo past 'b'.
    expect(history.canUndo).toBe(false);
  });
});

describe('InputStateHistory — invalid maxSize fallback', () => {
  // The constructor falls back to DEFAULT_MAX_HISTORY_SIZE (150) for non-finite or <1 values.
  it.each([
    { name: 'zero', maxSize: 0 },
    { name: 'negative', maxSize: -5 },
    { name: 'NaN', maxSize: Number.NaN },
    { name: 'Infinity', maxSize: Number.POSITIVE_INFINITY },
  ])('uses the default when maxSize is $name', ({ maxSize }) => {
    const history = new InputStateHistory(makeState('seed'), maxSize);

    // Push 200 distinct entries — if the fallback is the 150 default, the oldest 50 should be dropped.
    for (let i = 0; i < 200; i++) {
      history.push(makeState(`v${i}`));
    }

    let undoCount = 0;
    while (history.canUndo) {
      history.undo();
      undoCount++;
    }

    // The exact size is DEFAULT_MAX_HISTORY_SIZE - 1 undo-steps from the most-recent entry.
    expect(undoCount).toBe(149);
  });
});

describe('InputStateHistory.redo / push truncation', () => {
  it('redo replays the most-recent forward entry', () => {
    const history = new InputStateHistory(makeState('a'));
    history.push(makeState('b'));
    history.push(makeState('c'));

    history.undo();
    expect(history.current.value).toBe('b');

    history.redo();
    expect(history.current.value).toBe('c');
  });

  it('redo at the head returns the current entry without moving', () => {
    const history = new InputStateHistory(makeState('a'));
    history.push(makeState('b'));

    expect(history.canRedo).toBe(false);
    const redone = history.redo();

    expect(redone.value).toBe('b');
    expect(history.canRedo).toBe(false);
  });

  it('push after undo truncates the redo branch', () => {
    const history = new InputStateHistory(makeState('a'));
    history.push(makeState('b'));
    history.push(makeState('c'));

    history.undo(); // back to 'b'
    history.push(makeState('x'));

    // 'c' is now unreachable: redo cannot replay it.
    expect(history.canRedo).toBe(false);
    expect(history.current.value).toBe('x');

    history.undo();
    expect(history.current.value).toBe('b');
  });
});

describe('InputStateHistory.updateCurrentSelection', () => {
  it('mutates the current entry without growing the stack', () => {
    const history = new InputStateHistory(makeState('123', null, 0));
    history.push(makeState('1234', null, 4));

    history.updateCurrentSelection(2, 3);

    expect(history.current.selectionStart).toBe(2);
    expect(history.current.selectionEnd).toBe(3);

    history.undo();
    expect(history.current.value).toBe('123');
    expect(history.canRedo).toBe(true);
  });
});

describe('InputStateHistory.seal', () => {
  it('collapses the stack to the current entry only', () => {
    const history = new InputStateHistory(makeState('a'));
    history.push(makeState('b'));
    history.push(makeState('c'));

    expect(history.canUndo).toBe(true);
    history.seal();

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.current.value).toBe('c');
  });

  it('drops both prior and future entries when called from a mid-stack position', () => {
    const history = new InputStateHistory(makeState('a'));
    history.push(makeState('b'));
    history.push(makeState('c'));
    history.undo(); // current = 'b'

    history.seal();

    expect(history.current.value).toBe('b');
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });
});

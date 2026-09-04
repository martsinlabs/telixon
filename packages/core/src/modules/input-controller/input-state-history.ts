import { InputControllerState } from './models';

const DEFAULT_MAX_HISTORY_SIZE = 150;

export class InputStateHistory<State extends InputControllerState = InputControllerState> {
  private stack!: State[];
  private index!: number;
  private readonly maxSize: number;

  constructor(initialState: State, maxSize: number = DEFAULT_MAX_HISTORY_SIZE) {
    this.stack = [initialState];
    this.index = 0;
    this.maxSize = Number.isFinite(maxSize) && maxSize >= 1 ? Math.floor(maxSize) : DEFAULT_MAX_HISTORY_SIZE;
  }

  push(state: State): void {
    const current: State = this.stack[this.index]!;

    if (current.value === state.value && current.region === state.region) {
      this.stack[this.index] = state;
      return;
    }

    if (this.index < this.stack.length - 1) {
      this.stack.length = this.index + 1;
    }

    this.stack.push(state);
    this.index++;

    if (this.stack.length > this.maxSize) {
      this.stack.shift();
      this.index--;
    }
  }

  updateCurrentSelection(selectionStart: number, selectionEnd: number): void {
    const current: State = this.stack[this.index]!;

    // Degenerate callers can hand a selection past the stored value; the stored state stays in bounds.
    const maxIndex: number = current.value.length;
    const start: number = Math.max(0, Math.min(selectionStart, maxIndex));
    const end: number = Math.max(start, Math.min(selectionEnd, maxIndex));

    this.stack[this.index] = {
      ...current,
      selectionStart: start,
      selectionEnd: end,
    };
  }

  replaceCurrent(state: State): void {
    this.stack[this.index] = state;
  }

  undo(): State {
    if (this.index === 0) {
      return this.stack[0]!;
    }

    this.index--;
    return this.stack[this.index]!;
  }

  redo(): State {
    if (this.index >= this.stack.length - 1) {
      return this.stack[this.index]!;
    }

    this.index++;
    return this.stack[this.index]!;
  }

  get current(): State {
    return this.stack[this.index]!;
  }

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  clearHistory(): void {
    this.stack = [this.stack[this.index]!];
    this.index = 0;
  }
}

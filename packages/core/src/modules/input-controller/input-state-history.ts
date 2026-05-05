import { InputControllerState } from './models';

export class InputStateHistory<State extends InputControllerState = InputControllerState> {
  private stack!: State[];
  private index!: number;

  constructor(initialState: State) {
    this.stack = [initialState];
    this.index = 0;
  }

  push(state: State): void {
    if (this.index < this.stack.length - 1) {
      this.stack.length = this.index + 1;
    }

    this.stack.push(state);
    this.index++;
  }

  updateCurrentSelection(selectionStart: number, selectionEnd: number): void {
    const current: State = this.stack[this.index]!;

    this.stack[this.index] = {
      ...current,
      selectionStart,
      selectionEnd,
    };
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
}

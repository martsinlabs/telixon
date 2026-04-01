import { InputControllerState } from "./models";

export class InputStateHistory<
  State extends InputControllerState = InputControllerState
> {
  private stack: State[] = [];
  private index = -1;

  push(state: State) {
    this.stack.length = this.index + 1;

    this.stack.push(state);
    this.index++;
  }

  undo(): State | undefined {
    if (this.index <= 0) return;

    return this.stack[--this.index];
  }

  redo(): State | undefined {
    if (this.index >= this.stack.length - 1) return;

    return this.stack[++this.index];
  }

  get current(): State | undefined {
    return this.stack[this.index];
  }
}

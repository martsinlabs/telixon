import { InputStateHistory } from "./input-state-history";
import { InputController, InputControllerState, InputState } from "./models";
import { toInputState } from "./utils";

export class InternationalInputController extends InputController {
  #history = new InputStateHistory<InputControllerState>();

  insert(
    text: string,
    selectionStart: number,
    selectionEnd: number
  ): InputState {
    return this.#history.current!;
  }

  deleteBackward(selectionStart: number, selectionEnd: number): InputState {
    return this.#history.current!;
  }

  deleteForward(selectionStart: number, selectionEnd: number): InputState {
    return this.#history.current!;
  }

  replaceAll(text: string): InputState {
    return this.#history.current!;
  }

  undo(): InputState | undefined {
    const state: InputControllerState | undefined = this.#history.undo();

    if (!state) return;

    return toInputState(state);
  }

  redo(): InputState | undefined {
    const state: InputControllerState | undefined = this.#history.redo();

    if (!state) return;

    return toInputState(state);
  }
}

import { InputStateHistory } from "../input-state-history";
import { InputController, InputControllerState, InputState } from "../models";
import { toInputState } from "../utils";
import { getResourceProvider } from "@telixon/core/resource-provider";
import { InternationalInputControllerConfig } from "./models";
import { assertResourcesReady } from "@telixon/core/utils/assert-resources-ready";

function createInitialState(
  country: string | null = null
): InputControllerState {
  const { graphLayer } = getResourceProvider();

  return {
    country,
    value: "",
    selectionStart: 0,
    selectionEnd: 0,
    graphStateId: graphLayer.deadStateId,
  };
}

class InternationalInputController extends InputController {
  #history!: InputStateHistory<InputControllerState>;

  constructor(private config: InternationalInputControllerConfig = {}) {
    super();

    const initialState: InputControllerState = createInitialState(
      this.config.initialCountry || null
    );

    this.#history = new InputStateHistory(initialState);
  }

  insert(
    value: string,
    text: string,
    selectionStart: number,
    selectionEnd: number
  ): InputState {
    return this.#history.current!;
  }

  deleteBackward(
    value: string,
    selectionStart: number,
    selectionEnd: number
  ): InputState {
    return this.#history.current!;
  }

  deleteForward(
    value: string,
    selectionStart: number,
    selectionEnd: number
  ): InputState {
    return this.#history.current!;
  }

  setValue(value: string): InputState {
    return this.#history.current!;
  }

  setCountry(country: string): InputState {
    return this.#history.current;
  }

  undo(): InputState {
    return toInputState(this.#history.undo());
  }

  redo(): InputState {
    return toInputState(this.#history.redo());
  }

  get currentState(): InputState {
    return toInputState(this.#history.current);
  }
}

export function createInternationalInputController(
  config: InternationalInputControllerConfig = {}
): InputController {
  assertResourcesReady();

  return new InternationalInputController(config);
}

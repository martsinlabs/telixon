import { getResourceProvider } from '@telixon/core/resource-provider';
import { assertResourcesReady } from '@telixon/core/utils/assert-resources-ready';
import { InputStateHistory } from '../input-state-history';
import { InputController, InputControllerState, InputState } from '../models';
import { toInputState } from '../utils';
import { InternationalInputControllerConfig } from './models';

function createInitialState(country: string | null = null): InputControllerState {
  const { graphLayer } = getResourceProvider();

  return {
    country,
    value: '',
    selectionStart: 0,
    selectionEnd: 0,
    graphStateId: graphLayer.deadStateId,
  };
}

class InternationalInputController extends InputController {
  #history!: InputStateHistory<InputControllerState>;

  constructor(private config: InternationalInputControllerConfig = {}) {
    super();

    const initialState: InputControllerState = createInitialState(this.config.initialCountry || null);

    this.#history = new InputStateHistory(initialState);
  }

  insert(value: string, text: string, selectionStart: number, selectionEnd: number): InputState {
    console.log('insert', { value, text, selectionStart, selectionEnd });
    return this.#history.current!;
  }

  deleteBackward(value: string, selectionStart: number, selectionEnd: number): InputState {
    console.log('deleteBackward', { value, selectionStart, selectionEnd });
    return this.#history.current!;
  }

  deleteForward(value: string, selectionStart: number, selectionEnd: number): InputState {
    console.log('deleteForward', { value, selectionStart, selectionEnd });
    return this.#history.current!;
  }

  setValue(value: string): InputState {
    console.log('setValue', { value });
    return this.#history.current!;
  }

  setCountry(country: string): InputState {
    console.log('setCountry', { country });
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

export function createInternationalInputController(config: InternationalInputControllerConfig = {}): InputController {
  assertResourcesReady();

  return new InternationalInputController(config);
}

import { bench, describe } from 'vitest';
import { InputController, InputState } from '../models';

export interface ControllerBenchSuite {
  readonly setValueInput: string;
  readonly typedInput: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

// Registers the per-keystroke hot-path benchmarks for one controller flavour.
export function registerControllerBenches(
  label: string,
  createController: () => InputController,
  suite: ControllerBenchSuite,
): void {
  describe(label, () => {
    let steadyController: InputController;
    bench(
      'setValue steady state',
      () => {
        steadyController.setValue(suite.setValueInput);
      },
      { setup: () => void (steadyController = createController()) },
    );

    let queryController: InputController;
    bench(
      'getPhoneNumber + queries',
      () => {
        const phoneNumber = queryController.getPhoneNumber();
        phoneNumber.isValid();
        phoneNumber.isPossible();
        phoneNumber.isPossibleWithReason();
      },
      {
        setup: () => {
          queryController = createController();
          queryController.setValue(suite.setValueInput);
        },
      },
    );

    bench('insert input characters', () => {
      const controller = createController();
      let state: InputState = controller.currentState;
      for (let i = 0; i < suite.typedInput.length; i++) {
        state = controller.insert(state.value, suite.typedInput[i]!, state.selectionStart, state.selectionEnd);
      }
    });

    bench('replace selected range', () => {
      const controller = createController();
      const state: InputState = controller.setValue(suite.setValueInput);
      controller.insert(state.value, '99', suite.selectionStart, suite.selectionEnd);
    });

    bench('backspace at caret', () => {
      const controller = createController();
      const state: InputState = controller.setValue(suite.setValueInput);
      controller.deleteBackward(state.value, state.selectionStart, state.selectionEnd);
    });

    bench('delete selected range backward', () => {
      const controller = createController();
      const state: InputState = controller.setValue(suite.setValueInput);
      controller.deleteBackward(state.value, suite.selectionStart, suite.selectionEnd);
    });

    bench('delete selected range forward', () => {
      const controller = createController();
      const state: InputState = controller.setValue(suite.setValueInput);
      controller.deleteForward(state.value, suite.selectionStart, suite.selectionEnd);
    });

    bench('selection delete + undo', () => {
      const controller = createController();
      const state: InputState = controller.setValue(suite.setValueInput);
      controller.deleteBackward(state.value, suite.selectionStart, suite.selectionEnd);
      controller.undo();
    });

    bench('selection delete + undo + redo', () => {
      const controller = createController();
      const state: InputState = controller.setValue(suite.setValueInput);
      controller.deleteBackward(state.value, suite.selectionStart, suite.selectionEnd);
      controller.undo();
      controller.redo();
    });
  });
}

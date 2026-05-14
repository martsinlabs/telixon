import { getResourceProvider } from '@telixon/core/resource-provider';
import { assertResourcesReady } from '@telixon/core/utils/assert-resources-ready';
import { NumberResolver } from '../../number-resolver';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../number-resolver/models';
import { resolveFirstMatchingNumberTypeProfile } from '../../number-resolver/resolve-first-matching-number-type-profile';
import { createCountryFilter, createNumberTypeFilter } from '../../number-resolver/utils/filter-factory';
import { InputStateHistory } from '../input-state-history';
import { InputChange, InputController, InputControllerState, InputState } from '../models';
import { findNextDigitPosition, findPreviousDigitPosition, isFormattingChar, toInputState } from '../utils';
import { resolveInput } from '../utils/resolve-input';
import { InternationalInputControllerConfig } from './models';
import { resolveInternationalControllerState } from './utils';

class InternationalInputController extends InputController {
  #history!: InputStateHistory<InputControllerState>;

  #numberResolver: NumberResolver = new NumberResolver();

  #defaultCountryIndex: number = -1;

  #defaultCallingCode: string | null = null;

  constructor(private config: InternationalInputControllerConfig = {}) {
    super();

    if (this.config.defaultCountry) {
      this.#setDefaultCountry(this.config.defaultCountry);
    }

    if (this.config.strict) {
      this.#numberResolver.setStrict(true);
    }

    const shouldShowCallingCode: boolean = this.config.display?.callingCodeInInput !== false;
    const insertText: string = config.initialValue ?? (shouldShowCallingCode ? (this.#defaultCallingCode ?? '') : '');

    this.#history = new InputStateHistory(
      this.#resolveState('', {
        insertText,
        selectionStart: 0,
        selectionEnd: 0,
      }),
      config.maxHistorySize,
    );
  }

  #setDefaultCountry(country: string): void {
    this.#defaultCountryIndex = getResourceProvider().refMapping.countries.keyToIndex[country] ?? -1;

    this.#defaultCallingCode =
      this.#defaultCountryIndex !== -1
        ? getResourceProvider().territorySpecTable[this.#defaultCountryIndex]!.countryCode
        : null;
  }

  #seedResolver(): void {
    if (this.config.display?.callingCodeInInput === false && this.#defaultCallingCode !== null) {
      this.#numberResolver.setCallingCode(this.#defaultCallingCode);
    } else {
      this.#numberResolver.reset();
    }
  }

  #resolveState(
    value: string,
    change: InputChange,
    direction: 'forward' | 'backward' = 'forward',
  ): InputControllerState {
    const numberResolver: NumberResolver = this.#numberResolver;

    this.#seedResolver();

    const caretIndex: number = resolveInput(value, change, (digit: number) => numberResolver.advance(digit));

    const snapshot: NumberResolverSnapshot = numberResolver.snapshot;
    const anchoredCountryIndex: number = numberResolver.resolveLatestConcreteCountryIndex();

    const profile: NumberTypeProfileRef | null = resolveFirstMatchingNumberTypeProfile(
      snapshot,
      this.#defaultCountryIndex,
      anchoredCountryIndex,
    );

    return resolveInternationalControllerState(snapshot, caretIndex, profile, this.config.display, direction);
  }

  insert(value: string, text: string, selectionStart: number, selectionEnd: number): InputState {
    this.#history.updateCurrentSelection(selectionStart, selectionEnd);

    const nextState: InputControllerState = this.#resolveState(
      value,
      {
        insertText: text,
        selectionStart,
        selectionEnd,
      },
      'forward',
    );

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  deleteBackward(value: string, selectionStart: number, selectionEnd: number): InputState {
    if (selectionStart === 0 && selectionEnd === 0) {
      this.#history.updateCurrentSelection(0, 0);
      return { ...toInputState(this.#history.current), selectionStart: 0, selectionEnd: 0 };
    }

    if (selectionStart === selectionEnd && isFormattingChar(value, selectionStart - 1)) {
      const prevDigit: number = findPreviousDigitPosition(value, selectionStart);
      if (prevDigit === -1) {
        this.#history.updateCurrentSelection(selectionStart, selectionStart);
        return { ...toInputState(this.#history.current), selectionStart, selectionEnd: selectionStart };
      }
      const pos: number = prevDigit + 1;
      this.#history.updateCurrentSelection(pos, pos);
      return { ...toInputState(this.#history.current), selectionStart: pos, selectionEnd: pos };
    }

    let effectiveStart: number = selectionStart;
    let effectiveEnd: number = selectionEnd;

    if (selectionStart === selectionEnd) {
      const position: number = findPreviousDigitPosition(value, selectionStart);

      if (position === -1) {
        return toInputState(this.#resolveState(value, { insertText: '', selectionStart, selectionEnd }, 'backward'));
      }

      effectiveStart = position;
      effectiveEnd = position + 1;
    }

    this.#history.updateCurrentSelection(selectionStart, selectionEnd);

    const nextState: InputControllerState = this.#resolveState(
      value,
      {
        insertText: '',
        selectionStart: effectiveStart,
        selectionEnd: effectiveEnd,
      },
      'backward',
    );

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  deleteForward(value: string, selectionStart: number, selectionEnd: number): InputState {
    if (selectionStart === selectionEnd && isFormattingChar(value, selectionStart)) {
      const nextDigit: number = findNextDigitPosition(value, selectionStart + 1);
      const pos: number = nextDigit === -1 ? selectionStart : nextDigit;
      this.#history.updateCurrentSelection(pos, pos);
      return { ...toInputState(this.#history.current), selectionStart: pos, selectionEnd: pos };
    }

    this.#history.updateCurrentSelection(selectionStart, selectionEnd);

    let effectiveStart: number = selectionStart;
    let effectiveEnd: number = selectionEnd;

    if (selectionStart === selectionEnd) {
      const position: number = findNextDigitPosition(value, selectionStart);
      if (position === -1) return toInputState(this.#history.current);
      effectiveStart = position;
      effectiveEnd = position + 1;
    }

    const nextState: InputControllerState = this.#resolveState(
      value,
      {
        insertText: '',
        selectionStart: effectiveStart,
        selectionEnd: effectiveEnd,
      },
      'forward',
    );

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  setValue(value: string): InputState {
    const nextState: InputControllerState = this.#resolveState('', {
      insertText: value,
      selectionStart: 0,
      selectionEnd: 0,
    });

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  setCountry(country: string): InputState {
    this.#setDefaultCountry(country);

    const { value } = this.#history.current;

    const nextState: InputControllerState = this.#resolveState(value, {
      insertText: '',
      selectionStart: value.length,
      selectionEnd: value.length,
    });

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  setCountryFilter(countries: string[] | null): void {
    this.#numberResolver.setCountryFilter(countries ? createCountryFilter(countries) : null);
  }

  setNumberTypeFilter(numberTypes: string[] | null): void {
    this.#numberResolver.setNumberTypeFilter(numberTypes ? createNumberTypeFilter(numberTypes) : null);
  }

  seal(): void {
    this.#history.seal();
  }

  undo(): InputState {
    return toInputState(this.#history.undo());
  }

  redo(): InputState {
    return toInputState(this.#history.redo());
  }

  get canUndo(): boolean {
    return this.#history.canUndo;
  }

  get canRedo(): boolean {
    return this.#history.canRedo;
  }

  get currentState(): InputState {
    return toInputState(this.#history.current);
  }
}

export function createInternationalInputController(config: InternationalInputControllerConfig = {}): InputController {
  assertResourcesReady();

  return new InternationalInputController(config);
}

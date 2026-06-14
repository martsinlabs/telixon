import { getMetadataRegionCallingCode, NumberType, RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { requireEngineReady } from '@telixon/core/utils/require-engine-ready';
import { NumberResolver } from '../../number-resolver';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../number-resolver/models';
import { resolveProfile } from '../../number-resolver/resolve-profile';
import { createCountryFilter, createNumberTypeFilter } from '../../number-resolver/utils/filter-factory';
import { createPhoneNumber, PhoneNumber, toResolvedPhoneNumber } from '../../phone-number';
import { InputStateHistory } from '../input-state-history';
import { InputChange, InputController, InputControllerState, InputState } from '../models';

import {
  findNextDigitPosition,
  findPreviousDigitPosition,
  isFormattingChar,
  toInputState,
  toInputStateWithSelection,
} from '../utils';
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

  #setDefaultCountry(country: RegionId): void {
    const resourceProvider = getResourceProvider();
    this.#defaultCountryIndex = resourceProvider.regionKeyToIndex[country] ?? -1;

    this.#defaultCallingCode =
      this.#defaultCountryIndex !== -1
        ? String(getMetadataRegionCallingCode(resourceProvider.engine, this.#defaultCountryIndex))
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
    const profile: NumberTypeProfileRef | null = resolveProfile(snapshot, this.#defaultCountryIndex);

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
      return toInputStateWithSelection(this.#history.current, 0, 0);
    }

    if (selectionStart === selectionEnd && isFormattingChar(value, selectionStart - 1)) {
      if (findNextDigitPosition(value, selectionStart) !== -1) {
        const prevDigit: number = findPreviousDigitPosition(value, selectionStart);
        if (prevDigit === -1) {
          this.#history.updateCurrentSelection(selectionStart, selectionStart);
          return toInputStateWithSelection(this.#history.current, selectionStart, selectionStart);
        }
        const pos: number = prevDigit + 1;
        this.#history.updateCurrentSelection(pos, pos);
        return toInputStateWithSelection(this.#history.current, pos, pos);
      }

      this.#history.updateCurrentSelection(selectionStart, selectionEnd);

      const trimmedState: InputControllerState = this.#resolveState(
        value,
        { insertText: '', selectionStart, selectionEnd },
        'backward',
      );

      if (trimmedState.value.length < value.length) {
        this.#history.push(trimmedState);
        return toInputState(this.#history.current);
      }

      const prevDigit: number = findPreviousDigitPosition(value, selectionStart);
      if (prevDigit === -1) {
        return toInputStateWithSelection(this.#history.current, selectionStart, selectionStart);
      }
      const pos: number = prevDigit + 1;
      this.#history.updateCurrentSelection(pos, pos);
      return toInputStateWithSelection(this.#history.current, pos, pos);
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
      return toInputStateWithSelection(this.#history.current, pos, pos);
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

  setCountry(country: RegionId): InputState {
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

  setCountryFilter(countries: readonly RegionId[] | null): void {
    this.#numberResolver.setCountryFilter(countries ? createCountryFilter(countries) : null);
    this.#recomputeState();
  }

  setNumberTypeFilter(numberTypes: readonly NumberType[] | null): void {
    this.#numberResolver.setNumberTypeFilter(numberTypes ? createNumberTypeFilter(numberTypes) : null);
    this.#recomputeState();
  }

  #recomputeState(): void {
    const { value, selectionStart, selectionEnd } = this.#history.current;
    const nextState: InputControllerState = this.#resolveState(value, {
      insertText: '',
      selectionStart,
      selectionEnd,
    });
    this.#history.replaceCurrent(nextState);
  }

  getPhoneNumber(): PhoneNumber {
    const { snapshot, nationalPrefixPresent } = this.#history.current;

    return createPhoneNumber(toResolvedPhoneNumber(snapshot, this.#defaultCountryIndex, nationalPrefixPresent));
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
  requireEngineReady();

  return new InternationalInputController(config);
}

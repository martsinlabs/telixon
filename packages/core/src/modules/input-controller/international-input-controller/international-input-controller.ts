import { getMetadataRegionCallingCode, NumberType, RegionCode } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { requireEngineReady } from '@telixon/core/utils/require-engine-ready';
import { NumberResolver } from '../../number-resolver';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../number-resolver/models';
import { ResolvedNumberState, resolveNumber } from '../../number-resolver/resolve-number';
import { resolveProfile } from '../../number-resolver/resolve-profile';
import { createNumberTypeFilter, createRegionFilter } from '../../number-resolver/utils/filter-factory';
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

class InternationalInputController implements InputController {
  #history!: InputStateHistory<InputControllerState>;

  #numberResolver: NumberResolver = new NumberResolver();

  #defaultRegionIndex: number = -1;

  #defaultCallingCode: string | null = null;

  constructor(private config: InternationalInputControllerConfig = {}) {
    if (this.config.defaultRegion) {
      this.#setDefaultRegion(this.config.defaultRegion);
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

  #setDefaultRegion(region: RegionCode): void {
    const resourceProvider = getResourceProvider();
    this.#defaultRegionIndex = resourceProvider.regionKeyToIndex[region] ?? -1;

    this.#defaultCallingCode =
      this.#defaultRegionIndex !== -1
        ? String(getMetadataRegionCallingCode(resourceProvider.engine, this.#defaultRegionIndex))
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
    const profile: NumberTypeProfileRef | null = resolveProfile(snapshot, this.#defaultRegionIndex);

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

  setRegion(region: RegionCode): InputState {
    this.#setDefaultRegion(region);

    const { value } = this.#history.current;

    const nextState: InputControllerState = this.#resolveState(value, {
      insertText: '',
      selectionStart: value.length,
      selectionEnd: value.length,
    });

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  setRegionFilter(regions: readonly RegionCode[] | null): InputState {
    this.#numberResolver.setRegionFilter(regions ? createRegionFilter(regions) : null);
    return this.#recomputeState();
  }

  setNumberTypeFilter(numberTypes: readonly NumberType[] | null): InputState {
    this.#numberResolver.setNumberTypeFilter(numberTypes ? createNumberTypeFilter(numberTypes) : null);
    return this.#recomputeState();
  }

  #recomputeState(): InputState {
    const { value, selectionStart, selectionEnd } = this.#history.current;
    const nextState: InputControllerState = this.#resolveState(value, {
      insertText: '',
      selectionStart,
      selectionEnd,
    });
    this.#history.replaceCurrent(nextState);
    return toInputState(this.#history.current);
  }

  getPhoneNumber(): PhoneNumber {
    const resolved: ResolvedNumberState = resolveNumber({
      input: this.#history.current.value,
      hasLeadingPlus: this.config.display?.callingCodeInInput !== false,
      defaultRegionIndex: this.#defaultRegionIndex,
      regionFilter: this.#numberResolver.regionFilter,
      numberTypeFilter: this.#numberResolver.numberTypeFilter,
      strict: this.config.strict === true,
    });

    return createPhoneNumber(
      toResolvedPhoneNumber(resolved.snapshot, this.#defaultRegionIndex, resolved.nationalPrefixPresent),
    );
  }

  clearHistory(): void {
    this.#history.clearHistory();
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

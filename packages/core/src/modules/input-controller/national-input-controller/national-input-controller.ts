import {
  getMetadataRegionCallingCode,
  NationalPrefixRules,
  normalizeNationalNumber,
  NumberType,
  RegionCode,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { requireEngineReady } from '@telixon/core/utils/require-engine-ready';
import { NumberResolver } from '../../number-resolver';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../number-resolver/models';
import { ResolvedNumberState, resolveNumber } from '../../number-resolver/resolve-number';
import { resolveProfile } from '../../number-resolver/resolve-profile';
import { createNumberTypeFilter, createRegionFilter } from '../../number-resolver/utils/filter-factory';
import { getNationalPrefixRules } from '../../number-resolver/utils/get-national-prefix-rules';
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
import { NationalInputControllerConfig } from './models';
import { resolveNationalControllerState } from './utils';

function hasTypedNationalPrefix(rawDigits: string, prefixRules: NationalPrefixRules | undefined): boolean {
  if (!prefixRules?.nationalPrefix) {
    return false;
  }

  return rawDigits.startsWith(prefixRules.nationalPrefix);
}

class NationalInputController implements InputController {
  #history!: InputStateHistory<InputControllerState>;

  #numberResolver: NumberResolver = new NumberResolver();

  #defaultRegionIndex: number = -1;

  #defaultCallingCode: string | null = null;

  constructor(private config: NationalInputControllerConfig) {
    this.#setRegion(this.config.defaultRegion);

    if (this.config.strict) {
      this.#numberResolver.setStrict(true);
    }

    this.#history = new InputStateHistory(
      this.#resolveState('', { insertText: config.initialValue ?? '', selectionStart: 0, selectionEnd: 0 }),
      config.maxHistorySize,
    );
  }

  #setRegion(region: RegionCode): void {
    this.#defaultRegionIndex = getResourceProvider().regionKeyToIndex[region] ?? -1;

    this.#defaultCallingCode =
      this.#defaultRegionIndex !== -1
        ? String(getMetadataRegionCallingCode(getResourceProvider().engine, this.#defaultRegionIndex))
        : null;
  }

  #seedResolver(): void {
    if (this.#defaultCallingCode !== null) {
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

    const rawDigits: number[] = [];
    const rawCaretIndex: number = resolveInput(value, change, (digit: number) => rawDigits.push(digit));

    const prefixRules: NationalPrefixRules | undefined = getNationalPrefixRules(this.#defaultRegionIndex);

    const rawString: string = rawDigits.join('');

    // normalizedDigits drive validation; displayDigits drive formatting (no untyped digit shown); caret stays in raw space.
    let normalizedDigits: string = rawString;
    let displayDigits: string = rawString;
    if (rawString.length > 0 && prefixRules) {
      const normalized = normalizeNationalNumber(rawString, prefixRules);
      normalizedDigits = normalized.normalizedDigits;
      displayDigits = normalized.displayDigits;
    }

    const nationalPrefixTyped: boolean = hasTypedNationalPrefix(rawString, prefixRules);

    for (let i = 0; i < normalizedDigits.length; i++) {
      numberResolver.advance(normalizedDigits.charCodeAt(i) - 48);
    }

    const snapshot: NumberResolverSnapshot = numberResolver.snapshot;
    const profile: NumberTypeProfileRef | null = resolveProfile(snapshot, this.#defaultRegionIndex);

    return resolveNationalControllerState(
      snapshot,
      profile,
      this.#defaultRegionIndex,
      nationalPrefixTyped,
      rawString,
      displayDigits,
      rawCaretIndex,
      direction,
    );
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
        const pos: number = prevDigit === -1 ? 0 : prevDigit + 1;
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
      const pos: number = prevDigit === -1 ? 0 : prevDigit + 1;
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
    this.#setRegion(region);

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
    // A pure re-render of the current value; the collapsed caret keeps the stored range out of the edit path.
    const nextState: InputControllerState = this.#resolveState(value, {
      insertText: '',
      selectionStart,
      selectionEnd: selectionStart,
    });
    // An unchanged render keeps the stored selection, so a filter call never moves the caret.
    const renderedState: InputControllerState =
      nextState.value === value ? { ...nextState, selectionStart, selectionEnd } : nextState;
    this.#history.replaceCurrent(renderedState);
    return toInputState(this.#history.current);
  }

  clearHistory(): void {
    this.#history.clearHistory();
  }

  getPhoneNumber(): PhoneNumber {
    const resolved: ResolvedNumberState = resolveNumber({
      input: this.#history.current.value,
      hasLeadingPlus: false,
      seedCallingCode: null,
      defaultRegionIndex: this.#defaultRegionIndex,
      regionFilter: this.#numberResolver.regionFilter,
      numberTypeFilter: this.#numberResolver.numberTypeFilter,
      strict: this.config.strict === true,
    });

    return createPhoneNumber(toResolvedPhoneNumber(resolved, this.#defaultRegionIndex));
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

/**
 * Creates an {@link InputController} for one region's national format. The calling code
 * never appears in the field.
 *
 * @example
 * const controller = createNationalInputController({ defaultRegion: 'US' });
 * controller.insert('(415) 555-013', '2', 13, 13);
 * // { value: '(415) 555-0132', region: 'US', selectionStart: 14, selectionEnd: 14 }
 */
export function createNationalInputController(config: NationalInputControllerConfig): InputController {
  requireEngineReady();

  return new NationalInputController(config);
}

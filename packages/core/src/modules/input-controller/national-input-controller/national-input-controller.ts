import {
  getMetadataRegionCallingCode,
  NationalPrefixRules,
  normalizeNationalNumber,
  NumberType,
  RegionCode,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { requireEngineReady } from '@telixon/core/utils/require-engine-ready';
import { toInputString } from '@telixon/core/utils/to-input-string';
import { NumberResolver } from '../../number-resolver';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../number-resolver/models';
import { ResolvedNumberState, resolveNumber } from '../../number-resolver/resolve-number';
import { resolveProfile } from '../../number-resolver/resolve-profile';
import { createNumberTypeFilter, createRegionFilter } from '../../number-resolver/utils/filter-factory';
import { getNationalPrefixRules } from '../../number-resolver/utils/get-national-prefix-rules';
import { createPhoneNumber, PhoneNumber, toResolvedPhoneNumber } from '../../phone-number';
import { InputStateHistory } from '../input-state-history';
import { InputChange, InputController, InputState } from '../models';
import {
  collectDigits,
  findNextDigitPosition,
  findPreviousDigitPosition,
  toInputState,
  toInputStateWithSelection,
} from '../utils';
import { resolveInput } from '../utils/resolve-input';
import { NationalControllerState, NationalInputControllerConfig } from './models';
import { resolveNationalControllerState } from './utils';
import { typedRangeForSelection } from './utils/digit-alignment';

function hasTypedNationalPrefix(rawDigits: string, prefixRules: NationalPrefixRules | undefined): boolean {
  if (!prefixRules?.nationalPrefix) {
    return false;
  }

  return rawDigits.startsWith(prefixRules.nationalPrefix);
}

class NationalInputController implements InputController {
  #history!: InputStateHistory<NationalControllerState>;

  #numberResolver: NumberResolver = new NumberResolver();

  #defaultRegionIndex: number = -1;

  #defaultCallingCode: string | null = null;

  readonly #config: NationalInputControllerConfig;

  constructor(config: NationalInputControllerConfig) {
    this.#config = config;
    this.#setRegion(this.#config.defaultRegion);

    if (this.#config.strict) {
      this.#numberResolver.setStrict(true);
    }

    const initialDigits: string = collectDigits(config.initialValue ?? '');
    this.#history = new InputStateHistory(
      this.#resolveFromTyped(initialDigits, initialDigits.length),
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

  // Resolves the state from the typed digits. The rendered value is derived output and is never parsed back.
  #resolveFromTyped(
    typedDigits: string,
    typedCaretIndex: number,
    direction: 'forward' | 'backward' = 'forward',
  ): NationalControllerState {
    const numberResolver: NumberResolver = this.#numberResolver;

    this.#seedResolver();

    const prefixRules: NationalPrefixRules | undefined = getNationalPrefixRules(this.#defaultRegionIndex);

    // normalizedDigits drive validation; displayDigits drive formatting (no untyped digit shown).
    let normalizedDigits: string = typedDigits;
    let displayDigits: string = typedDigits;
    if (typedDigits.length > 0 && prefixRules) {
      const normalized = normalizeNationalNumber(typedDigits, prefixRules);
      normalizedDigits = normalized.normalizedDigits;
      displayDigits = normalized.displayDigits;
    }

    const nationalPrefixTyped: boolean = hasTypedNationalPrefix(typedDigits, prefixRules);

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
      typedDigits,
      displayDigits,
      typedCaretIndex,
      prefixRules,
      direction,
    );
  }

  // An edit on our own rendering maps onto the stored typed digits. A foreign value (autofill) is parsed from scratch.
  #resolveFromEdit(
    value: string,
    change: InputChange,
    direction: 'forward' | 'backward' = 'forward',
    isDelete: boolean = false,
  ): NationalControllerState {
    let nextState: NationalControllerState;

    const current: NationalControllerState = this.#history.current;
    if (value === current.value) {
      const insertedDigits: string = collectDigits(change.insertText);
      const range = typedRangeForSelection(
        current.alignment,
        current.rawDigits.length,
        value,
        change.selectionStart,
        change.selectionEnd,
      );
      const typedDigits: string =
        current.rawDigits.slice(0, range.start) + insertedDigits + current.rawDigits.slice(range.end);
      nextState = this.#resolveFromTyped(typedDigits, range.start + insertedDigits.length, direction);
    } else {
      const digits: number[] = [];
      const caretIndex: number = resolveInput(value, change, (digit: number) => digits.push(digit));
      nextState = this.#resolveFromTyped(digits.join(''), caretIndex, direction);
    }

    // When a delete leaves the field empty, drop the hidden typed digits too.
    if (isDelete && nextState.value === '' && nextState.rawDigits !== '') {
      return this.#resolveFromTyped('', 0, direction);
    }
    return nextState;
  }

  insert(value: string, text: string, selectionStart: number, selectionEnd: number): InputState {
    const safeValue: string = toInputString(value);
    const safeText: string = toInputString(text);
    this.#history.updateCurrentSelection(selectionStart, selectionEnd);

    this.#history.push(
      this.#resolveFromEdit(safeValue, { insertText: safeText, selectionStart, selectionEnd }, 'forward'),
    );

    return toInputState(this.#history.current);
  }

  deleteBackward(rawValue: string, selectionStart: number, selectionEnd: number): InputState {
    const value: string = toInputString(rawValue);
    if (selectionStart === 0 && selectionEnd === 0) {
      this.#history.updateCurrentSelection(0, 0);
      return toInputStateWithSelection(this.#history.current, 0, 0);
    }

    let effectiveStart: number = selectionStart;
    let effectiveEnd: number = selectionEnd;

    if (selectionStart === selectionEnd) {
      const position: number = findPreviousDigitPosition(value, selectionStart);

      if (position === -1) {
        this.#history.updateCurrentSelection(selectionStart, selectionEnd);
        return toInputStateWithSelection(this.#history.current, selectionStart, selectionEnd);
      }

      effectiveStart = position;
      effectiveEnd = position + 1;
    }

    this.#history.updateCurrentSelection(selectionStart, selectionEnd);

    this.#history.push(
      this.#resolveFromEdit(
        value,
        { insertText: '', selectionStart: effectiveStart, selectionEnd: effectiveEnd },
        'backward',
        true,
      ),
    );

    return toInputState(this.#history.current);
  }

  deleteForward(rawValue: string, selectionStart: number, selectionEnd: number): InputState {
    const value: string = toInputString(rawValue);
    this.#history.updateCurrentSelection(selectionStart, selectionEnd);

    let effectiveStart: number = selectionStart;
    let effectiveEnd: number = selectionEnd;

    if (selectionStart === selectionEnd) {
      const position: number = findNextDigitPosition(value, selectionStart);
      if (position === -1) return toInputState(this.#history.current);
      effectiveStart = position;
      effectiveEnd = position + 1;
    }

    this.#history.push(
      this.#resolveFromEdit(
        value,
        { insertText: '', selectionStart: effectiveStart, selectionEnd: effectiveEnd },
        'forward',
        true,
      ),
    );

    return toInputState(this.#history.current);
  }

  setValue(rawValue: string): InputState {
    const value: string = toInputString(rawValue);
    // Re-setting the exact current value leaves the rendering untouched and only moves the caret to the end.
    if (value === this.#history.current.value) {
      const end: number = value.length;
      this.#history.updateCurrentSelection(end, end);
      return toInputStateWithSelection(this.#history.current, end, end);
    }

    // Any other string is parsed as new typed content.
    const typedDigits: string = collectDigits(value);
    this.#history.push(this.#resolveFromTyped(typedDigits, typedDigits.length));

    return toInputState(this.#history.current);
  }

  setRegion(region: RegionCode): InputState {
    this.#setRegion(region);

    const { rawDigits } = this.#history.current;

    this.#history.push(this.#resolveFromTyped(rawDigits, rawDigits.length));

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
    const current: NationalControllerState = this.#history.current;
    // Re-renders the stored typed digits under the new filters.
    const nextState: NationalControllerState = this.#resolveFromTyped(current.rawDigits, current.rawCaretIndex);
    // When the value did not change, keep the selection where it was.
    const renderedState: NationalControllerState =
      nextState.value === current.value
        ? { ...nextState, selectionStart: current.selectionStart, selectionEnd: current.selectionEnd }
        : nextState;
    this.#history.replaceCurrent(renderedState);
    return toInputState(this.#history.current);
  }

  clearHistory(): void {
    this.#history.clearHistory();
  }

  getPhoneNumber(): PhoneNumber {
    // Queries resolve the displayed value, so getPhoneNumber always agrees with parsePhoneNumber of what the field shows.
    const resolved: ResolvedNumberState = resolveNumber({
      input: this.#history.current.value,
      hasLeadingPlus: false,
      seedCallingCode: null,
      defaultRegionIndex: this.#defaultRegionIndex,
      regionFilter: this.#numberResolver.regionFilter,
      numberTypeFilter: this.#numberResolver.numberTypeFilter,
      strict: this.#config.strict === true,
    });

    return createPhoneNumber(toResolvedPhoneNumber(resolved, this.#defaultRegionIndex, null));
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

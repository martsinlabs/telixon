import { getMetadataRegionCallingCode, NumberType, RegionCode } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { requireEngineReady } from '@telixon/core/utils/require-engine-ready';
import { toInputString } from '@telixon/core/utils/to-input-string';
import { NumberResolver } from '../../number-resolver';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../number-resolver/models';
import { ResolvedNumberState, resolveNumber } from '../../number-resolver/resolve-number';
import { resolveProfile } from '../../number-resolver/resolve-profile';
import { createNumberTypeFilter, createRegionFilter } from '../../number-resolver/utils/filter-factory';
import { createPhoneNumber, PhoneNumber, toResolvedPhoneNumber } from '../../phone-number';
import { InputStateHistory } from '../input-state-history';
import { InputChange, InputController, InputControllerState, InputState } from '../models';

import {
  collectDigits,
  findNextDigitPosition,
  findPreviousDigitPosition,
  toInputState,
  toInputStateWithSelection,
} from '../utils';
import { resolveInput } from '../utils/resolve-input';
import { InternationalInputControllerConfig } from './models';
import { resolveInternationalControllerState } from './utils';

function hasDigitAtOrAfter(value: string, index: number): boolean {
  for (let i = index; i < value.length; i++) {
    const charCode: number = value.charCodeAt(i);
    if (charCode >= 48 && charCode <= 57) return true;
  }
  return false;
}

class InternationalInputController implements InputController {
  #history!: InputStateHistory<InputControllerState>;

  #numberResolver: NumberResolver = new NumberResolver();

  #defaultRegionIndex: number = -1;

  #defaultCallingCode: string | null = null;

  #plusErasable: boolean = false;

  readonly #config: InternationalInputControllerConfig;

  constructor(config: InternationalInputControllerConfig = {}) {
    this.#config = config;
    if (this.#config.defaultRegion) {
      this.#setDefaultRegion(this.#config.defaultRegion);
    }

    if (this.#config.strict) {
      this.#numberResolver.setStrict(true);
    }

    const display = this.#config.display;
    this.#plusErasable = display !== undefined && display.callingCodeInInput && display.plusPrefix === 'erasable';

    const shouldShowCallingCode: boolean = this.#config.display?.callingCodeInInput !== false;
    const insertText: string = config.initialValue ?? (shouldShowCallingCode ? (this.#defaultCallingCode ?? '') : '');

    // Only an explicit '+' or the calling-code seed primes the plus; every plus-less start, the
    // empty string included, begins with the plus erased so an empty field renders truly empty.
    const seededPrimer: boolean = config.initialValue === undefined && insertText !== '';
    const initialPlusErased: boolean = this.#plusErasable && !insertText.startsWith('+') && !seededPrimer;

    this.#history = new InputStateHistory(
      this.#resolveState(
        '',
        {
          insertText,
          selectionStart: 0,
          selectionEnd: 0,
        },
        'forward',
        initialPlusErased,
      ),
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
    if (this.#config.display?.callingCodeInInput === false && this.#defaultCallingCode !== null) {
      this.#numberResolver.setCallingCode(this.#defaultCallingCode);
    } else {
      this.#numberResolver.reset();
    }
  }

  #resolveState(
    value: string,
    change: InputChange,
    direction: 'forward' | 'backward' = 'forward',
    plusErased: boolean = false,
  ): InputControllerState {
    const numberResolver: NumberResolver = this.#numberResolver;

    this.#seedResolver();

    const caretIndex: number = resolveInput(value, change, (digit: number) => numberResolver.advance(digit));

    const snapshot: NumberResolverSnapshot = numberResolver.snapshot;
    const profile: NumberTypeProfileRef | null = resolveProfile(snapshot, this.#defaultRegionIndex);

    return resolveInternationalControllerState(
      snapshot,
      caretIndex,
      profile,
      this.#config.display,
      direction,
      plusErased,
      this.#defaultRegionIndex,
    );
  }

  get #plusErased(): boolean {
    return this.#history.current.plusErased;
  }

  // True when the deleted range covers the leading plus of the current value.
  #erasesPlus(value: string, selectionStart: number, selectionEnd: number): boolean {
    return this.#plusErasable && selectionStart === 0 && selectionEnd > 0 && value.startsWith('+');
  }

  // A pasted number often repeats the calling code the field already shows. When the raw read dies
  // on the doubled code, the insert retries with the duplicate stripped and keeps the resolvable read.
  #dedupedCallingCodeInsert(
    value: string,
    insertText: string,
    selectionStart: number,
    selectionEnd: number,
    plusErased: boolean,
  ): InputControllerState | null {
    const snapshot: NumberResolverSnapshot = this.#history.current.snapshot;
    const callingCode: string = snapshot.callingCodeDigits;
    if (callingCode === '' || !snapshot.callingCodeCompleted || snapshot.nationalDigits !== '') return null;

    const insertedDigits: string = collectDigits(insertText);
    if (insertedDigits.length < callingCode.length + 4) return null;
    if (!insertedDigits.startsWith(callingCode)) return null;
    if (hasDigitAtOrAfter(value, selectionStart)) return null;

    return this.#resolveState(
      value,
      {
        insertText: insertedDigits.slice(callingCode.length),
        selectionStart,
        selectionEnd,
      },
      'forward',
      plusErased,
    );
  }

  insert(rawValue: string, rawText: string, selectionStart: number, selectionEnd: number): InputState {
    const value: string = toInputString(rawValue);
    const text: string = toInputString(rawText);
    this.#history.updateCurrentSelection(selectionStart, selectionEnd);

    const plusRestored: boolean = selectionStart === 0 && text.startsWith('+');
    const plusErased: boolean = this.#plusErased && !plusRestored;

    let nextState: InputControllerState = this.#resolveState(
      value,
      {
        insertText: text,
        selectionStart,
        selectionEnd,
      },
      'forward',
      plusErased,
    );

    if (nextState.profileRef === null && text.length >= 5) {
      const dedupedState: InputControllerState | null = this.#dedupedCallingCodeInsert(
        value,
        text,
        selectionStart,
        selectionEnd,
        plusErased,
      );
      if (dedupedState !== null && dedupedState.profileRef !== null) nextState = dedupedState;
    }

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  deleteBackward(rawValue: string, selectionStart: number, selectionEnd: number): InputState {
    const value: string = toInputString(rawValue);
    if (selectionStart === 0 && selectionEnd === 0) {
      this.#history.updateCurrentSelection(0, 0);
      return toInputStateWithSelection(this.#history.current, 0, 0);
    }

    // Backspace with the caret right after a visible erasable plus erases the plus and keeps the digits.
    if (this.#plusErasable && selectionStart === 1 && selectionEnd === 1 && value.startsWith('+')) {
      this.#history.updateCurrentSelection(1, 1);
      this.#history.push(
        this.#resolveState(value, { insertText: '', selectionStart: 1, selectionEnd: 1 }, 'backward', true),
      );
      return toInputState(this.#history.current);
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

    const nextState: InputControllerState = this.#resolveState(
      value,
      {
        insertText: '',
        selectionStart: effectiveStart,
        selectionEnd: effectiveEnd,
      },
      'backward',
      this.#plusErased || this.#erasesPlus(value, selectionStart, selectionEnd),
    );

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  deleteForward(rawValue: string, selectionStart: number, selectionEnd: number): InputState {
    const value: string = toInputString(rawValue);
    // Forward delete with the caret on a visible erasable plus erases the plus and keeps the digits.
    if (this.#plusErasable && selectionStart === 0 && selectionEnd === 0 && value.startsWith('+')) {
      this.#history.updateCurrentSelection(0, 0);
      this.#history.push(
        this.#resolveState(value, { insertText: '', selectionStart: 0, selectionEnd: 0 }, 'forward', true),
      );
      return toInputState(this.#history.current);
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
      this.#plusErased || this.#erasesPlus(value, selectionStart, selectionEnd),
    );

    this.#history.push(nextState);

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

    // With an erasable plus, the given string decides plus visibility; an empty string resets to an empty field.
    const plusErased: boolean = this.#plusErasable && !value.startsWith('+');

    const nextState: InputControllerState = this.#resolveState(
      '',
      {
        insertText: value,
        selectionStart: 0,
        selectionEnd: 0,
      },
      'forward',
      plusErased,
    );

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  setRegion(region: RegionCode): InputState {
    this.#setDefaultRegion(region);

    const { value } = this.#history.current;

    const nextState: InputControllerState = this.#resolveState(
      value,
      {
        insertText: '',
        selectionStart: value.length,
        selectionEnd: value.length,
      },
      'forward',
      this.#plusErased,
    );

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
    const nextState: InputControllerState = this.#resolveState(
      value,
      {
        insertText: '',
        selectionStart,
        selectionEnd: selectionStart,
      },
      'forward',
      this.#plusErased,
    );
    // An unchanged render keeps the stored selection, so a filter call never moves the caret.
    const renderedState: InputControllerState =
      nextState.value === value ? { ...nextState, selectionStart, selectionEnd } : nextState;
    this.#history.replaceCurrent(renderedState);
    return toInputState(this.#history.current);
  }

  getPhoneNumber(): PhoneNumber {
    // Selector mode resolves the displayed digits literally behind the seeded calling code, exactly as the state pipeline walks them.
    const resolved: ResolvedNumberState = resolveNumber({
      input: this.#history.current.value,
      hasLeadingPlus: true,
      seedCallingCode: this.#config.display?.callingCodeInInput === false ? this.#defaultCallingCode : null,
      defaultRegionIndex: this.#defaultRegionIndex,
      regionFilter: this.#numberResolver.regionFilter,
      numberTypeFilter: this.#numberResolver.numberTypeFilter,
      strict: this.#config.strict === true,
    });

    return createPhoneNumber(toResolvedPhoneNumber(resolved, this.#defaultRegionIndex, null));
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

/**
 * Creates an {@link InputController} that resolves the region from the value. The calling
 * code lives in the field unless `display.callingCodeInInput` is `false`, which requires
 * `defaultRegion`.
 *
 * @example
 * const controller = createInternationalInputController({});
 * controller.setValue('+14155550132');
 * // { value: '1 415-555-0132', region: 'US', selectionStart: 14, selectionEnd: 14 }
 */
export function createInternationalInputController(config: InternationalInputControllerConfig = {}): InputController {
  requireEngineReady();

  return new InternationalInputController(config);
}

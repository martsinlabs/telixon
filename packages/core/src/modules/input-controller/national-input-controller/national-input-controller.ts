import { CountryId, normalizeNationalNumber, NumberType, TerritorySpec } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { assertResourcesReady } from '@telixon/core/utils/assert-resources-ready';
import { NumberResolver } from '../../number-resolver';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../number-resolver/models';
import { resolveFirstMatchingNumberTypeProfile } from '../../number-resolver/resolve-first-matching-number-type-profile';
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
import { NationalInputControllerConfig } from './models';
import { resolveNationalControllerState } from './utils';

function hasTypedNationalPrefix(rawDigits: string, territorySpec: TerritorySpec | undefined): boolean {
  if (!territorySpec?.nationalPrefix) {
    return false;
  }

  return rawDigits.startsWith(territorySpec.nationalPrefix);
}

class NationalInputController extends InputController {
  #history!: InputStateHistory<InputControllerState>;

  #numberResolver: NumberResolver = new NumberResolver();

  #defaultCountryIndex: number = -1;

  #defaultCallingCode: string | null = null;

  constructor(private config: NationalInputControllerConfig) {
    super();

    this.#setCountry(this.config.country);

    if (this.config.strict) {
      this.#numberResolver.setStrict(true);
    }

    this.#history = new InputStateHistory(
      this.#resolveState('', { insertText: config.initialValue ?? '', selectionStart: 0, selectionEnd: 0 }),
      config.maxHistorySize,
    );
  }

  #setCountry(country: CountryId): void {
    this.#defaultCountryIndex = getResourceProvider().refMapping.countries.keyToIndex[country] ?? -1;

    this.#defaultCallingCode =
      this.#defaultCountryIndex !== -1
        ? getResourceProvider().territorySpecTable[this.#defaultCountryIndex]!.countryCode
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

    const territorySpec: TerritorySpec | undefined =
      this.#defaultCountryIndex !== -1
        ? getResourceProvider().territorySpecTable[this.#defaultCountryIndex]
        : undefined;

    const rawString: string = rawDigits.join('');

    const normalizedDigits: string =
      rawString.length > 0 && territorySpec
        ? normalizeNationalNumber(rawString, territorySpec).normalizedDigits
        : rawString;

    const nationalPrefixTyped: boolean = hasTypedNationalPrefix(rawString, territorySpec);

    for (let i = 0; i < normalizedDigits.length; i++) {
      numberResolver.advance(normalizedDigits.charCodeAt(i) - 48);
    }

    const snapshot: NumberResolverSnapshot = numberResolver.snapshot;
    const anchoredCountryIndex: number = numberResolver.resolveLatestConcreteCountryIndex();

    const profile: NumberTypeProfileRef | null = resolveFirstMatchingNumberTypeProfile(
      snapshot,
      this.#defaultCountryIndex,
      anchoredCountryIndex,
    );

    return resolveNationalControllerState(
      snapshot,
      profile,
      this.#defaultCountryIndex,
      nationalPrefixTyped,
      rawString,
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

  setCountry(country: CountryId): InputState {
    this.#setCountry(country);

    const { value } = this.#history.current;

    const nextState: InputControllerState = this.#resolveState(value, {
      insertText: '',
      selectionStart: value.length,
      selectionEnd: value.length,
    });

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  setCountryFilter(countries: CountryId[] | null): void {
    this.#numberResolver.setCountryFilter(countries ? createCountryFilter(countries) : null);
  }

  setNumberTypeFilter(numberTypes: NumberType[] | null): void {
    this.#numberResolver.setNumberTypeFilter(numberTypes ? createNumberTypeFilter(numberTypes) : null);
  }

  seal(): void {
    this.#history.seal();
  }

  getPhoneNumber(): PhoneNumber {
    const { profileRef, nationalDigits } = this.#history.current;

    return createPhoneNumber(
      toResolvedPhoneNumber(this.#numberResolver, profileRef, nationalDigits, this.#defaultCountryIndex),
    );
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

export function createNationalInputController(config: NationalInputControllerConfig): InputController {
  assertResourcesReady();

  return new NationalInputController(config);
}

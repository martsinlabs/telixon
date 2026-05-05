import { normalizeNationalNumber, TerritorySpec } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { assertResourcesReady } from '@telixon/core/utils/assert-resources-ready';
import { NumberResolver } from '../../number-resolver';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../number-resolver/models';
import { resolveFirstMatchingNumberTypeProfile } from '../../number-resolver/resolve-first-matching-number-type-profile';
import { InputStateHistory } from '../input-state-history';
import { InputChange, InputController, InputControllerState, InputState } from '../models';
import { findNextDigitPosition, findPreviousDigitPosition, toInputState } from '../utils';
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

    this.#history = new InputStateHistory(
      this.#resolveState('', { insertText: '', selectionStart: 0, selectionEnd: 0 }),
    );
  }

  #setCountry(country: string): void {
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

  #resolveState(value: string, change: InputChange): InputControllerState {
    const numberResolver: NumberResolver = this.#numberResolver;

    this.#seedResolver();

    const rawDigits: number[] = [];
    const rawCaretIndex: number = resolveInput(value, change, (digit: number) => rawDigits.push(digit));

    const territorySpec: TerritorySpec | undefined =
      this.#defaultCountryIndex !== -1
        ? getResourceProvider().territorySpecTable[this.#defaultCountryIndex]
        : undefined;

    const rawString: string = rawDigits.join('');

    const { normalizedDigits, caretIndex } =
      rawString.length > 0 && territorySpec
        ? normalizeNationalNumber(rawString, territorySpec, rawCaretIndex)
        : { normalizedDigits: rawString, caretIndex: rawCaretIndex };

    const nationalPrefixTyped: boolean = hasTypedNationalPrefix(rawString, territorySpec);

    for (let i = 0; i < normalizedDigits.length; i++) {
      numberResolver.advance(normalizedDigits.charCodeAt(i) - 48);
    }

    const snapshot: NumberResolverSnapshot = numberResolver.snapshot;

    const profile: NumberTypeProfileRef | null = resolveFirstMatchingNumberTypeProfile(
      snapshot,
      this.#defaultCountryIndex,
    );

    return resolveNationalControllerState(
      snapshot,
      caretIndex,
      profile,
      this.#defaultCountryIndex,
      nationalPrefixTyped,
      rawString,
      rawCaretIndex,
    );
  }

  insert(value: string, text: string, selectionStart: number, selectionEnd: number): InputState {
    this.#history.updateCurrentSelection(selectionStart, selectionEnd);

    const nextState: InputControllerState = this.#resolveState(value, {
      insertText: text,
      selectionStart,
      selectionEnd,
    });

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  deleteBackward(value: string, selectionStart: number, selectionEnd: number): InputState {
    this.#history.updateCurrentSelection(selectionStart, selectionEnd);

    let effectiveStart: number = selectionStart;
    let effectiveEnd: number = selectionEnd;

    if (selectionStart === selectionEnd) {
      const position: number = findPreviousDigitPosition(value, selectionStart);
      if (position === -1) return toInputState(this.#history.current);
      effectiveStart = position;
      effectiveEnd = position + 1;
    }

    const nextState: InputControllerState = this.#resolveState(value, {
      insertText: '',
      selectionStart: effectiveStart,
      selectionEnd: effectiveEnd,
    });

    this.#history.push(nextState);

    return toInputState(this.#history.current);
  }

  deleteForward(value: string, selectionStart: number, selectionEnd: number): InputState {
    this.#history.updateCurrentSelection(selectionStart, selectionEnd);

    let effectiveStart: number = selectionStart;
    let effectiveEnd: number = selectionEnd;

    if (selectionStart === selectionEnd) {
      const position: number = findNextDigitPosition(value, selectionStart);
      if (position === -1) return toInputState(this.#history.current);
      effectiveStart = position;
      effectiveEnd = position + 1;
    }

    const nextState: InputControllerState = this.#resolveState(value, {
      insertText: '',
      selectionStart: effectiveStart,
      selectionEnd: effectiveEnd,
    });

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

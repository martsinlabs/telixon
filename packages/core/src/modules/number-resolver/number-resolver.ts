import {
  ENGINE_DEAD,
  Engine,
  STATE_FLAG_CALLING_CODE,
  STATE_FLAG_CALLING_CODE_TERMINAL,
  getStateFlags,
  walkDigit,
} from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { NumberResolverSnapshot } from './models';
import { stateMatchesFilters } from './utils/state-matches-filters';

export class NumberResolver {
  private readonly engine: Engine = getResourceProvider().engine;

  private _state: number = 0;

  // Deepest non-dead state of the full walk (calling code + national digits).
  private _endState: number = 0;

  private _nationalDigitString: string = '';

  private _callingCodeDigitString: string = '';

  private _callingCodeCompleted: boolean = false;

  private _callingCodeState: number = -1;

  private _countryFilter: BinaryFilter | null = null;

  private _numberTypeFilter: BinaryFilter | null = null;

  private _strict: boolean = false;

  advance(digit: number): void {
    const digitChar: string = String.fromCharCode(48 + digit);

    if (this._state === ENGINE_DEAD) {
      this._nationalDigitString += digitChar;
      return;
    }

    let state: number = walkDigit(this.engine, this._state, digit);
    const filtersActive: boolean = this._countryFilter !== null || this._numberTypeFilter !== null;

    if (
      state !== ENGINE_DEAD &&
      filtersActive &&
      !stateMatchesFilters(state, this._countryFilter, this._numberTypeFilter)
    ) {
      state = ENGINE_DEAD;
    }

    this._state = state;

    if (state === ENGINE_DEAD) {
      this._nationalDigitString += digitChar;
      return;
    }

    this._endState = state;

    // Calling codes are prefix-free: once one completes, every further digit is national.
    if (this._callingCodeCompleted) {
      this._nationalDigitString += digitChar;
      return;
    }

    const stateWord: number = getStateFlags(this.engine, state);
    if (stateWord & STATE_FLAG_CALLING_CODE) {
      this._callingCodeDigitString += digitChar;
      this._callingCodeState = state;
      this._callingCodeCompleted = (stateWord & STATE_FLAG_CALLING_CODE_TERMINAL) !== 0;
    } else {
      this._nationalDigitString += digitChar;
    }
  }

  setCallingCode(code: string): void {
    this.reset();

    for (let i = 0; i < code.length; i++) {
      this.advance(code.charCodeAt(i) - 48);
    }
  }

  reset(): void {
    this._state = 0;
    this._endState = 0;
    this._nationalDigitString = '';
    this._callingCodeDigitString = '';
    this._callingCodeCompleted = false;
    this._callingCodeState = -1;
  }

  getCallingCode(): string {
    return this._callingCodeDigitString;
  }

  getNationalNumber(): string {
    return this._nationalDigitString;
  }

  setCountryFilter(filter: BinaryFilter | null): void {
    this._countryFilter = filter;
  }

  setNumberTypeFilter(filter: BinaryFilter | null): void {
    this._numberTypeFilter = filter;
  }

  setStrict(strict: boolean): void {
    this._strict = strict;
  }

  get state(): number {
    return this._state;
  }

  get endState(): number {
    return this._endState;
  }

  get nationalNumberLength(): number {
    return this._nationalDigitString.length;
  }

  get callingCodeCompleted(): boolean {
    return this._callingCodeCompleted;
  }

  get callingCodeState(): number {
    return this._callingCodeState;
  }

  get countryFilter(): BinaryFilter | null {
    return this._countryFilter;
  }

  get numberTypeFilter(): BinaryFilter | null {
    return this._numberTypeFilter;
  }

  get snapshot(): NumberResolverSnapshot {
    return {
      endState: this._endState,
      callingCodeDigits: this._callingCodeDigitString,
      nationalDigits: this._nationalDigitString,
      callingCodeCompleted: this._callingCodeCompleted,
      callingCodeState: this._callingCodeState,
      countryFilter: this._countryFilter,
      numberTypeFilter: this._numberTypeFilter,
      strict: this._strict,
    };
  }
}

import {
  CallingCodeLayer,
  getNextGraphState,
  GraphLayer,
  hasTerminalPrefix,
  isCallingCodeState,
  isCallingCodeStateTerminal,
} from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { NumberResolverSnapshot } from './models';
import { resolveLatestConcreteCountryIndex } from './resolve-first-matching-number-type-profile';
import { stateMatchesFilters } from './utils/state-matches-filters';
import { terminalStateMatchesFilters } from './utils/terminal-state-matches-filters';

export class NumberResolver {
  private static readonly INITIAL_CAPACITY: number = 64;

  private readonly resourceProvider: ResourceProvider = getResourceProvider();

  private readonly graphLayer: GraphLayer = this.resourceProvider.graphLayer;

  private readonly callingCodeLayer: CallingCodeLayer = this.resourceProvider.callingCodeLayer;

  private _state: number = 0;

  private _terminalStates: number[] = new Array(NumberResolver.INITIAL_CAPACITY).fill(0);

  private _terminalStatesLength: number = 0;

  private _terminalStateEnds: number[] = new Array(NumberResolver.INITIAL_CAPACITY).fill(0);

  private _terminalStateEndsLength: number = 0;

  private _nationalStates: number[] = new Array(NumberResolver.INITIAL_CAPACITY).fill(0);

  private _nationalStatesLength: number = 0;

  private _nationalDigitString: string = '';

  private _callingCodeDigitString: string = '';

  private _callingCodeCompleted: boolean = false;

  private _callingCodeState: number = -1;

  private _countryFilter: BinaryFilter | null = null;

  private _numberTypeFilter: BinaryFilter | null = null;

  private _strict: boolean = false;

  advance(digit: number): void {
    const deadStateId: number = this.graphLayer.deadStateId;
    const digitChar: string = String.fromCharCode(48 + digit);

    if (this._state === deadStateId) {
      this._nationalDigitString += digitChar;
      this._nationalStates[this._nationalStatesLength++] = deadStateId;
      this._terminalStateEnds[this._terminalStateEndsLength++] = this._terminalStatesLength;
      return;
    }

    let state: number = getNextGraphState(this.graphLayer, this._state, digit);
    const filtersActive: boolean = this._countryFilter !== null || this._numberTypeFilter !== null;

    if (
      state !== deadStateId &&
      filtersActive &&
      !stateMatchesFilters(state, this._countryFilter, this._numberTypeFilter)
    ) {
      state = deadStateId;
    }

    this._state = state;

    if (state === deadStateId) {
      this._nationalDigitString += digitChar;
      this._nationalStates[this._nationalStatesLength++] = state;
      this._terminalStateEnds[this._terminalStateEndsLength++] = this._terminalStatesLength;
      return;
    }

    const isCallingCode: boolean = isCallingCodeState(this.callingCodeLayer, state);

    if (isCallingCode) {
      this._callingCodeDigitString += digitChar;
      this._callingCodeState = state;
      this._callingCodeCompleted = isCallingCodeStateTerminal(this.callingCodeLayer, state);
    } else {
      this._nationalDigitString += digitChar;
      this._nationalStates[this._nationalStatesLength++] = state;
    }

    if (
      hasTerminalPrefix(this.graphLayer, state) &&
      (!filtersActive || terminalStateMatchesFilters(state, this._countryFilter, this._numberTypeFilter))
    ) {
      this._terminalStates[this._terminalStatesLength++] = state;
    }

    if (!isCallingCode && this._callingCodeCompleted) {
      this._terminalStateEnds[this._terminalStateEndsLength++] = this._terminalStatesLength;
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
    this._terminalStatesLength = 0;
    this._terminalStateEndsLength = 0;
    this._nationalStatesLength = 0;
    this._nationalDigitString = '';
    this._callingCodeDigitString = '';
    this._callingCodeCompleted = false;
    this._callingCodeState = -1;
  }

  resolveLatestConcreteCountryIndex(snapshot?: NumberResolverSnapshot): number {
    return resolveLatestConcreteCountryIndex(snapshot ?? this.snapshot, this._nationalStates, this._terminalStateEnds);
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

  get terminalStates(): readonly number[] {
    return this._terminalStates.slice(0, this._terminalStatesLength);
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
      state: this._state,
      terminalStates: this._terminalStates.slice(0, this._terminalStatesLength),
      callingCodeDigits: this.getCallingCode(),
      nationalDigits: this.getNationalNumber(),
      callingCodeCompleted: this._callingCodeCompleted,
      callingCodeState: this._callingCodeState,
      countryFilter: this._countryFilter,
      numberTypeFilter: this._numberTypeFilter,
      strict: this._strict,
    };
  }
}

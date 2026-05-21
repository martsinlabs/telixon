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
  private readonly resourceProvider: ResourceProvider = getResourceProvider();

  private readonly graphLayer: GraphLayer = this.resourceProvider.graphLayer;

  private readonly callingCodeLayer: CallingCodeLayer = this.resourceProvider.callingCodeLayer;

  private _state: number = 0;

  private _terminalStates: number[] = [];

  private _terminalStateEnds: number[] = [];

  private _callingCodeDigits: number[] = [];

  private _nationalDigits: number[] = [];

  private _nationalStates: number[] = [];

  private _callingCodeCompleted: boolean = false;

  private _callingCodeState: number = -1;

  private _countryFilter: BinaryFilter | null = null;

  private _numberTypeFilter: BinaryFilter | null = null;

  private _strict: boolean = false;

  advance(digit: number): void {
    const deadStateId: number = this.graphLayer.deadStateId;

    if (this._state === deadStateId) {
      this._nationalDigits.push(digit);
      this._nationalStates.push(deadStateId);
      this._terminalStateEnds.push(this._terminalStates.length);
      return;
    }

    let state: number = getNextGraphState(this.graphLayer, this._state, digit);

    if (state !== deadStateId && !stateMatchesFilters(state, this._countryFilter, this._numberTypeFilter)) {
      state = deadStateId;
    }

    this._state = state;

    if (state === deadStateId) {
      this._nationalDigits.push(digit);
      this._nationalStates.push(state);
      this._terminalStateEnds.push(this._terminalStates.length);
      return;
    }

    if (isCallingCodeState(this.callingCodeLayer, state)) {
      this._callingCodeDigits.push(digit);
      this._callingCodeState = state;
      this._callingCodeCompleted = isCallingCodeStateTerminal(this.callingCodeLayer, state);
    } else {
      this._nationalDigits.push(digit);
      this._nationalStates.push(state);
    }

    if (
      hasTerminalPrefix(this.graphLayer, state) &&
      terminalStateMatchesFilters(state, this._countryFilter, this._numberTypeFilter)
    ) {
      this._terminalStates.push(state);
    }

    if (!isCallingCodeState(this.callingCodeLayer, state) && this._callingCodeCompleted) {
      this._terminalStateEnds.push(this._terminalStates.length);
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
    this._terminalStates.length = 0;
    this._terminalStateEnds.length = 0;
    this._callingCodeDigits.length = 0;
    this._nationalDigits.length = 0;
    this._nationalStates.length = 0;
    this._callingCodeCompleted = false;
    this._callingCodeState = -1;
  }

  resolveLatestConcreteCountryIndex(): number {
    return resolveLatestConcreteCountryIndex(this.snapshot, this._nationalStates, this._terminalStateEnds);
  }

  getCallingCode(): string {
    return this._callingCodeDigits.join('');
  }

  getNationalNumber(): string {
    return this._nationalDigits.join('');
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
    return this._terminalStates;
  }

  get nationalNumberLength(): number {
    return this._nationalDigits.length;
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
      terminalStates: this._terminalStates.slice(),
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

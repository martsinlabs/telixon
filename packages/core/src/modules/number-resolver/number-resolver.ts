import {
  CallingCodeLayer,
  getNextGraphState,
  GraphLayer,
  hasTerminalPrefix,
  isCallingCodeState,
} from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { NumberResolverSnapshot } from './models';
import { stateMatchesFilters } from './utils/state-matches-filters';
import { terminalStateMatchesFilters } from './utils/terminal-state-matches-filters';

export class NumberResolver {
  private readonly resourceProvider: ResourceProvider = getResourceProvider();

  private readonly graphLayer: GraphLayer = this.resourceProvider.graphLayer;

  private readonly callingCodeLayer: CallingCodeLayer = this.resourceProvider.callingCodeLayer;

  private _state: number = 0;

  private _terminalStates: number[] = [];

  private _callingCodeDigits: number[] = [];

  private _nationalDigits: number[] = [];

  private _countryFilter: BinaryFilter | null = null;

  private _numberTypeFilter: BinaryFilter | null = null;

  advance(digit: number): void {
    this._state = getNextGraphState(this.graphLayer, this._state, digit);

    if (
      this._state !== this.graphLayer.deadStateId &&
      !stateMatchesFilters(this._state, this._countryFilter, this._numberTypeFilter)
    ) {
      this._state = this.graphLayer.deadStateId;
    }

    if (isCallingCodeState(this.callingCodeLayer, this._state)) {
      this._callingCodeDigits.push(digit);
    } else {
      this._nationalDigits.push(digit);
    }

    const isTerminal: boolean = hasTerminalPrefix(this.graphLayer, this._state);

    if (isTerminal && terminalStateMatchesFilters(this._state, this._countryFilter, this._numberTypeFilter)) {
      this._terminalStates.push(this._state);
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
    this._callingCodeDigits.length = 0;
    this._nationalDigits.length = 0;
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

  get state(): number {
    return this._state;
  }

  get terminalStates(): readonly number[] {
    return this._terminalStates;
  }

  get snapshot(): NumberResolverSnapshot {
    return {
      state: this._state,
      terminalStates: this._terminalStates,
      callingCodeDigits: this.getCallingCode(),
      nationalDigits: this.getNationalNumber(),
      countryFilter: this._countryFilter,
      numberTypeFilter: this._numberTypeFilter,
    };
  }
}

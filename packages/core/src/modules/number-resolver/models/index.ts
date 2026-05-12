import { BinaryFilter } from '@telixon/core/models';

export interface NumberResolverSnapshot {
  readonly state: number;
  readonly terminalStates: number[];
  readonly callingCodeDigits: string;
  readonly nationalDigits: string;
  readonly callingCodeCompleted: boolean;
  readonly callingCodeState: number;
  readonly countryFilter: BinaryFilter | null;
  readonly numberTypeFilter: BinaryFilter | null;
  readonly strict: boolean;
}

export interface NumberTypeProfileRef {
  stateCountryIndex: number;
  numberTypeIndex: number;
  numberTypeProfileId: number;
}

export interface NumberFormatRef extends NumberTypeProfileRef {
  formatIndex: number;
}

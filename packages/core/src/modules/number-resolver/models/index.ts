import { BinaryFilter } from '@telixon/core/models';

export interface NumberResolverSnapshot {
  readonly state: number;
  readonly lastTerminalState: number;
  readonly callingCodeDigits: string;
  readonly nationalDigits: string;
  readonly countryFilter: BinaryFilter | null;
  readonly numberTypeFilter: BinaryFilter | null;
}

export interface NumberFormatRef {
  stateCountryIndex: number;
  numberTypeIndex: number;
  numberTypeProfileId: number;
  formatIndex: number;
}

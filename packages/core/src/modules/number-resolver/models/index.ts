import { BinaryFilter } from '@telixon/core/models';

export interface NumberResolverSnapshot {
  // Deepest non-dead state of the walk; with the national digit count it keys verdicts and exact data.
  readonly endState: number;
  readonly callingCodeDigits: string;
  readonly nationalDigits: string;
  readonly callingCodeCompleted: boolean;
  readonly callingCodeState: number;
  readonly regionFilter: BinaryFilter | null;
  readonly numberTypeFilter: BinaryFilter | null;
  readonly strict: boolean;
}

export interface NumberTypeProfileRef {
  // Region the profile belongs to (regions.indexToKey index).
  regionIndex: number;
  // Priority-order position of the type within the region's numberTypes.
  numberTypeIndex: number;
  numberTypeProfileId: number;
}

export interface NumberFormatRef extends NumberTypeProfileRef {
  formatIndex: number;
}

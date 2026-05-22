import { RegionId } from '@telixon/core/engine';

export interface NationalInputControllerConfig {
  country: RegionId;
  strict?: boolean;
  initialValue?: string;
  maxHistorySize?: number;
}

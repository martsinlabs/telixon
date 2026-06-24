import { RegionCode } from '@telixon/core/engine';

export interface NationalInputControllerConfig {
  region: RegionCode;
  strict?: boolean;
  initialValue?: string;
  maxHistorySize?: number;
}

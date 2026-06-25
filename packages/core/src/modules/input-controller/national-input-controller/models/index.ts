import { RegionCode } from '@telixon/core/engine';

export interface NationalInputControllerConfig {
  defaultRegion: RegionCode;
  strict?: boolean;
  initialValue?: string;
  maxHistorySize?: number;
}

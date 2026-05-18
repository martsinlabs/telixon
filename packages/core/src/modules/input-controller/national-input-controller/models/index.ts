import { CountryId } from '@telixon/core/engine';

export interface NationalInputControllerConfig {
  country: CountryId;
  strict?: boolean;
  initialValue?: string;
  maxHistorySize?: number;
}

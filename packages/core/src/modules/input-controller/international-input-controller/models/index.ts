import { RegionCode } from '@telixon/core/engine';

export type InternationalDisplayConfig =
  | { readonly callingCodeInInput: false }
  | { readonly callingCodeInInput: true; readonly plusPrefix: boolean };

export type InternationalInputControllerConfig =
  | {
      defaultRegion?: RegionCode;
      strict?: boolean;
      initialValue?: string;
      maxHistorySize?: number;
      display?: Extract<InternationalDisplayConfig, { callingCodeInInput: true }>;
    }
  | {
      defaultRegion: RegionCode;
      strict?: boolean;
      initialValue?: string;
      maxHistorySize?: number;
      display: Extract<InternationalDisplayConfig, { callingCodeInInput: false }>;
    };

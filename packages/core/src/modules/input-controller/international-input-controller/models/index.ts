import { RegionId } from '@telixon/core/engine';

export type InternationalDisplayConfig =
  | { readonly callingCodeInInput: false }
  | { readonly callingCodeInInput: true; readonly plusPrefix: boolean };

export type InternationalInputControllerConfig =
  | {
      defaultCountry?: RegionId;
      strict?: boolean;
      initialValue?: string;
      maxHistorySize?: number;
      display?: Extract<InternationalDisplayConfig, { callingCodeInInput: true }>;
    }
  | {
      defaultCountry: RegionId;
      strict?: boolean;
      initialValue?: string;
      maxHistorySize?: number;
      display: Extract<InternationalDisplayConfig, { callingCodeInInput: false }>;
    };

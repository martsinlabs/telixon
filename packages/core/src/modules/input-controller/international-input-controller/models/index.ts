import { CountryId } from '@telixon/core/engine';

export type InternationalDisplayConfig =
  | { readonly callingCodeInInput: false }
  | { readonly callingCodeInInput: true; readonly plusPrefix: boolean };

export type InternationalInputControllerConfig =
  | {
      defaultCountry?: CountryId;
      strict?: boolean;
      initialValue?: string;
      maxHistorySize?: number;
      display?: Extract<InternationalDisplayConfig, { callingCodeInInput: true }>;
    }
  | {
      defaultCountry: CountryId;
      strict?: boolean;
      initialValue?: string;
      maxHistorySize?: number;
      display: Extract<InternationalDisplayConfig, { callingCodeInInput: false }>;
    };

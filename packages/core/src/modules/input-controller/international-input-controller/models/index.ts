import { RegionCode } from '@telixon/core/engine';

// 'none' renders no plus, 'fixed' renders a permanent plus, 'erasable' renders a plus the user can delete and retype.
export type PlusPrefixMode = 'none' | 'fixed' | 'erasable';

export type InternationalDisplayConfig =
  | { readonly callingCodeInInput: false }
  | { readonly callingCodeInInput: true; readonly plusPrefix: PlusPrefixMode };

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

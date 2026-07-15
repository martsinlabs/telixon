import { RegionCode } from '@telixon/core/engine';

/**
 * How the leading `+` renders: `none` never shows it, `fixed` always shows it, `erasable` shows it
 * only while the value carries one.
 */
export type PlusPrefixMode = 'none' | 'fixed' | 'erasable';

/**
 * Where the calling code lives. `callingCodeInInput: true`: the field holds calling-code digits
 * (`1 415…` resolves as US) and `plusPrefix` controls the `+`. `false`: the field holds national
 * digits only.
 */
export type InternationalDisplayConfig =
  | { readonly callingCodeInInput: false }
  | { readonly callingCodeInInput: true; readonly plusPrefix: PlusPrefixMode };

/**
 * Config for {@link createInternationalInputController}. `defaultRegion` is required only when the
 * calling code is not shown in the input. `strict`, `initialValue`, and `maxHistorySize` match
 * {@link NationalInputControllerConfig}.
 */
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

export type InternationalDisplayConfig =
  | { readonly callingCodeInInput: false }
  | { readonly callingCodeInInput: true; readonly plusPrefix: boolean };

export type InternationalInputControllerConfig =
  | {
      defaultCountry?: string;
      strict?: boolean;
      initialValue?: string;
      maxHistorySize?: number;
      display?: Extract<InternationalDisplayConfig, { callingCodeInInput: true }>;
    }
  | {
      defaultCountry: string;
      strict?: boolean;
      initialValue?: string;
      maxHistorySize?: number;
      display: Extract<InternationalDisplayConfig, { callingCodeInInput: false }>;
    };

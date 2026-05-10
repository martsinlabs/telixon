export type InternationalDisplayConfig =
  | { readonly callingCodeInInput: false }
  | { readonly callingCodeInInput: true; readonly plusPrefix: boolean };

export type InternationalInputControllerConfig =
  | {
      defaultCountry?: string;
      initialValue?: string;
      display?: Extract<InternationalDisplayConfig, { callingCodeInInput: true }>;
    }
  | {
      defaultCountry: string;
      initialValue?: string;
      display: Extract<InternationalDisplayConfig, { callingCodeInInput: false }>;
    };

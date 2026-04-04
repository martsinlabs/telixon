export interface InternationalInputControllerConfig {
  initialCountry?: string;

  display?: {
    includePlusPrefix?: boolean;
    includeCallingCode?: boolean;
  };
}

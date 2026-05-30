import type {
  InternationalInputControllerConfig,
  NationalInputControllerConfig,
  NumberType,
  PhoneNumber,
  RegionId,
} from '@telixon/core';

type PhoneInputBaseOptions = {
  input: PhoneInputElement;
  initialValue?: string;
  countryFilter?: readonly RegionId[] | null;
  numberTypeFilter?: readonly NumberType[] | null;
};

export type PhoneInputElement = HTMLInputElement;

export type PhoneInputState = {
  value: string;
  country: RegionId | null;
  selectionStart: number;
  selectionEnd: number;
  countryFilter: readonly RegionId[] | null;
  numberTypeFilter: readonly NumberType[] | null;
};

export type NationalPhoneInputOptions = { mode: 'national' } & PhoneInputBaseOptions & NationalInputControllerConfig;

export type InternationalPhoneInputOptions = {
  mode: 'international';
} & PhoneInputBaseOptions &
  InternationalInputControllerConfig;

export type PhoneInputOptions = NationalPhoneInputOptions | InternationalPhoneInputOptions;

export type PhoneInputListener = (state: PhoneInputState) => void;

export type PhoneInput = {
  subscribe(listener: PhoneInputListener): () => void;
  setValue(value: string): void;
  setCountry(country: RegionId): void;
  getState(): PhoneInputState;
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): void;
  redo(): void;
  seal(): void;
  getPhoneNumber(): PhoneNumber;
  setCountryFilter(countries: readonly RegionId[] | null): void;
  setNumberTypeFilter(numberTypes: readonly NumberType[] | null): void;
  destroy(): void;
};

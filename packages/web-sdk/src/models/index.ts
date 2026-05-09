import type { InternationalInputControllerConfig, NationalInputControllerConfig } from '@telixon/core';

type PhoneInputBaseOptions = {
  input: PhoneInputElement;
  initialValue?: string;
};

export type PhoneInputElement = HTMLInputElement;

export type PhoneInputState = {
  value: string;
  country: string | null;
  selectionStart: number;
  selectionEnd: number;
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
  setCountry(country: string): void;
  getState(): PhoneInputState;
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): void;
  redo(): void;
  destroy(): void;
};

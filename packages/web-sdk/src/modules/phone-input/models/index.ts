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

/**
 * The DOM element that PhoneInput attaches to. Must be an `<input type="text">` or `<input type="tel">`.
 */
export type PhoneInputElement = HTMLInputElement;

/**
 * Snapshot of the input controller produced after every state change.
 *
 * - `value`: formatted phone string currently in the input.
 * - `country`: ISO region code resolved from the digits, or `null` when unresolved.
 * - `selectionStart` / `selectionEnd`: caret range within `value` after the last operation.
 * - `countryFilter` / `numberTypeFilter`: active filter values (`null` = no restriction).
 */
export type PhoneInputState = {
  value: string;
  country: RegionId | null;
  selectionStart: number;
  selectionEnd: number;
  countryFilter: readonly RegionId[] | null;
  numberTypeFilter: readonly NumberType[] | null;
};

/**
 * Options for a national PhoneInput. `country` selects the territory whose national formatting applies.
 */
export type NationalPhoneInputOptions = { mode: 'national' } & PhoneInputBaseOptions & NationalInputControllerConfig;

/**
 * Options for an international PhoneInput. By default the calling code is part of the input value;
 * set `display.callingCodeInInput: false` (with a `defaultCountry`) to keep it outside the input.
 */
export type InternationalPhoneInputOptions = {
  mode: 'international';
} & PhoneInputBaseOptions &
  InternationalInputControllerConfig;

/**
 * Discriminated union of PhoneInput options keyed by `mode`.
 */
export type PhoneInputOptions = NationalPhoneInputOptions | InternationalPhoneInputOptions;

/**
 * Subscriber callback. Receives the latest state on every emit.
 */
export type PhoneInputListener = (state: PhoneInputState) => void;

/**
 * Headless phone input controller bound to a DOM `<input>`.
 *
 * Subscribe to receive state changes; call mutators to drive the controller. The initial state is
 * applied to the DOM at construction but not emitted to subscribers. Call `getState()` after
 * `subscribe` to read the bootstrap value. Call `destroy` to detach all listeners.
 */
export type PhoneInput = {
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: PhoneInputListener): () => void;
  /** Replace the current value with the given digits as a single parse-and-format operation. Pushes a new history entry. */
  setValue(value: string): void;
  /** Switch the active country and re-resolve the current digits under its rules. Pushes a new history entry. */
  setCountry(country: RegionId): void;
  /** Read the current state without subscribing. */
  getState(): PhoneInputState;
  /** True when an undo step is available. */
  canUndo(): boolean;
  /** True when a redo step is available. */
  canRedo(): boolean;
  /** Revert to the previous history entry. No-op when `canUndo()` is false. */
  undo(): void;
  /** Restore the next history entry. No-op when `canRedo()` is false. */
  redo(): void;
  /** Collapse undo history to a single current entry. */
  seal(): void;
  /** Build a {@link PhoneNumber} from the current digits and resolution. */
  getPhoneNumber(): PhoneNumber;
  /** Restrict resolution to the given regions. `null` removes the restriction. No-op when the value is unchanged. */
  setCountryFilter(countries: readonly RegionId[] | null): void;
  /** Restrict resolution to the given number types. `null` removes the restriction. No-op when the value is unchanged. */
  setNumberTypeFilter(numberTypes: readonly NumberType[] | null): void;
  /** Detach all DOM listeners and clear subscribers. Idempotent. */
  destroy(): void;
};

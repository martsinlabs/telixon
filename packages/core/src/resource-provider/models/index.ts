import { Engine, MetadataNumberType, RegionId } from '@telixon/core/engine';

// The three formatter placeholders, decoded once at load (PhoneNumberFormattingContext inputs).
export interface MetadataPlaceholders {
  readonly digitPlaceholder: string;
  readonly ignoredDigitPlaceholder: string;
  readonly nationalPrefixPlaceholder: string;
}

export abstract class ResourceProvider {
  // The assembled engine; every engine accessor takes it as its first argument.
  abstract engine: Engine;

  // Hot-path tables derived once at load: string accessors allocate, these reads do not.
  abstract regionIds: readonly RegionId[];
  abstract regionKeyToIndex: Readonly<Record<string, number>>;
  abstract callingCodeIndexByCode: Readonly<Record<number, number>>;
  // Country index to calling-code index (per-keystroke formatting path).
  abstract callingCodeIndexByCountry: Int16Array;
  abstract numberTypeNames: readonly MetadataNumberType[];
  // 1 = the region declares leadingDigits (region disambiguation by prefix instead of by type).
  abstract regionHasLeadingDigits: Uint8Array;
  abstract placeholders: MetadataPlaceholders;

  abstract ensureReady(): Promise<void>;

  abstract ensureReadySync(): void;

  abstract get isReady(): boolean;
}

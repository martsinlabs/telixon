/**
 * @public
 * Calling code layer structure.
 */
export declare interface CallingCodeLayer {
    stateRegionOffset: Uint16Array;
    stateRegionCount: Uint8Array;
    regionIndexPool: Uint8Array;
    statePrimaryRegion: Uint8Array;
    stateFlags: Uint8Array;
}

/**
 * @public
 * Returns true if the given length is encoded in the bitmask.
 */
export declare function containsLength(mask: number, length: number): boolean;

/**
 * @public
 * Engine layout manifest.
 */
export declare const ENGINE_LAYOUT: {
    readonly ROOT: "engine";
    readonly ENTRY: {
        readonly JS: "index.js";
        readonly DTS: "index.d.ts";
    };
    readonly PROVENANCE: "PROVENANCE.json";
    readonly DFA: {
        readonly FOLDER: "dfa";
        readonly FILES: {
            readonly GRAPH: "graph.bin";
            readonly CALLING_CODES: "calling-codes.bin";
            readonly COUNTRY_SCOPE: "country-scope.bin";
            readonly NUMBER_TYPE_SCOPE: "number-type-scope.bin";
            readonly NUMBER_TYPE_PROFILE: "number-type-profile.bin";
        };
    };
    readonly METADATA: {
        readonly FOLDER: "metadata";
        readonly FILES: {
            readonly FORMATS: "formats.json";
            readonly TERRITORIES: "territories.json";
            readonly REFERENCE_MAPPING: "reference-mapping.json";
        };
    };
};

/**
 * @public
 * Iterates over all set format bit indices in ascending order.
 */
export declare function forEachFormatIndex(mask: number, callback: (index: number) => StopIteration): void;

/**
 * @public
 * Iterates over all set length values encoded in the bitmask.
 */
export declare function forEachLength(mask: number, callback: (length: number) => StopIteration): void;

/**
 * @public
 * Iterates over number type indices encoded in the mask.
 */
export declare function forEachNumberTypeIndex(mask: number, callback: (typeIndex: number) => StopIteration): void;

/**
 * @public
 * Iterates over all region indices associated with a calling code state.
 * Stops iteration if the callback returns true.
 */
export declare function forEachRegionInCallingCodeState(layer: CallingCodeLayer, state: number, callback: (regionIndex: number) => StopIteration): void;

/**
 * @public
 * Iterates over all regions assigned to a state.
 */
export declare function forEachStateRegion(scope: RegionScopeLayer, state: number, callback: (stateRegionIndex: number, regionIndex: number) => StopIteration): void;

/**
 * @public
 * Iterates over regions of a state that have a terminal prefix.
 */
export declare function forEachStateRegionWithTerminalPrefix(scope: RegionScopeLayer, state: number, callback: (stateRegionIndex: number, regionIndex: number) => StopIteration): void;

/**
 * @public
 * Formats a phone number according to the provided formatting context.
 */
export declare function formatNumber(context: PhoneNumberFormattingContext, caretIndex?: number, direction?: FormattingDirection): {
    formatted: string;
    caretIndex: number;
};

/**
 * @public
 * Formats the national number and returns the caret position aligned to the given raw digit index.
 */
export declare function formatNumberWithRawCaret(context: PhoneNumberFormattingContext, rawCaretIndex: number, direction: FormattingDirection): FormattedWithCaret;

/**
 * @public
 * Table of phone number formats.
 */
export declare type FormatsTable = PhoneNumberFormatList[];

/**
 * @public
 * Formatted phone number with the corresponding caret position.
 */
export declare interface FormattedWithCaret {
    formatted: string;
    caretIndex: number;
}

/**
 * @public
 * Input direction. `backward` strips trailing formatting characters
 * after the last digit; `forward` retains them.
 */
export declare type FormattingDirection = 'forward' | 'backward';

/**
 * @public
 * Get primary region for calling code state.
 */
export declare function getCallingCodePrimaryRegion(layer: CallingCodeLayer, state: number): number;

/**
 * @public
 * Returns a calling code state's regions in libphonenumber `countryCallingCodeToRegionCodeMap`
 * order — the main region first, then the rest in document order. Iterate this and return the first
 * region the number validates for to resolve a region the way `getRegionCodeForNumber` does.
 */
export declare function getCallingCodeStateRegions(layer: CallingCodeLayer, state: number): Uint8Array;

/**
 * @public
 * Returns lowest set bit index from a format mask.
 */
export declare function getFirstFormatIndex(mask: number): number;

/**
 * @public
 * Returns format bitmask for a given profile id.
 */
export declare function getFormatMask(profile: NumberTypeProfileLayer, profileId: number): number;

/**
 * @public
 * Returns length bitmask for a given profile id.
 */
export declare function getLengthMask(profile: NumberTypeProfileLayer, profileId: number): number;

/**
 * @public
 * Returns the maximum length encoded in the bitmask (position of highest set bit).
 */
export declare function getMaxLength(mask: number): number;

/**
 * @public
 * Returns next graph state for given state and digit.
 */
export declare function getNextGraphState(graph: GraphLayer, state: number, digit: number): number;

/**
 * @public
 * Returns all number type indices encoded in the mask.
 */
export declare function getNumberTypeIndicesFromMask(mask: number): number[];

/**
 * @public
 * Returns number type mask for a given state-region index.
 */
export declare function getNumberTypeMask(scope: NumberTypeScopeLayer, stateRegionIndex: number): number;

/**
 * @public
 * Computes profile id for a number type using bit position within typeMask
 * and state-region base offset.
 */
export declare function getNumberTypeProfileId(profile: NumberTypeProfileLayer, stateRegionIndex: number, typeMask: number, typeIndex: number): number;

/**
 * @public
 * Returns the region index for a given stateRegionIndex.
 */
export declare function getRegionIndex(scope: RegionScopeLayer, stateRegionIndex: number): number;

/**
 * @public
 * Returns a view over region indices assigned to a state.
 */
export declare function getStateRegions(scope: RegionScopeLayer, state: number): Uint8Array;

/**
 * @public
 * Returns region indices of a state that have a terminal prefix.
 */
export declare function getStateRegionsWithTerminalPrefix(scope: RegionScopeLayer, state: number): number[];

/**
 * @public
 * Returns terminal-prefix number type mask
 * for the given state-region index.
 */
export declare function getTerminalPrefixNumberTypeMask(scope: NumberTypeScopeLayer, stateRegionIndex: number): number;

/**
 * @public
 * Graph layer structure.
 */
export declare interface GraphLayer {
    stateTransitionIndex: Uint32Array;
    transitionTable: Uint32Array;
    deadStateId: number;
    stateHasTerminal: Uint8Array;
}

/**
 * @public
 * Checks if region exists in calling code state.
 */
export declare function hasRegionInCallingCodeState(layer: CallingCodeLayer, state: number, regionIndex: number): boolean;

/**
 * @public
 * Checks whether the given state has a terminal prefix.
 */
export declare function hasTerminalPrefix(graph: GraphLayer, state: number): boolean;

/**
 * @public
 * Is state part of a calling code.
 */
export declare function isCallingCodeState(layer: CallingCodeLayer, state: number): boolean;

/**
 * @public
 * Checks if state is terminal for calling code (only national digits follow).
 */
export declare function isCallingCodeStateTerminal(layer: CallingCodeLayer, state: number): boolean;

/**
 * @public
 * Checks if state is the end of a valid calling code.
 */
export declare function isCallingCodeStateValid(layer: CallingCodeLayer, state: number): boolean;

/**
 * @public
 * Subset of {@link NumberType} that maps 1:1 to XML metadata elements.
 * Drops runtime-only `FIXED_LINE_OR_MOBILE`/`UNKNOWN`, adds catch-all
 * `GENERAL_DESC`. Used as keys in `ReferenceMapping.numberTypes` and as
 * bit positions in the DFA number-type bitmask.
 */
export declare type MetadataNumberType = Exclude<NumberType, 'FIXED_LINE_OR_MOBILE' | 'UNKNOWN'> | 'GENERAL_DESC';

/**
 * @public
 * Result of {@link normalizeNationalNumber}.
 *
 * `normalizedDigits` / `caretIndex` are the parse- and validation-time form (prefix strip +
 * `nationalPrefixTransformRule`). `displayDigits` / `displayCaretIndex` are the as-you-type form,
 * which drops digit-adding transforms so no untyped digits ever surface mid-typing.
 */
export declare interface NormalizedNationalNumber {
    normalizedDigits: string;
    caretIndex: number;
    displayDigits: string;
    displayCaretIndex: number;
}

/**
 * @public
 * Normalizes national digits and remaps the caret position accordingly.
 *
 * Returns two views of the input: `normalizedDigits` for parsing/validation, and `displayDigits`
 * for as-you-type formatting (see {@link NormalizedNationalNumber}).
 */
export declare function normalizeNationalNumber(digits: string, territory: TerritorySpec, caretIndex?: number): NormalizedNationalNumber;

/**
 * @public
 * Phone number type per libphonenumber `PhoneNumberType`. Adds runtime-only
 * `FIXED_LINE_OR_MOBILE` (ambiguous region) and `UNKNOWN` (no pattern match).
 * For the metadata-category subset, see {@link MetadataNumberType}.
 */
export declare type NumberType = 'FIXED_LINE' | 'MOBILE' | 'FIXED_LINE_OR_MOBILE' | 'TOLL_FREE' | 'PREMIUM_RATE' | 'SHARED_COST' | 'VOIP' | 'PERSONAL_NUMBER' | 'PAGER' | 'UAN' | 'VOICEMAIL' | 'UNKNOWN';

/**
 * @public
 * Number type index.
 */
export declare type NumberTypeIndex = number;

/**
 * @public
 * Number type profile layer structure.
 */
export declare interface NumberTypeProfileLayer {
    baseOffset: Uint32Array;
    profileIndexPool: Uint16Array;
    formatMaskPool: Uint32Array;
    lengthMaskPool: Uint32Array;
}

/**
 * @public
 * Number type scope layer structure.
 */
export declare interface NumberTypeScopeLayer {
    numberTypeMask: Uint16Array;
    terminalTypeMask: Uint16Array;
}

/**
 * @public
 * Parse calling code binary buffer.
 */
export declare function parseCallingCodeBinary(buffer: ArrayBuffer): CallingCodeLayer;

/**
 * @public
 * Parse graph binary buffer.
 */
export declare function parseGraphBinary(buffer: ArrayBuffer): GraphLayer;

/**
 * @public
 * Parses NumberTypeProfileLayer from its binary representation.
 */
export declare function parseNumberTypeProfileBinary(buffer: ArrayBuffer): NumberTypeProfileLayer;

/**
 * @public
 * Parses NumberTypeScopeLayer from its binary representation.
 */
export declare function parseNumberTypeScopeBinary(buffer: ArrayBuffer): NumberTypeScopeLayer;

/**
 * @public
 * Parse region scope binary buffer.
 */
export declare function parseRegionScopeBinary(buffer: ArrayBuffer): RegionScopeLayer;

/**
 * @public
 * Phone number format schema.
 */
export declare interface PhoneNumberFormat {
    pattern: string;
    format: string;
    intlFormat?: 'NA' | string;
    leadingDigits: string;
    leadingDigitsPatterns?: readonly string[];
    carrierCodeFormattingRule?: string;
    nationalPrefixFormattingRule?: string;
    nationalPrefixOptionalWhenFormatting?: string;
    lengthRange: [number, number];
    masks: PhoneNumberMasks;
}

/**
 * @public
 * List of phone number formats.
 */
export declare type PhoneNumberFormatList = readonly PhoneNumberFormat[];

/**
 * @public
 * Phone number formatting context.
 */
export declare interface PhoneNumberFormattingContext {
    mask: string;
    nationalNumber: string;
    digitPlaceholder: string;
    nationalPrefixPlaceholder: string;
    ignoredDigitPlaceholder: string;
    nationalPrefix?: string;
}

/**
 * @public
 * Generated phone number masks, keyed by national-significant-number length. Fixed-length formats
 * have a single entry; variable-length formats have one mask per accepted length. A consumer reads
 * `masks.<kind>[nsn.length]`, falling back to the longest entry while the number is incomplete.
 */
export declare interface PhoneNumberMasks {
    /** One placeholder mask per accepted NSN length, built from the national template. */
    national: Record<number, string>;
    /** As {@link PhoneNumberMasks.national}, with the national-prefix placeholder; present only when the territory has one. */
    nationalWithPrefix?: Record<number, string>;
    /** As {@link PhoneNumberMasks.national}, built from the international template; omitted when `intlFormat` is `NA`. */
    international?: Record<number, string>;
}

/**
 * @public
 * Phone number type schema.
 */
export declare interface PhoneNumberType {
    type: NumberTypeIndex;
    possibleLengths?: PossibleLengths;
    nationalNumberPattern: string;
    exampleNumber?: number;
}

/**
 * @public
 * List of phone number types.
 */
export declare type PhoneNumberTypeList = readonly PhoneNumberType[];

/**
 * @public
 * National + optional local-only length masks.
 */
export declare interface PossibleLengths {
    national: PossibleLengthsMask;
    localOnly?: PossibleLengthsMask;
}

/**
 * @public
 * 32-bit length bitmask; bit `n` set ⇒ length `n` is valid.
 */
export declare type PossibleLengthsMask = number;

/**
 * @public
 * Reference mapping schema.
 */
export declare type ReferenceMapping = {
    regions: {
        indexToKey: RegionId[];
        keyToIndex: Record<RegionId, number>;
    };
    callingCodes: {
        indexToKey: number[];
        keyToIndex: Record<number, number>;
    };
    numberTypes: readonly MetadataNumberType[];
    digitPlaceholder: string;
    ignoredDigitPlaceholder: string;
    nationalPrefixPlaceholder: string;
};

/**
 * @public
 * CLDR two-letter region codes recognized by the engine. Source of truth for
 * {@link RegionId}; cross-checked against raw XML by `raw-metadata-validator`.
 * Excludes the non-geographical `'001'` (filtered by the raw loader).
 */
export declare const REGION_IDS: readonly ["AC", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GT", "GU", "GW", "GY", "HK", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TA", "TC", "TD", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW"];

/**
 * @public
 * Territory identifier per CLDR two-letter region code.
 * Derived from {@link REGION_IDS} so the literal union and runtime list
 * cannot drift apart.
 */
export declare type RegionId = (typeof REGION_IDS)[number];

/**
 * @public
 * Region scope layer structure.
 */
export declare interface RegionScopeLayer {
    stateOffset: Uint32Array;
    stateLength: Uint8Array;
    regionPool: Uint8Array;
    regionHasTerminal: Uint8Array;
}

/**
 * @public
 * Signals whether iteration should stop.
 *
 * true → stop iteration
 * void → continue iteration
 */
export declare type StopIteration = true | void;

/**
 * @public
 * Territory specification schema.
 */
export declare interface TerritorySpec {
    id: RegionId;
    countryCode: string;
    internationalPrefix?: string;
    leadingDigits?: string;
    mainCountryForCode?: string;
    mobileNumberPortableRegion?: string;
    nationalPrefix?: string;
    nationalPrefixForParsing?: string;
    nationalPrefixTransformRule?: string;
    preferredExtnPrefix?: string;
    preferredInternationalPrefix?: string;
    noInternationalDialling?: string;
    possibleLengths: PossibleLengths;
    numberTypes: PhoneNumberTypeList;
}

/**
 * @public
 * Table of territory specifications.
 */
export declare type TerritorySpecTable = readonly TerritorySpec[];

/**
 * @public
 * Map metadata number types to public {@link NumberType} per libphonenumber
 * `getNumberType` semantics: drops `GENERAL_DESC`, collapses
 * `FIXED_LINE`+`MOBILE` into `FIXED_LINE_OR_MOBILE`, returns `['UNKNOWN']`
 * if empty.
 */
export declare function toNumberTypes(metadataTypes: readonly MetadataNumberType[]): NumberType[];

export { }

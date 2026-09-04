/**
 * @public
 * Joins the collected layer parts (from {@link parseModuleLayers}) into the runtime {@link Engine}:
 * stamps the state flags. Throws if a layer is missing. The parts may arrive in
 * any order.
 */
export declare function assembleEngine(parts: ReadonlyArray<Partial<EngineLayers>>): Engine;

/**
 * @public
 * Per-state region data of the calling-code zone (the states before the national number). Layer key
 * `callingCodes`. Opaque: read it through the calling-code accessors.
 */
export declare interface CallingCodeLayer {
}

/**
 * @public
 * Returns true if the given length is encoded in the bitmask.
 */
export declare function containsLength(mask: number, length: number): boolean;

/**
 * @public
 * The four walk layers.
 */
export declare interface CoreLayers {
    trie: TrieLayer;
    verdict: VerdictLayer;
    scope: ScopeLayer;
    exact: ExactLayer;
}

/**
 * @public
 * The runtime engine: the eight layers, assembled (state flags stamped). The layers are opaque;
 * read the engine through the accessors, which take it as their first argument.
 */
export declare type Engine = EngineLayers;

/**
 * @public
 * Returned by the step function when the digit has no transition.
 */
export declare const ENGINE_DEAD = -1;

/**
 * @public
 * The four modules the engine ships as. Load all four, decode each member (base64-decode + gunzip),
 * and pass the layers to `parseEngine`. Each module's default export maps the `layers` names below
 * to their encoded bytes; those names are exactly the `EngineLayerBytes` fields.
 */
export declare const ENGINE_MODULES: ReadonlyArray<{
    readonly file: string;
    readonly layers: readonly string[];
}>;

/**
 * @public
 * Decompressed bytes of each layer, keyed like {@link EngineLayers} (the keys are also the keys
 * inside the group modules). Pass it to {@link parseEngine} once you have decoded every layer.
 */
export declare interface EngineLayerBytes {
    trie: ArrayBuffer;
    verdict: ArrayBuffer;
    scope: ArrayBuffer;
    exact: ArrayBuffer;
    callingCodes: ArrayBuffer;
    formatSelect: ArrayBuffer;
    regionSelect: ArrayBuffer;
    metadata: ArrayBuffer;
}

/**
 * @public
 * The eight parsed layers, keyed by the names the group modules use. {@link parseModuleLayers}
 * returns the subset one module carries; {@link assembleEngine} joins them into the {@link Engine}.
 */
export declare interface EngineLayers extends CoreLayers {
    callingCodes: CallingCodeLayer;
    formatSelect: FormatSelectLayer;
    regionSelect: RegionSelectLayer;
    metadata: MetadataLayer;
}

/**
 * @public
 * Full-pattern acceptance per state, region, and type. Layer key `exact`. Opaque: read it through the exact
 * accessors.
 */
export declare interface ExactLayer {
}

/**
 * @public
 * Calling-code index of a value; -1 when unknown.
 */
export declare function findCallingCode(engine: Engine, callingCode: number): number;

/**
 * @public
 * Region index of a two-letter code; -1 when unknown.
 */
export declare function findRegion(engine: Engine, regionCode: string): number;

/**
 * @public
 * Scope entry index of a region at a state, or -1 when the region is out of scope.
 */
export declare function findScopeEntry(engine: Engine, state: number, regionIndex: number): number;

/**
 * @public
 * Iterates the regions with at least one exactly accepting type for the walk ending at `state`.
 */
export declare function forEachExactRegion(engine: Engine, state: number, nationalLength: number, callback: (regionIndex: number, exactTypeMask: number) => StopIteration): void;

/**
 * @public
 * Iterates over all set format bit indices in ascending order.
 */
export declare function forEachFormatIndex(mask: number, callback: (index: number) => StopIteration): void;

/**
 * @public
 * Iterates a format variant's (totalLength, mask string) entries in ascending length. Cold path: allocates.
 */
export declare function forEachFormatMask(engine: Engine, formatIndex: number, variant: number, callback: (totalLength: number, mask: string) => void): void;

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
 * Iterates region indices of a calling code state; the callback returns true to stop.
 */
export declare function forEachRegionInCallingCodeState(engine: Engine, state: number, callback: (regionIndex: number) => StopIteration): void;

/**
 * @public
 * Iterates the state's scope entries in walk order; the callback receives the entry index and region.
 */
export declare function forEachScopeRegion(engine: Engine, state: number, callback: (scopeEntryIndex: number, regionIndex: number) => StopIteration): void;

/**
 * @public
 * Formats a phone number according to the provided formatting context.
 */
export declare function formatNumber(context: PhoneNumberFormattingContext, options?: FormatNumberOptions): FormattedWithCaret;

/**
 * @public
 * Options of {@link formatNumber}.
 */
export declare interface FormatNumberOptions {
    /** Caret position in the national digits to remap into the formatted string; default 0. */
    caretIndex?: number;
    /** Default `forward`. */
    direction?: FormattingDirection;
    /** Also return `digitPositions`; default false (nothing allocated). */
    collectDigitPositions?: boolean;
}

/**
 * @public
 * Formats the national number and returns the caret position aligned to the given raw digit index.
 */
export declare function formatNumberWithRawCaret(context: PhoneNumberFormattingContext, rawCaretIndex: number, direction: FormattingDirection): FormattedWithCaret;

/**
 * @public
 * Format selection data per calling code. Layer key `formatSelect`. Opaque: read it through
 * `selectCompleteFormat` and `selectPartialFormat`.
 */
export declare interface FormatSelectLayer {
}

/**
 * @public
 * Formatted phone number with the corresponding caret position.
 */
export declare interface FormattedWithCaret {
    formatted: string;
    caretIndex: number;
    /**
     * Present only when `formatNumber` is called with `collectDigitPositions`. One entry per display
     * digit: `digitPositions[k]` is the index of the k-th display digit in `formatted`, or `-1` when the
     * mask hides that digit. Length equals the display digit count (`context.nationalNumber.length`).
     */
    digitPositions?: number[];
}

/**
 * @public
 * Formatting direction: `backward` strips trailing formatting after the last digit, `forward` keeps it.
 */
export declare type FormattingDirection = 'forward' | 'backward';

/**
 * @public
 * Calling code value at a calling-code index.
 */
export declare function getCallingCode(engine: Engine, callingCodeIndex: number): number;

/**
 * @public
 * Get primary region for calling code state.
 */
export declare function getCallingCodeMainRegion(engine: Engine, state: number): number;

/**
 * @public
 * Returns a calling code state's regions in libphonenumber resolution order (main region first).
 */
export declare function getCallingCodeStateRegions(engine: Engine, state: number): Uint8Array;

/**
 * @public
 * Mask of a region's types whose full pattern accepts the number ending at `state` with
 * `nationalLength` national digits.
 */
export declare function getExactTypeMask(engine: Engine, state: number, regionIndex: number, nationalLength: number): number;

/**
 * @public
 * Returns lowest set bit index from a format mask.
 */
export declare function getFirstFormatIndex(mask: number): number;

/**
 * @public
 * Number of formats of a calling-code index.
 */
export declare function getFormatCount(engine: Engine, callingCodeIndex: number): number;

/**
 * @public
 * Global format index of a format position under a calling-code index.
 */
export declare function getFormatIndex(engine: Engine, callingCodeIndex: number, formatPosition: number): number;

/**
 * @public
 * intlFormat of a format ("NA" preserved verbatim), or undefined.
 */
export declare function getFormatIntlTemplate(engine: Engine, formatIndex: number): string | undefined;

/**
 * @public
 * Total lengths (bit = length) a format's pattern accepts.
 */
export declare function getFormatLengthMask(engine: Engine, formatIndex: number): number;

/**
 * @public
 * Mask string of a format variant for a total length, or undefined (see MASK_VARIANT). Cold path: allocates.
 */
export declare function getFormatMask(engine: Engine, formatIndex: number, variant: number, totalLength: number): string | undefined;

/**
 * @public
 * nationalPrefixFormattingRule of a format, or undefined.
 */
export declare function getFormatPrefixRule(engine: Engine, formatIndex: number): string | undefined;

/**
 * @public
 * Format template ("$1 $2-$3"). Cold path: allocates.
 */
export declare function getFormatTemplate(engine: Engine, formatIndex: number): string;

/**
 * @public
 * Returns the maximum length encoded in the bitmask (position of highest set bit).
 */
export declare function getMaxLength(mask: number): number;

/**
 * @public
 * Name of a refMapping number-type index. Cold path: allocates.
 */
export declare function getNumberTypeName(engine: Engine, typeId: number): string;

/**
 * @public
 * Placeholders: digit, ignored digit, national prefix.
 */
export declare function getPlaceholders(engine: Engine): [string, string, string];

/**
 * @public
 * Union of the total lengths reachable from the state over every region and type still in play
 * (ancestor terminals included). Mask with `~((1 << consumed) - 1)` for the still-reachable set.
 */
export declare function getReachableLengthMask(engine: Engine, state: number): number;

/**
 * @public
 * Mask of a scope entry's types that can still total `totalLength` from the state; lowest set bit wins.
 */
export declare function getReachableTypeMaskAtLength(engine: Engine, scopeEntryIndex: number, totalLength: number): number;

/**
 * @public
 * Calling code of a region.
 */
export declare function getRegionCallingCode(engine: Engine, regionIndex: number): number;

/**
 * @public
 * Two-letter region code. Cold path: allocates.
 */
export declare function getRegionCode(engine: Engine, regionIndex: number): string;

/**
 * @public
 * Number of regions.
 */
export declare function getRegionCount(engine: Engine): number;

/**
 * @public
 * internationalPrefix of a region (a regex pattern, verbatim), or undefined.
 */
export declare function getRegionInternationalPrefix(engine: Engine, regionIndex: number): string | undefined;

/**
 * @public
 * leadingDigits of a region, or undefined.
 */
export declare function getRegionLeadingDigits(engine: Engine, regionIndex: number): string | undefined;

/**
 * @public
 * nationalPrefix of a region, or undefined.
 */
export declare function getRegionNationalPrefix(engine: Engine, regionIndex: number): string | undefined;

/**
 * @public
 * National lengths (bit = length) the region declares: the general-desc mask, the union of its types.
 */
export declare function getRegionPossibleLengthMask(engine: Engine, regionIndex: number): number;

/**
 * @public
 * Local-only lengths (bit = length) the region declares; 0 = none.
 */
export declare function getRegionPossibleLocalOnlyLengthMask(engine: Engine, regionIndex: number): number;

/**
 * @public
 * preferredExtnPrefix of a region (the prefix its numbers write before an extension), or undefined.
 */
export declare function getRegionPreferredExtnPrefix(engine: Engine, regionIndex: number): string | undefined;

/**
 * @public
 * preferredInternationalPrefix of a region (the canonical fixed prefix), or undefined.
 */
export declare function getRegionPreferredInternationalPrefix(engine: Engine, regionIndex: number): string | undefined;

/**
 * @public
 * nationalPrefixForParsing of a region, or undefined.
 */
export declare function getRegionPrefixForParsing(engine: Engine, regionIndex: number): string | undefined;

/**
 * @public
 * 10-bit mask of first national digits that can start the region's national-prefix pattern.
 * Zero means the region never strips; consult before touching the rewrite regex.
 */
export declare function getRegionStripFirstDigitMask(engine: Engine, regionIndex: number): number;

/**
 * @public
 * nationalPrefixTransformRule of a region, or undefined.
 */
export declare function getRegionTransformRule(engine: Engine, regionIndex: number): string | undefined;

/**
 * @public
 * Number of type positions of a region.
 */
export declare function getRegionTypeCount(engine: Engine, regionIndex: number): number;

/**
 * @public
 * Example number of a type position as a digit string, or undefined. Cold path: allocates.
 */
export declare function getRegionTypeExample(engine: Engine, regionIndex: number, typePosition: number): string | undefined;

/**
 * @public
 * refMapping number-type index at a region's type position.
 */
export declare function getRegionTypeId(engine: Engine, regionIndex: number, typePosition: number): number;

/**
 * @public
 * National lengths (bit = length) a type position declares; undefined when the entry declares none.
 */
export declare function getRegionTypePossibleLengthMask(engine: Engine, regionIndex: number, typePosition: number): number | undefined;

/**
 * @public
 * Local-only lengths (bit = length) a type position declares; 0 = none.
 */
export declare function getRegionTypePossibleLocalOnlyLengthMask(engine: Engine, regionIndex: number, typePosition: number): number;

/**
 * @public
 * Mask of the scope entry's types that have a terminal prefix at the state.
 */
export declare function getScopeTerminalTypeMask(engine: Engine, scopeEntryIndex: number): number;

/**
 * @public
 * Type mask of a scope entry (selection-priority bit order: lowest set bit wins).
 */
export declare function getScopeTypeMask(engine: Engine, scopeEntryIndex: number): number;

/**
 * @public
 * Type profile id of one type of a scope entry; the type must be set in the entry's type mask.
 */
export declare function getScopeTypeProfile(engine: Engine, scopeEntryIndex: number, typeIndex: number): number;

/**
 * @public
 * The state's flag word; test it with the STATE_FLAG_* masks.
 */
export declare function getStateFlags(engine: Engine, state: number): number;

/**
 * @public
 * Formats (bit = format position under the calling code) a type profile can still use.
 */
export declare function getTypeProfileFormatMask(engine: Engine, typeProfile: number): number;

/**
 * @public
 * Total lengths (bit = length) a type profile can still reach from the state.
 */
export declare function getTypeProfileReachableLengthMask(engine: Engine, typeProfile: number): number;

/**
 * @public
 * Verdict (region, type, validity) for a walk ending at `state` with `nationalLength` national
 * digits. Decode with the verdict helpers; VERDICT_UNDECIDED requires the fallback path.
 */
export declare function getVerdict(engine: Engine, state: number, nationalLength: number): number;

/**
 * @public
 * True when the state carries exact-acceptance entries.
 */
export declare function hasExactMatch(engine: Engine, state: number): boolean;

/**
 * @public
 * Checks if region exists in calling code state.
 */
export declare function hasRegionInCallingCodeState(engine: Engine, state: number, regionIndex: number): boolean;

/**
 * @public
 * A terminal prefix lies exactly at the state.
 */
export declare function hasTerminalPrefix(engine: Engine, state: number): boolean;

/**
 * @public
 * True when the state carries verdict records.
 */
export declare function hasVerdict(engine: Engine, state: number): boolean;

/**
 * @public
 * True when the calling code cannot be extended past this state.
 */
export declare function isCallingCodeComplete(engine: Engine, state: number): boolean;

/**
 * @public
 * Checks if state is the end of a valid calling code.
 */
export declare function isCallingCodeValid(engine: Engine, state: number): boolean;

/**
 * @public
 * nationalPrefixOptionalWhenFormatting flag of a format.
 */
export declare function isFormatPrefixOptional(engine: Engine, formatIndex: number): boolean;

/**
 * @public
 * True while the walk is still inside a calling-code zone.
 */
export declare function isInCallingCode(engine: Engine, state: number): boolean;

/**
 * @public
 * Google `matchesLeadingDigits` semantics: true when the territory's leadingDigits prefix-matches the
 * national digits. Returns false when the region has no leadingDigits for this calling code.
 * `callingCodeIndex` must be valid and `nationalDigits` ASCII digits with no prefix.
 */
export declare function isRegionLeadingDigitsSatisfied(engine: Engine, callingCodeIndex: number, regionIndex: number, nationalDigits: string): boolean;

/**
 * @public
 * Reports whether national digits form a viable number for the region; must be pure.
 */
export declare type IsViableNationalNumber = (nationalDigits: string) => boolean;

/**
 * @public
 * Mask variants of a format.
 */
export declare const MASK_VARIANT: Readonly<{
    readonly NATIONAL: 0;
    readonly INTERNATIONAL: 1;
    readonly NATIONAL_WITH_PREFIX: 2;
}>;

/**
 * @public
 * The shipped metadata (territories, formats, reference mapping). Layer key `metadata`. Opaque: read it
 * through the metadata accessors (string accessors allocate and are cold-path by design).
 */
export declare interface MetadataLayer {
}

/**
 * @public
 * Subset of {@link NumberType} mapping 1:1 to XML metadata elements (drops runtime-only types, adds `GENERAL_DESC`).
 */
export declare type MetadataNumberType = Exclude<NumberType, 'FIXED_LINE_OR_MOBILE' | 'UNKNOWN'> | 'GENERAL_DESC';

/**
 * @public
 * National-prefix strip rules of a region; feed from the metadata accessors.
 */
export declare interface NationalPrefixRules {
    nationalPrefix?: string;
    nationalPrefixForParsing?: string;
    nationalPrefixTransformRule?: string;
}

/**
 * @public
 * Result of {@link normalizeNationalNumber}: a parse/validation view and a display view for live input.
 */
export declare interface NormalizedNationalNumber {
    normalizedDigits: string;
    caretIndex: number;
    displayDigits: string;
    displayCaretIndex: number;
    /**
     * Present only when `normalizeNationalNumber` is called with `collectDisplayBoundaries`. The display
     * caret for every typed boundary: `displayCaretByTyped[t]` is the display caret for a caret at typed
     * boundary `t`. Length `digits.length + 1`, monotonic non-decreasing, bounded by `displayDigits.length`.
     */
    displayCaretByTyped?: number[];
}

/**
 * @public
 * Normalizes national digits and remaps the caret, returning parse and display views.
 * When `isViable` is given, a viable number is never stripped into a non-viable one.
 */
export declare function normalizeNationalNumber(digits: string, rules: NationalPrefixRules, options?: NormalizeNationalNumberOptions): NormalizedNationalNumber;

/**
 * @public
 * Options of {@link normalizeNationalNumber}.
 */
export declare interface NormalizeNationalNumberOptions {
    /** Caret position in the typed digits to remap; default 0. */
    caretIndex?: number;
    /** Strip guard: a viable number is never stripped into a non-viable one. */
    isViable?: IsViableNationalNumber;
    /** Also return `displayCaretByTyped`, the display caret of every typed boundary; default false. */
    collectDisplayBoundaries?: boolean;
}

/**
 * @public
 * Phone number type, value-identical to libphonenumber `PhoneNumberType`.
 */
export declare type NumberType = 'FIXED_LINE' | 'MOBILE' | 'FIXED_LINE_OR_MOBILE' | 'TOLL_FREE' | 'PREMIUM_RATE' | 'SHARED_COST' | 'VOIP' | 'PERSONAL_NUMBER' | 'PAGER' | 'UAN' | 'VOICEMAIL' | 'UNKNOWN';

/**
 * @public
 * Parses already-decoded layer bytes into the runtime {@link Engine}. Pure: no I/O, no
 * decompression. Use this when you have every layer decoded; to parse file by file (and assemble as
 * modules arrive) use {@link parseModuleLayers} + {@link assembleEngine}.
 */
export declare function parseEngine(bytes: EngineLayerBytes): Engine;

/**
 * @public
 * Parses one group module's members into the layers it carries. Decode is yours (base64 + gunzip);
 * the module is its `embedded/*.bin.js` default export. Run all four in parallel and hand the parts
 * to {@link assembleEngine}.
 */
export declare function parseModuleLayers(module: Readonly<Record<string, string>>, decode: (base64: string) => ArrayBuffer): Partial<EngineLayers>;

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
 * CLDR two-letter region codes recognized by the engine; source of truth for {@link RegionCode}.
 */
export declare const REGION_CODES: readonly ["AC", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GT", "GU", "GW", "GY", "HK", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TA", "TC", "TD", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW"];

/**
 * @public
 * Territory identifier per CLDR two-letter region code; derived from {@link REGION_CODES}.
 */
export declare type RegionCode = (typeof REGION_CODES)[number];

/**
 * @public
 * Region disambiguation data for shared calling codes. Layer key `regionSelect`. Opaque: read it through
 * `isRegionLeadingDigitsSatisfied`.
 */
export declare interface RegionSelectLayer {
}

/**
 * @public
 * Regions in scope per state, with their type masks and type profiles. Layer key `scope`. Opaque: read it
 * through the scope accessors.
 */
export declare interface ScopeLayer {
}

/**
 * @public
 * Format selection for a complete national number: the first format (array order) whose
 * leadingDigits is satisfied and whose pattern accepts the full length. `callingCodeIndex` must be
 * valid and `nationalDigits` ASCII digits with no prefix.
 */
export declare function selectCompleteFormat(engine: Engine, callingCodeIndex: number, nationalDigits: string): SelectedFormat;

/**
 * @public
 * Chosen national and international format positions under the calling code (`-1` = none).
 */
export declare interface SelectedFormat {
    national: number;
    international: number;
}

/**
 * @public
 * Format selection while typing. The national choice is scoped by
 * `typeProfileFormatMask` (from `getTypeProfileFormatMask`); both choices use the upper length
 * bound only. `callingCodeIndex` must be valid and `nationalDigits` ASCII digits with no prefix.
 */
export declare function selectPartialFormat(engine: Engine, callingCodeIndex: number, nationalDigits: string, typeProfileFormatMask: number): SelectedFormat;

/**
 * @public
 * Flag bit: the state is inside a calling-code zone.
 */
export declare const STATE_FLAG_CALLING_CODE: number;

/**
 * @public
 * Flag bit: the calling code cannot be extended past this state.
 */
export declare const STATE_FLAG_CALLING_CODE_COMPLETE: number;

/**
 * @public
 * Flag bit: the state carries exact-acceptance entries.
 */
export declare const STATE_FLAG_HAS_EXACT_MATCH: number;

/**
 * @public
 * Flag bit: the state carries verdict records.
 */
export declare const STATE_FLAG_HAS_VERDICT: number;

/**
 * @public
 * Flag bit: a terminal prefix lies exactly at this state.
 */
export declare const STATE_FLAG_TERMINAL_PREFIX: number;

/**
 * @public
 * Advances the walk one digit from `state`, returning the next state or `ENGINE_DEAD` (no transition).
 */
export declare function stepDigit(engine: Engine, state: number, digit: number): number;

/**
 * @public
 * Iteration control: `true` stops, `void` continues.
 */
export declare type StopIteration = true | void;

/**
 * @public
 * Maps metadata number types to public {@link NumberType} per libphonenumber `getNumberType` semantics.
 */
export declare function toNumberTypes(metadataTypes: readonly MetadataNumberType[]): NumberType[];

/**
 * @public
 * Per-state walk data. Layer key `trie`. Opaque: read it through `stepDigit` and the flag accessors.
 */
export declare interface TrieLayer {
}

/**
 * @public
 * Verdict vectors cover national lengths 0..VERDICT_LENGTH_COUNT-1.
 */
export declare const VERDICT_LENGTH_COUNT = 20;

/**
 * @public
 * Decided: no region matched (invalid, region none, type unknown).
 */
export declare const VERDICT_NONE = 4095;

/**
 * @public
 * Region value of a verdict that resolved no region.
 */
export declare const VERDICT_REGION_NONE = 255;

/**
 * @public
 * Verdict number-type id for the FIXED_LINE + MOBILE fold; distinct from every refMapping type index.
 */
export declare const VERDICT_TYPE_FIXED_LINE_OR_MOBILE = 14;

/**
 * @public
 * Verdict number-type id when no type resolves.
 */
export declare const VERDICT_TYPE_UNKNOWN = 15;

/**
 * @public
 * The verdict depends on digits beyond the end state; the consumer must fall back.
 */
export declare const VERDICT_UNDECIDED = 65535;

/**
 * @public
 * True when the verdict is decided at the end state (no fallback needed).
 */
export declare function verdictIsDecided(verdict: number): boolean;

/**
 * @public
 * Validity bit of a verdict.
 */
export declare function verdictIsValid(verdict: number): boolean;

/**
 * @public
 * Verdict records per state and national length. Layer key `verdict`. Opaque: read it through `getVerdict`.
 */
export declare interface VerdictLayer {
}

/**
 * @public
 * Region index of a verdict; VERDICT_REGION_NONE when no region resolved.
 */
export declare function verdictRegion(verdict: number): number;

/**
 * @public
 * Number type id of a verdict: a refMapping index, VERDICT_TYPE_FIXED_LINE_OR_MOBILE, or VERDICT_TYPE_UNKNOWN.
 */
export declare function verdictType(verdict: number): number;

export { }

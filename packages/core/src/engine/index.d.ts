/**
 * @public
 * Joins the collected layer parts (from {@link parseModuleLayers}) into the runtime {@link Engine}.
 * The four core slices snap back into `core`; the rest map straight across. Throws if a layer is
 * missing.
 */
export declare function assembleEngine(parts: ReadonlyArray<Partial<EngineLayers>>): Engine;

/**
 * @public
 * Per-state region data for the calling-code zone of the trie (the states spanning the calling-code
 * digits, before the national number). Built from the same trie + metadata; read via the accessors.
 */
export declare interface CallingCodeLayer {
    stateRegionOffset: Uint16Array;
    stateRegionCount: Uint8Array;
    regionIndexPool: Uint8Array;
    stateMainRegion: Uint8Array;
    stateFlags: Uint8Array;
}

/**
 * @public
 * Returns true if the given length is encoded in the bitmask.
 */
export declare function containsLength(mask: number, length: number): boolean;

/**
 * @public
 * The parsed engine: the walk/verdict/scope/exact `core` plus the calling-code, region-mask,
 * format-select, region-select, and metadata layers. Build it with {@link parseEngine} (all bytes at
 * once) or {@link parseModuleLayers} + {@link assembleEngine} (file by file), then read everything
 * through the accessors (they take this object as their first argument).
 */
export declare interface Engine {
    core: EngineCore;
    callingCode: CallingCodeLayer;
    regionMasks: RegionMasksLayer;
    formatSelect: FormatSelectLayer;
    regionSelect: RegionSelectLayer;
    metadata: MetadataTablesLayer;
}

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
 * The walk core of an {@link Engine}: transitions, per-state flags, verdicts, scope, and exact
 * acceptance. Reached as `engine.core`; read it through the accessors (`stepDigit`, `getVerdict`, …).
 *
 * Glossary (other layer docs rely on these terms):
 * - refMapping: index-to-key tables for regions, calling codes, and number types.
 * - bundle: a palette entry shared by every state with identical scope + verdict + exact payloads.
 * - profile: a state's id into the bundle palette.
 * - terminal prefix: a prefix that is itself a complete, accepted number (no further digits needed).
 * - group module: one of the four shipped `*.bin.js` modules, each packing several layers.
 */
export declare interface EngineCore {
    transitionWords: Uint32Array;
    profile: Uint16Array;
    bundleScopeOffset: Uint16Array;
    scopeRegion: Uint8Array;
    scopeNumberMask: Uint16Array;
    scopeTerminalMask: Uint16Array;
    scopeProfileStart: Uint16Array;
    scopeLengthTypeVector: Uint16Array;
    profileIds: Uint16Array;
    formatMaskPool: Uint32Array;
    lengthMaskPool: Uint32Array;
    bundleExactList: Uint16Array;
    bundleVerdictVector: Uint16Array;
    bundleLengthsUnion: Uint32Array;
    exactListOffset: Uint16Array;
    exactRegion: Uint8Array;
    exactVector: Uint16Array;
    vectorOffset: Uint16Array;
    vectorMasks: Uint32Array;
    verdictVectors: Uint16Array;
    lengthTypeVectors: Uint16Array;
}

/**
 * @public
 * Decompressed bytes of each engine layer, keyed by layer name (the keys are also the keys inside
 * the group modules). Pass it to {@link parseEngine} once you have decoded every layer.
 */
export declare interface EngineLayerBytes {
    trie: ArrayBuffer;
    verdict: ArrayBuffer;
    scope: ArrayBuffer;
    exact: ArrayBuffer;
    callingCodes: ArrayBuffer;
    regionMasks: ArrayBuffer;
    formatSelect: ArrayBuffer;
    regionSelect: ArrayBuffer;
    metadata: ArrayBuffer;
}

/**
 * @public
 * The nine parsed layers, keyed by the same names the group modules use. The `core` is split across
 * four of them (`trie`, `verdict`, `scope`, `exact`); {@link assembleEngine} joins the four back into
 * one {@link Engine}. Each group module yields a few of these — {@link parseModuleLayers} returns the
 * subset a single module carries.
 */
export declare interface EngineLayers {
    trie: TrieSection;
    verdict: VerdictSection;
    scope: ScopeSection;
    exact: ExactSection;
    callingCodes: CallingCodeLayer;
    regionMasks: RegionMasksLayer;
    formatSelect: FormatSelectLayer;
    regionSelect: RegionSelectLayer;
    metadata: MetadataTablesLayer;
}

/**
 * @public
 * The slice of {@link EngineCore} carried in the `verdict.bin.js` module (layer key `exact`).
 */
export declare type ExactSection = Pick<EngineCore, 'exactListOffset' | 'exactRegion' | 'exactVector' | 'vectorOffset' | 'vectorMasks'>;

/**
 * @public
 * Calling-code index for a value; -1 when unknown.
 */
export declare function findMetadataCallingCode(engine: Engine, callingCode: number): number;

/**
 * @public
 * Region index for a two-letter id; -1 when unknown.
 */
export declare function findMetadataRegion(engine: Engine, regionCode: string): number;

/**
 * @public
 * Scope entry index for a region at a state, or -1 when the region is out of scope.
 */
export declare function findScopeEntry(engine: Engine, state: number, regionIndex: number): number;

/**
 * @public
 * Iterates regions with at least one exactly-matching type for the walk ending at `state`.
 */
export declare function forEachExactRegion(engine: Engine, state: number, nationalLength: number, callback: (regionIndex: number, exactTypeMask: number) => StopIteration): void;

/**
 * @public
 * Iterates over all set format bit indices in ascending order.
 */
export declare function forEachFormatIndex(mask: number, callback: (index: number) => StopIteration): void;

/**
 * @public
 * Iterates a format variant's (totalLength, mask string) entries.
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
 * Iterates the state's scoped regions; the callback receives the scope entry index and region.
 */
export declare function forEachScopeRegion(engine: Engine, state: number, callback: (scopeEntryIndex: number, regionIndex: number) => StopIteration): void;

/**
 * @public
 * Formats a phone number according to the provided formatting context.
 */
export declare function formatNumber(context: PhoneNumberFormattingContext, caretIndex?: number, direction?: FormattingDirection, collectDigitPositions?: boolean): FormattedWithCaret;

/**
 * @public
 * Formats the national number and returns the caret position aligned to the given raw digit index.
 */
export declare function formatNumberWithRawCaret(context: PhoneNumberFormattingContext, rawCaretIndex: number, direction: FormattingDirection): FormattedWithCaret;

/**
 * @public
 * Format-selection layer: picks the format index for a national number. Use the select accessors.
 */
export declare interface FormatSelectLayer {
    callingCodeFormatStart: Uint32Array;
    formatLengthMask: Uint32Array;
    formatRangeLow: Uint8Array;
    formatRangeHigh: Uint8Array;
    formatFlags: Uint8Array;
    callingCodeNodeRoot: Uint32Array;
    nodeSatisfiedMask: Uint32Array;
    nodeChildDigits: Uint16Array;
    nodeChildOffset: Uint16Array;
    childNode: Uint16Array;
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
 * Mask of types whose pattern exactly matches the number ending at `state` with `nationalLength`
 * national digits.
 */
export declare function getExactTypeMask(engine: Engine, state: number, regionIndex: number, nationalLength: number): number;

/**
 * @public
 * Returns lowest set bit index from a format mask.
 */
export declare function getFirstFormatIndex(mask: number): number;

/**
 * @public
 * intlFormat of a format ("NA" preserved verbatim), or undefined.
 */
export declare function getFormatIntlTemplate(engine: Engine, formatIndex: number): string | undefined;

/**
 * @public
 * Mask string of a format variant for a total length, or undefined (see MASK_VARIANT).
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
 * General-desc national length mask of a region (testNumberLength input).
 */
export declare function getGeneralDescLengthMask(engine: Engine, regionIndex: number): number;

/**
 * @public
 * General-desc local-only length mask of a region.
 */
export declare function getGeneralDescLocalOnlyLengthMask(engine: Engine, regionIndex: number): number;

/**
 * @public
 * Returns the maximum length encoded in the bitmask (position of highest set bit).
 */
export declare function getMaxLength(mask: number): number;

/**
 * @public
 * Calling code value at a calling-code index.
 */
export declare function getMetadataCallingCodeByIndex(engine: Engine, callingCodeIndex: number): number;

/**
 * @public
 * Number of formats of a calling-code index.
 */
export declare function getMetadataFormatCount(engine: Engine, callingCodeIndex: number): number;

/**
 * @public
 * Global format index for a calling-code index and local position.
 */
export declare function getMetadataFormatIndex(engine: Engine, callingCodeIndex: number, formatPosition: number): number;

/**
 * @public
 * Name of a refMapping number-type index. Cold path: allocates.
 */
export declare function getMetadataNumberTypeName(engine: Engine, typeId: number): string;

/**
 * @public
 * Placeholders: digit, ignored digit, national prefix.
 */
export declare function getMetadataPlaceholders(engine: Engine): [string, string, string];

/**
 * @public
 * Calling code of a region.
 */
export declare function getMetadataRegionCallingCode(engine: Engine, regionIndex: number): number;

/**
 * @public
 * Two-letter region code. Cold path: allocates.
 */
export declare function getMetadataRegionCode(engine: Engine, regionIndex: number): string;

/**
 * @public
 * Number of regions in the tables.
 */
export declare function getMetadataRegionCount(engine: Engine): number;

/**
 * @public
 * Number of type positions of a region.
 */
export declare function getMetadataTypeCount(engine: Engine, regionIndex: number): number;

/**
 * @public
 * Example number of a type position as a digit string, or undefined. Cold path: allocates.
 */
export declare function getMetadataTypeExample(engine: Engine, regionIndex: number, typePosition: number): string | undefined;

/**
 * @public
 * refMapping number-type index at a region's type position.
 */
export declare function getMetadataTypeId(engine: Engine, regionIndex: number, typePosition: number): number;

/**
 * @public
 * Local-only length mask of a type position; 0 = absent.
 */
export declare function getMetadataTypeLocalOnlyMask(engine: Engine, regionIndex: number, typePosition: number): number;

/**
 * @public
 * National length mask of a type position; undefined when the entry has no possibleLengths.
 */
export declare function getMetadataTypeNationalMask(engine: Engine, regionIndex: number, typePosition: number): number | undefined;

/**
 * @public
 * Format bitmask of a profile id.
 */
export declare function getProfileFormatMask(engine: Engine, profileId: number): number;

/**
 * @public
 * Length bitmask of a profile id.
 */
export declare function getProfileLengthMask(engine: Engine, profileId: number): number;

/**
 * @public
 * Union of total lengths reachable from the state; mask with `~((1 << consumed) - 1)` for the
 * still-reachable set.
 */
export declare function getReachableLengthMask(engine: Engine, state: number): number;

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
 * nationalPrefixTransformRule of a region, or undefined.
 */
export declare function getRegionTransformRule(engine: Engine, regionIndex: number): string | undefined;

/**
 * @public
 * Number of type positions of a region (mirrors the territory's `numberTypes` order).
 */
export declare function getRegionTypeCount(engine: Engine, regionIndex: number): number;

/**
 * @public
 * refMapping number-type index at a region's type position.
 */
export declare function getRegionTypeId(engine: Engine, regionIndex: number, typePosition: number): number;

/**
 * @public
 * National length mask at a region's type position.
 */
export declare function getRegionTypeLengthMask(engine: Engine, regionIndex: number, typePosition: number): number;

/**
 * @public
 * Territory-level local-only length mask; 0 = absent.
 */
export declare function getRegionUnionLocalOnlyMask(engine: Engine, regionIndex: number): number;

/**
 * @public
 * Territory-level national length mask.
 */
export declare function getRegionUnionNationalMask(engine: Engine, regionIndex: number): number;

/**
 * @public
 * Number type mask of a scope entry (selection-priority bit order: lowest set bit wins).
 */
export declare function getScopeNumberTypeMask(engine: Engine, scopeEntryIndex: number): number;

/**
 * @public
 * Profile id for a set type-mask bit of a scope entry.
 */
export declare function getScopeProfileId(engine: Engine, scopeEntryIndex: number, typeMask: number, typeIndex: number): number;

/**
 * @public
 * Terminal-prefix type mask of a scope entry.
 */
export declare function getScopeTerminalTypeMask(engine: Engine, scopeEntryIndex: number): number;

/**
 * @public
 * State flags; test with the STATE_FLAG_* masks.
 */
export declare function getStateFlags(engine: Engine, state: number): number;

/**
 * @public
 * 10-bit mask of first national digits that can start the region's national-prefix pattern.
 * Zero means the region never strips; consult before touching the rewrite regex.
 */
export declare function getStripFirstDigitMask(engine: Engine, regionIndex: number): number;

/**
 * @public
 * Mask of a scope entry's types whose possible totals include `totalLength`; lowest set bit wins.
 */
export declare function getTypeMaskAtLength(engine: Engine, scopeEntryIndex: number, totalLength: number): number;

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
 * Terminal-prefix flag of the state.
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
 * Regex-free `matchesLeadingDigits`: true when the territory's leadingDigits prefix-matches the
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
 * Mask variants, in formatMaskStart order.
 */
export declare const MASK_VARIANT: Readonly<{
    readonly NATIONAL: 0;
    readonly INTERNATIONAL: 1;
    readonly NATIONAL_WITH_PREFIX: 2;
}>;

/**
 * @public
 * Subset of {@link NumberType} mapping 1:1 to XML metadata elements (drops runtime-only types, adds `GENERAL_DESC`).
 */
export declare type MetadataNumberType = Exclude<NumberType, 'FIXED_LINE_OR_MOBILE' | 'UNKNOWN'> | 'GENERAL_DESC';

/**
 * @public
 * The shipped metadata (territories, formats, reference mapping). Read through the accessors;
 * string accessors allocate and are cold-path by design.
 */
export declare interface MetadataTablesLayer {
    poolOffsets: Uint16Array;
    poolBytes: Uint8Array;
    regionCodeChars: Uint8Array;
    regionCallingCode: Uint16Array;
    regionNationalPrefixRef: Uint16Array;
    regionPrefixForParsingRef: Uint16Array;
    regionTransformRuleRef: Uint16Array;
    regionLeadingDigitsRef: Uint16Array;
    regionInternationalPrefixRef: Uint16Array;
    regionPreferredInternationalPrefixRef: Uint16Array;
    regionUnionNational: Uint32Array;
    regionUnionLocalOnly: Uint32Array;
    regionTypeOffset: Uint16Array;
    typeIds: Uint8Array;
    typeNationalMasks: Uint32Array;
    typeLocalOnlyMasks: Uint32Array;
    typeExampleRef: Uint16Array;
    exampleOffsets: Uint16Array;
    exampleNibbles: Uint8Array;
    callingCodeFormatStart: Uint16Array;
    formatTemplateRef: Uint16Array;
    formatIntlRef: Uint16Array;
    formatPrefixRuleRef: Uint16Array;
    formatFlags: Uint8Array;
    formatMaskStart: Uint16Array;
    maskEntryLength: Uint8Array;
    maskEntryRef: Uint16Array;
    callingCodes: Uint16Array;
    numberTypeNameRefs: Uint16Array;
    placeholderChars: Uint8Array;
}

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
export declare function normalizeNationalNumber(digits: string, rules: NationalPrefixRules, caretIndex?: number, isViable?: IsViableNationalNumber, collectDisplayBoundaries?: boolean): NormalizedNationalNumber;

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
 * Flat per-region tables: general-desc length masks, type length masks, and the strip
 * quick-reject mask. Read through the accessors.
 */
export declare interface RegionMasksLayer {
    generalDescNationalMask: Uint32Array;
    generalDescLocalOnlyMask: Uint32Array;
    stripFirstDigitMask: Uint16Array;
    regionTypeOffset: Uint16Array;
    typeIds: Uint8Array;
    typeLengthMasks: Uint32Array;
}

/**
 * @public
 * Region-disambiguation layer for shared calling codes. Use the select accessors.
 */
export declare interface RegionSelectLayer {
    callingCodeSlotStart: Uint32Array;
    slotRegion: Uint16Array;
    callingCodeNodeRoot: Uint32Array;
    nodeSatisfiedMask: Uint32Array;
    nodeChildDigits: Uint16Array;
    nodeChildOffset: Uint16Array;
    childNode: Uint16Array;
}

/**
 * @public
 * The slice of {@link EngineCore} carried in the `scope.bin.js` module (layer key `scope`).
 */
export declare type ScopeSection = Pick<EngineCore, 'bundleScopeOffset' | 'scopeRegion' | 'scopeNumberMask' | 'scopeTerminalMask' | 'scopeProfileStart' | 'profileIds' | 'formatMaskPool' | 'lengthMaskPool' | 'bundleExactList'>;

/**
 * @public
 * Regex-free format selection for a complete national number: the first format (array order) whose
 * leadingDigits is satisfied and whose pattern matches the full length. `callingCode` must be a
 * valid index and `nationalDigits` ASCII digits with no prefix.
 */
export declare function selectCompleteFormat(engine: Engine, callingCode: number, nationalDigits: string): SelectedFormat;

/**
 * @public
 * Chosen national and international format indices into `formatsTable[callingCode]` (`-1` = none).
 */
export declare interface SelectedFormat {
    national: number;
    international: number;
}

/**
 * @public
 * Regex-free format selection while typing. The national choice is scoped by `profileFormatMask`
 * (from `getFormatMask`); both choices use the upper length bound only. `callingCode` must be a
 * valid index and `nationalDigits` ASCII digits with no prefix.
 */
export declare function selectPartialFormat(engine: Engine, callingCode: number, nationalDigits: string, profileFormatMask: number): SelectedFormat;

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
export declare const STATE_FLAG_HAS_EXACT: number;

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
 * The slice of {@link EngineCore} carried in the `walk.bin.js` module (layer key `trie`).
 */
export declare type TrieSection = Pick<EngineCore, 'transitionWords' | 'profile'>;

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
 * Verdict number-type id for the FIXED_LINE + MOBILE fold.
 */
export declare const VERDICT_TYPE_FIXED_LINE_OR_MOBILE = 11;

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
 * Region index of a verdict; 255 = no region.
 */
export declare function verdictRegion(verdict: number): number;

/**
 * @public
 * The slice of {@link EngineCore} carried in the `verdict.bin.js` module (layer key `verdict`).
 */
export declare type VerdictSection = Pick<EngineCore, 'bundleVerdictVector' | 'bundleLengthsUnion' | 'scopeLengthTypeVector' | 'verdictVectors' | 'lengthTypeVectors'>;

/**
 * @public
 * Number type id of a verdict (refMapping index, 11 = FIXED_LINE_OR_MOBILE, 15 = UNKNOWN).
 */
export declare function verdictType(verdict: number): number;

export { }

/**
 * @public
 * Calling code layer structure.
 */
export declare interface CallingCodeLayer {
    stateCountryOffset: Uint16Array;
    stateCountryCount: Uint8Array;
    countryIndexPool: Uint8Array;
    statePrimaryCountry: Uint8Array;
    stateFlags: Uint8Array;
}

/**
 * @public
 * Country identifier.
 */
export declare type CountryId = string;

/**
 * @public
 * Country scope layer structure.
 */
export declare interface CountryScopeLayer {
    stateOffset: Uint32Array;
    stateLength: Uint8Array;
    countryPool: Uint8Array;
    countryHasTerminal: Uint8Array;
}

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
export declare function forEachFormatIndex(mask: number, callback: (index: number) => void): void;

/**
 * @public
 * Iterates over all set length values encoded in the bitmask.
 */
export declare function forEachLength(mask: number, callback: (length: number) => void): void;

/**
 * @public
 * Iterates over all countries assigned to a state.
 */
export declare function forEachStateCountry(scope: CountryScopeLayer, stateId: number, callback: (stateCountryIndex: number, countryIndex: number) => void): void;

/**
 * @public
 * Iterates over countries of a state that have a terminal prefix.
 */
export declare function forEachStateCountryWithTerminalPrefix(scope: CountryScopeLayer, stateId: number, callback: (stateCountryIndex: number, countryIndex: number) => void): void;

/**
 * @public
 * Table of phone number formats.
 */
export declare type FormatsTable = PhoneNumberFormatList[];

/**
 * @public
 * Get primary country for calling code state.
 */
export declare function getCallingCodePrimaryCountry(layer: CallingCodeLayer, stateId: number): number;

/**
 * @public
 * Returns all countries for a calling code state.
 */
export declare function getCallingCodeStateCountries(layer: CallingCodeLayer, stateId: number): Uint8Array;

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
 * Returns number type mask for a given state-country index.
 */
export declare function getNumberTypeMask(scope: NumberTypeScopeLayer, stateCountryIndex: number): number;

/**
 * @public
 * Computes profile id for a number type using bit position within typeMask
 * and state-country base offset.
 */
export declare function getNumberTypeProfileId(profile: NumberTypeProfileLayer, stateCountryIndex: number, typeMask: number, typeIndex: number): number;

/**
 * @public
 * Returns a view over country indices assigned to a state.
 */
export declare function getStateCountries(scope: CountryScopeLayer, stateId: number): Uint8Array;

/**
 * @public
 * Returns country indices of a state that have a terminal prefix.
 */
export declare function getStateCountriesWithTerminalPrefix(scope: CountryScopeLayer, stateId: number): number[];

/**
 * @public
 * Returns terminal-prefix number type mask
 * for the given state-country index.
 */
export declare function getTerminalPrefixNumberTypeMask(scope: NumberTypeScopeLayer, stateCountryIndex: number): number;

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
 * Checks if country exists in calling code state.
 */
export declare function hasCountryInCallingCodeState(layer: CallingCodeLayer, stateId: number, countryIndex: number): boolean;

/**
 * @public
 * Checks whether the given state has a terminal prefix.
 */
export declare function hasTerminalPrefix(graph: GraphLayer, state: number): boolean;

/**
 * @public
 * Is state part of a calling code.
 */
export declare function isCallingCodeState(layer: CallingCodeLayer, stateId: number): boolean;

/**
 * @public
 * Checks if state is terminal for calling code (only national digits follow).
 */
export declare function isCallingCodeStateTerminal(layer: CallingCodeLayer, stateId: number): boolean;

/**
 * @public
 * Checks if state is the end of a valid calling code.
 */
export declare function isCallingCodeStateValid(layer: CallingCodeLayer, stateId: number): boolean;

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
 * Parse country scope binary buffer.
 */
export declare function parseCountryScopeBinary(buffer: ArrayBuffer): CountryScopeLayer;

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
 * Phone number format schema.
 */
export declare interface PhoneNumberFormat {
    pattern: string;
    format: string;
    intlFormat?: 'NA' | string;
    leadingDigits: string;
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
 * Generated phone number masks.
 */
export declare interface PhoneNumberMasks {
    national: string;
    nationalWithPrefix?: string;
    international: string;
}

/**
 * @public
 * Phone number type schema.
 */
export declare interface PhoneNumberType {
    type: NumberTypeIndex;
    possibleLengths?: {
        national: string;
        localOnly?: string;
    };
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
 * Reference mapping schema.
 */
export declare type ReferenceMapping = {
    countries: {
        indexToKey: CountryId[];
        keyToIndex: Record<CountryId, number>;
    };
    callingCodes: {
        indexToKey: number[];
        keyToIndex: Record<number, number>;
    };
    numberTypes: readonly string[];
    digitPlaceholder: string;
    ignoredDigitPlaceholder: string;
    nationalPrefixPlaceholder: string;
};

/**
 * @public
 * Territory specification schema.
 */
export declare interface TerritorySpec {
    id: string;
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
    numberTypes: PhoneNumberTypeList;
}

/**
 * @public
 * Table of territory specifications.
 */
export declare type TerritorySpecTable = readonly TerritorySpec[];

export { }

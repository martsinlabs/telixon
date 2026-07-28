import { NumberType } from '@telixon/core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import provenance from '../src/engine/PROVENANCE.json';
import { Oracle, SampledType } from './types';

// Google publishes no npm package: its JS port lives as Closure-coupled source. We fetch it at the engine's commit and run it on google-closure-library, so any mismatch is a real engine bug.
const SOURCE_FILES = [
  'phonemetadata.pb.js',
  'phonenumber.pb.js',
  'metadata.js',
  'phonenumberutil.js',
  'asyoutypeformatter.js',
] as const;

// Closure modules the .pb.js sources expect loaded before they run.
const CLOSURE_DEPENDENCIES = [
  'goog.object',
  'goog.string',
  'goog.string.StringBuffer',
  'goog.proto2.Message',
  'goog.proto2.Descriptor',
  'goog.proto2.PbLiteSerializer',
] as const;

const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '.cache');
const SOURCE_BASE_URL = 'https://raw.githubusercontent.com/google/libphonenumber';

// Types we sample one Google example per region for (UNKNOWN has no examples; FIXED_LINE_OR_MOBILE only echoes a fixed-line/mobile example, so neither is sampled).
const SAMPLED_TYPE_NAMES: readonly NumberType[] = [
  'FIXED_LINE',
  'MOBILE',
  'TOLL_FREE',
  'PREMIUM_RATE',
  'SHARED_COST',
  'VOIP',
  'PERSONAL_NUMBER',
  'PAGER',
  'UAN',
  'VOICEMAIL',
];

// Minimal shapes of the closure objects we touch: the closure load is the system boundary, untyped globals narrowed here once.
interface OracleNumber {
  getCountryCodeOrDefault(): number;
  getExtension(): string | undefined;
}

interface OracleUtil {
  getSupportedRegions(): string[];
  getExampleNumberForType(regionCode: string, typeId: number): OracleNumber | null;
  parse(value: string, region: string | undefined): OracleNumber;
  format(number: OracleNumber, format: number): string;
  getNationalSignificantNumber(number: OracleNumber): string;
  getRegionCodeForNumber(number: OracleNumber): string | null | undefined;
  getNumberType(number: OracleNumber): number;
  isPossibleNumber(number: OracleNumber): boolean;
  isPossibleNumberWithReason(number: OracleNumber): number;
  isValidNumber(number: OracleNumber): boolean;
  isValidNumberForRegion(number: OracleNumber, regionCode: string): boolean;
  getCountryCodeForRegion(regionCode: string): number;
}

// Google's progressive formatter: one formatted snapshot per input character.
interface OracleAsYouTypeFormatter {
  inputDigit(nextCharacter: string): string;
}

interface PhoneNumbersNamespace {
  PhoneNumberUtil: {
    getInstance(): OracleUtil;
    ValidationResult: Record<string, number>;
  };
  PhoneNumberType: Record<NumberType | 'UNKNOWN', number>;
  PhoneNumberFormat: Record<'E164' | 'INTERNATIONAL' | 'NATIONAL' | 'RFC3966', number>;
  AsYouTypeFormatter: new (regionCode: string) => OracleAsYouTypeFormatter;
}

interface ClosureGlobal {
  require(name: string): void;
  global: { i18n: { phonenumbers: PhoneNumbersNamespace } };
}

declare global {
  // Installed on the global object by google-closure-library's nodejs bootstrap.
  var goog: ClosureGlobal | undefined;
}

// Downloads Google's phonenumber sources at `commit` into `.cache/<commit>/` once.
async function ensureSources(commit: string): Promise<string> {
  const dir = join(CACHE_DIR, commit);
  mkdirSync(dir, { recursive: true });
  for (const file of SOURCE_FILES) {
    const target = join(dir, file);
    if (existsSync(target)) continue;
    const url = `${SOURCE_BASE_URL}/${commit}/javascript/i18n/phonenumbers/${file}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    writeFileSync(target, await response.text());
  }
  return dir;
}

// Boots closure-library, loads Google's phonenumber sources, and returns the i18n.phonenumbers namespace.
function loadPhoneNumbersNamespace(dir: string): PhoneNumbersNamespace {
  const require = createRequire(import.meta.url);
  require('google-closure-library/closure/goog/bootstrap/nodejs.js'); // installs the global `goog`
  const goog = globalThis.goog;
  if (!goog) throw new Error('google-closure-library did not install the goog global');
  for (const dependency of CLOSURE_DEPENDENCIES) goog.require(dependency);
  for (const file of SOURCE_FILES) vm.runInThisContext(readFileSync(join(dir, file), 'utf8'), { filename: file });
  return goog.global.i18n.phonenumbers;
}

// Google PhoneNumberType ids -> Telixon NumberType names. Unmapped ids (UNKNOWN) fall back to 'UNKNOWN' at the call site.
function buildNumberTypeNames(types: PhoneNumbersNamespace['PhoneNumberType']): Record<number, NumberType> {
  return {
    [types.FIXED_LINE]: 'FIXED_LINE',
    [types.MOBILE]: 'MOBILE',
    [types.FIXED_LINE_OR_MOBILE]: 'FIXED_LINE_OR_MOBILE',
    [types.TOLL_FREE]: 'TOLL_FREE',
    [types.PREMIUM_RATE]: 'PREMIUM_RATE',
    [types.SHARED_COST]: 'SHARED_COST',
    [types.VOIP]: 'VOIP',
    [types.PERSONAL_NUMBER]: 'PERSONAL_NUMBER',
    [types.PAGER]: 'PAGER',
    [types.UAN]: 'UAN',
    [types.VOICEMAIL]: 'VOICEMAIL',
  };
}

// Reverse of the ValidationResult enum: id -> name. Google's INVALID_COUNTRY_CODE names the E.164
// calling code; map it to Telixon's INVALID_CALLING_CODE so the oracle compares in our vocabulary.
function buildValidationResultNames(util: PhoneNumbersNamespace['PhoneNumberUtil']): Record<number, string> {
  return Object.fromEntries(
    Object.entries(util.ValidationResult).map(([name, id]) => [
      id,
      name === 'INVALID_COUNTRY_CODE' ? 'INVALID_CALLING_CODE' : name,
    ]),
  );
}

export async function loadOracle(): Promise<Oracle> {
  const commit: string = provenance.source.commit;
  const dir = await ensureSources(commit);
  const ph = loadPhoneNumbersNamespace(dir);
  const util = ph.PhoneNumberUtil.getInstance();

  const numberTypeName = buildNumberTypeNames(ph.PhoneNumberType);
  const validationResultName = buildValidationResultNames(ph.PhoneNumberUtil);
  const sampledTypes: readonly SampledType[] = SAMPLED_TYPE_NAMES.map((name) => ({
    name,
    id: ph.PhoneNumberType[name],
  }));

  return {
    commit,
    sampledTypes,
    supportedRegions: () => util.getSupportedRegions(),
    sampleExampleE164: (regionCode, typeId) => {
      let example: OracleNumber | null;
      try {
        example = util.getExampleNumberForType(regionCode, typeId);
      } catch {
        return null;
      }
      if (!example) return null;
      try {
        return util.format(example, ph.PhoneNumberFormat.E164);
      } catch {
        return null;
      }
    },
    evaluate: (input, regionCode) => {
      let parsed: OracleNumber;
      try {
        parsed = util.parse(input, regionCode);
      } catch {
        return null;
      }
      const typeId = util.getNumberType(parsed);
      const reasonId = util.isPossibleNumberWithReason(parsed);
      const possible = util.isPossibleNumber(parsed);
      // libphonenumber formats validity-independently; gate only on possibility, matching telixon.
      return {
        isValid: util.isValidNumber(parsed),
        isPossible: possible,
        isPossibleWithReason: validationResultName[reasonId] ?? String(reasonId),
        getNumberType: numberTypeName[typeId] ?? 'UNKNOWN',
        getNationalNumber: util.getNationalSignificantNumber(parsed),
        getCallingCode: String(parsed.getCountryCodeOrDefault()),
        getExtension: parsed.getExtension() || null,
        getRegion: util.getRegionCodeForNumber(parsed) ?? null,
        formatE164: possible ? util.format(parsed, ph.PhoneNumberFormat.E164) : null,
        formatNational: possible ? util.format(parsed, ph.PhoneNumberFormat.NATIONAL) : null,
        formatInternational: possible ? util.format(parsed, ph.PhoneNumberFormat.INTERNATIONAL) : null,
        formatRfc3966: possible ? util.format(parsed, ph.PhoneNumberFormat.RFC3966) : null,
      };
    },
    countryCallingCode: (regionCode) => String(util.getCountryCodeForRegion(regionCode)),
    validForRegions: (input, regionCode, candidates) => {
      let parsed: OracleNumber;
      try {
        parsed = util.parse(input, regionCode);
      } catch {
        return null;
      }
      return candidates.filter((candidate) => util.isValidNumberForRegion(parsed, candidate)).join(',');
    },
    asYouType: (regionCode, input) => {
      const formatter = new ph.AsYouTypeFormatter(regionCode);
      const snapshots: string[] = [];
      for (const character of input) snapshots.push(formatter.inputDigit(character));
      return snapshots;
    },
    nationalInputDigits: (e164) => {
      let parsed: OracleNumber;
      try {
        parsed = util.parse(e164, undefined);
      } catch {
        return null;
      }
      return util.format(parsed, ph.PhoneNumberFormat.NATIONAL).replace(/\D/g, '');
    },
  };
}

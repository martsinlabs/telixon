import { NumberType } from '@telixon/core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import provenance from '../src/engine/PROVENANCE.json';
import { MethodResults } from './models';

// Google publishes no npm package — its JS port lives as Closure-coupled source in the repo. We fetch
// those sources at the engine's commit and run them on google-closure-library. Pinning the oracle to
// the engine's commit removes metadata version drift: any mismatch is then a real engine bug.
const SOURCE_FILES = ['phonemetadata.pb.js', 'phonenumber.pb.js', 'metadata.js', 'phonenumberutil.js'] as const;

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

// Types we sample one Google example per region for. UNKNOWN has no example numbers, and
// FIXED_LINE_OR_MOBILE only echoes a fixed-line/mobile example, so neither is sampled.
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

export interface SampledType {
  readonly name: NumberType;
  readonly id: number;
}

export interface Oracle {
  // The google/libphonenumber commit the oracle is loaded at (identical to the engine's commit).
  readonly commit: string;
  readonly sampledTypes: readonly SampledType[];
  supportedRegions(): readonly string[];
  // Google's example number for a region and type as E.164, or null when none exists.
  sampleExampleE164(regionCode: string, typeId: number): string | null;
  // The oracle's verdict for every compared method, or null when Google cannot parse the number.
  evaluate(e164: string): MethodResults | null;
}

// Minimal shapes of the closure objects we touch. The closure load is the system boundary:
// untyped globals are narrowed into these once, here.
interface OracleNumber {
  getCountryCodeOrDefault(): number;
}

interface OracleUtil {
  getSupportedRegions(): string[];
  getExampleNumberForType(regionCode: string, typeId: number): OracleNumber | null;
  parse(value: string, region: string | undefined): OracleNumber;
  format(number: OracleNumber, format: number): string;
  getNationalSignificantNumber(number: OracleNumber): string;
  getNumberType(number: OracleNumber): number;
  isPossibleNumber(number: OracleNumber): boolean;
  isPossibleNumberWithReason(number: OracleNumber): number;
  isValidNumber(number: OracleNumber): boolean;
}

interface PhoneNumbersNamespace {
  PhoneNumberUtil: {
    getInstance(): OracleUtil;
    ValidationResult: Record<string, number>;
  };
  PhoneNumberType: Record<NumberType | 'UNKNOWN', number>;
  PhoneNumberFormat: Record<'E164' | 'INTERNATIONAL' | 'NATIONAL', number>;
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
    if (!response.ok) throw new Error(`Failed to fetch ${url} → HTTP ${response.status}`);
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

// Google PhoneNumberType ids -> Telixon NumberType names. UNKNOWN maps to null at the call site.
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

// Reverse of the ValidationResult enum: id -> name.
function buildValidationResultNames(util: PhoneNumbersNamespace['PhoneNumberUtil']): Record<number, string> {
  return Object.fromEntries(Object.entries(util.ValidationResult).map(([name, id]) => [id, name]));
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
    evaluate: (e164) => {
      let parsed: OracleNumber;
      try {
        parsed = util.parse(e164, undefined);
      } catch {
        return null;
      }
      const typeId = util.getNumberType(parsed);
      const reasonId = util.isPossibleNumberWithReason(parsed);
      const valid = util.isValidNumber(parsed);
      const internationalFormat = valid ? util.format(parsed, ph.PhoneNumberFormat.INTERNATIONAL) : null;
      return {
        isValid: valid,
        isPossible: util.isPossibleNumber(parsed),
        isPossibleWithReason: validationResultName[reasonId] ?? String(reasonId),
        getNumberType: typeId === ph.PhoneNumberType.UNKNOWN ? null : (numberTypeName[typeId] ?? null),
        getNationalNumber: util.getNationalSignificantNumber(parsed),
        getCallingCode: String(parsed.getCountryCodeOrDefault()),
        getE164: valid ? util.format(parsed, ph.PhoneNumberFormat.E164) : null,
        formatInternational: internationalFormat,
        // The controller's live value is held to Google's canonical international format.
        formatAsYouType: internationalFormat,
      };
    },
  };
}

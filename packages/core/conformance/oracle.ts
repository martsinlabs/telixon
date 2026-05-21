import { NumberType } from '@telixon/core';
import gphone from 'google-libphonenumber';
import oraclePackage from 'google-libphonenumber/package.json';
import { MethodResults } from './models';

const { PhoneNumberUtil, PhoneNumberType, PhoneNumberFormat } = gphone;
const util = PhoneNumberUtil.getInstance();

// Google PhoneNumberType ids -> Telixon NumberType names. UNKNOWN maps to null at the call site.
const NUMBER_TYPE_NAMES: Record<number, NumberType> = {
  [PhoneNumberType.FIXED_LINE]: 'FIXED_LINE',
  [PhoneNumberType.MOBILE]: 'MOBILE',
  [PhoneNumberType.FIXED_LINE_OR_MOBILE]: 'FIXED_LINE_OR_MOBILE',
  [PhoneNumberType.TOLL_FREE]: 'TOLL_FREE',
  [PhoneNumberType.PREMIUM_RATE]: 'PREMIUM_RATE',
  [PhoneNumberType.SHARED_COST]: 'SHARED_COST',
  [PhoneNumberType.VOIP]: 'VOIP',
  [PhoneNumberType.PERSONAL_NUMBER]: 'PERSONAL_NUMBER',
  [PhoneNumberType.PAGER]: 'PAGER',
  [PhoneNumberType.UAN]: 'UAN',
  [PhoneNumberType.VOICEMAIL]: 'VOICEMAIL',
};

// Reverse of the runtime ValidationResult enum: id -> name.
const VALIDATION_RESULT_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(PhoneNumberUtil.ValidationResult).map(([name, id]) => [id, name]),
);

export interface SampledType {
  readonly name: NumberType;
  readonly id: number;
}

// One example number is sampled per region per entry below.
export const SAMPLED_TYPES: readonly SampledType[] = [
  { name: 'FIXED_LINE', id: PhoneNumberType.FIXED_LINE },
  { name: 'MOBILE', id: PhoneNumberType.MOBILE },
  { name: 'TOLL_FREE', id: PhoneNumberType.TOLL_FREE },
  { name: 'PREMIUM_RATE', id: PhoneNumberType.PREMIUM_RATE },
  { name: 'SHARED_COST', id: PhoneNumberType.SHARED_COST },
  { name: 'VOIP', id: PhoneNumberType.VOIP },
  { name: 'PERSONAL_NUMBER', id: PhoneNumberType.PERSONAL_NUMBER },
  { name: 'PAGER', id: PhoneNumberType.PAGER },
  { name: 'UAN', id: PhoneNumberType.UAN },
  { name: 'VOICEMAIL', id: PhoneNumberType.VOICEMAIL },
];

export function getOracleVersion(): string {
  return oraclePackage.version;
}

export function getSupportedRegionCodes(): readonly string[] {
  return util.getSupportedRegions();
}

// Google's example number for a region and type, formatted as E.164, or null when none exists.
export function sampleExampleE164(regionCode: string, typeId: number): string | null {
  let example: gphone.PhoneNumber | undefined;
  try {
    example = util.getExampleNumberForType(regionCode, typeId);
  } catch {
    return null;
  }
  if (!example) return null;
  try {
    return util.format(example, PhoneNumberFormat.E164);
  } catch {
    return null;
  }
}

// The oracle's verdict for every compared method. null when Google cannot parse the number.
export function evaluateWithOracle(e164: string): MethodResults | null {
  let parsed: gphone.PhoneNumber;
  try {
    parsed = util.parse(e164, undefined);
  } catch {
    return null;
  }
  const typeId: number = util.getNumberType(parsed);
  const reasonId: number = util.isPossibleNumberWithReason(parsed);
  const valid: boolean = util.isValidNumber(parsed);
  return {
    isValid: valid,
    isPossible: util.isPossibleNumber(parsed),
    isPossibleWithReason: VALIDATION_RESULT_NAMES[reasonId] ?? String(reasonId),
    getNumberType: typeId === PhoneNumberType.UNKNOWN ? null : (NUMBER_TYPE_NAMES[typeId] ?? null),
    getNationalNumber: util.getNationalSignificantNumber(parsed),
    getCallingCode: String(parsed.getCountryCodeOrDefault()),
    getE164: valid ? util.format(parsed, PhoneNumberFormat.E164) : null,
  };
}

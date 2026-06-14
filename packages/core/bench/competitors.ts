import {
  ensureEngineReady,
  parsePhoneNumber as telixonParse,
  type PhoneNumber as TelixonPhoneNumber,
} from '@telixon/core';
import { type RegionId } from '@telixon/core/engine';
import googleLibphonenumber from 'google-libphonenumber';
import libphonenumberJsParse, {
  validatePhoneNumberLength,
  type CountryCode,
  type PhoneNumber as LibphonenumberJsPhoneNumber,
} from 'libphonenumber-js';

export interface PhoneLibraryAdapter {
  readonly name: string;
  parse: (input: string, defaultRegion: string) => unknown;
  isValid: (parsed: unknown) => boolean;
  isPossible: (parsed: unknown) => boolean;
  isPossibleWithReason: (parsed: unknown) => string;
  getNumberType: (parsed: unknown) => string | null;
  getNationalNumber: (parsed: unknown) => string;
  getCallingCode: (parsed: unknown) => string | null;
  getCountry: (parsed: unknown) => string | null;
  getE164: (parsed: unknown) => string;
  formatNational: (parsed: unknown) => string;
  formatInternational: (parsed: unknown) => string;
  getURI: (parsed: unknown) => string;
}

export const telixonReady: Promise<void> = ensureEngineReady();

// ── Telixon ──────────────────────────────────────────────

const telixonAdapter: PhoneLibraryAdapter = {
  name: 'telixon',
  parse: (input, region) => telixonParse(input, { defaultCountry: region as RegionId }),
  isValid: (parsed) => (parsed as TelixonPhoneNumber).isValid(),
  isPossible: (parsed) => (parsed as TelixonPhoneNumber).isPossible(),
  isPossibleWithReason: (parsed) => (parsed as TelixonPhoneNumber).isPossibleWithReason(),
  getNumberType: (parsed) => (parsed as TelixonPhoneNumber).getNumberType(),
  getNationalNumber: (parsed) => (parsed as TelixonPhoneNumber).getNationalNumber(),
  getCallingCode: (parsed) => (parsed as TelixonPhoneNumber).getCallingCode(),
  getCountry: (parsed) => (parsed as TelixonPhoneNumber).getCountry(),
  getE164: (parsed) => (parsed as TelixonPhoneNumber).getE164() ?? '',
  formatNational: (parsed) => (parsed as TelixonPhoneNumber).formatNational() ?? '',
  formatInternational: (parsed) => (parsed as TelixonPhoneNumber).formatInternational() ?? '',
  getURI: (parsed) => (parsed as TelixonPhoneNumber).getURI() ?? '',
};

// ── libphonenumber-js ────────────────────────────────────

const libphonenumberJsAdapter: PhoneLibraryAdapter = {
  name: 'libphonenumber-js',
  parse: (input, region) => libphonenumberJsParse(input, region as CountryCode),
  isValid: (parsed) => (parsed as LibphonenumberJsPhoneNumber).isValid(),
  isPossible: (parsed) => (parsed as LibphonenumberJsPhoneNumber).isPossible(),
  // libphonenumber-js exposes isPossibleWithReason as a free function, not a method.
  isPossibleWithReason: (parsed) =>
    validatePhoneNumberLength((parsed as LibphonenumberJsPhoneNumber).number) ?? 'IS_POSSIBLE',
  getNumberType: (parsed) => (parsed as LibphonenumberJsPhoneNumber).getType() ?? null,
  getNationalNumber: (parsed) => (parsed as LibphonenumberJsPhoneNumber).nationalNumber,
  getCallingCode: (parsed) => (parsed as LibphonenumberJsPhoneNumber).countryCallingCode,
  getCountry: (parsed) => (parsed as LibphonenumberJsPhoneNumber).country ?? null,
  getE164: (parsed) => (parsed as LibphonenumberJsPhoneNumber).number,
  formatNational: (parsed) => (parsed as LibphonenumberJsPhoneNumber).formatNational(),
  formatInternational: (parsed) => (parsed as LibphonenumberJsPhoneNumber).formatInternational(),
  getURI: (parsed) => (parsed as LibphonenumberJsPhoneNumber).getURI(),
};

// ── google-libphonenumber ────────────────────────────────

const { PhoneNumberUtil, PhoneNumberFormat } = googleLibphonenumber;
const googleUtil = PhoneNumberUtil.getInstance();
type GooglePhoneNumber = ReturnType<typeof googleUtil.parse>;

const googleLibphonenumberAdapter: PhoneLibraryAdapter = {
  name: 'google-libphonenumber',
  parse: (input, region) => googleUtil.parse(input, region),
  isValid: (parsed) => googleUtil.isValidNumber(parsed as GooglePhoneNumber),
  isPossible: (parsed) => googleUtil.isPossibleNumber(parsed as GooglePhoneNumber),
  isPossibleWithReason: (parsed) => String(googleUtil.isPossibleNumberWithReason(parsed as GooglePhoneNumber)),
  getNumberType: (parsed) => String(googleUtil.getNumberType(parsed as GooglePhoneNumber)),
  getNationalNumber: (parsed) => String((parsed as GooglePhoneNumber).getNationalNumber()),
  getCallingCode: (parsed) => String((parsed as GooglePhoneNumber).getCountryCode()),
  getCountry: (parsed) => googleUtil.getRegionCodeForNumber(parsed as GooglePhoneNumber) ?? null,
  getE164: (parsed) => googleUtil.format(parsed as GooglePhoneNumber, PhoneNumberFormat.E164),
  formatNational: (parsed) => googleUtil.format(parsed as GooglePhoneNumber, PhoneNumberFormat.NATIONAL),
  formatInternational: (parsed) => googleUtil.format(parsed as GooglePhoneNumber, PhoneNumberFormat.INTERNATIONAL),
  getURI: (parsed) => googleUtil.format(parsed as GooglePhoneNumber, PhoneNumberFormat.RFC3966),
};

export const ADAPTERS: readonly PhoneLibraryAdapter[] = [
  telixonAdapter,
  libphonenumberJsAdapter,
  googleLibphonenumberAdapter,
] as const;

import {
  ensureEngineReady,
  parsePhoneNumber as telixonParse,
  type PhoneNumber as TelixonPhoneNumber,
} from '@telixon/core';
import { type RegionCode } from '@telixon/core/engine';
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
  getRegion: (parsed: unknown) => string | null;
  formatE164: (parsed: unknown) => string;
  formatNational: (parsed: unknown) => string;
  formatInternational: (parsed: unknown) => string;
  formatRfc3966: (parsed: unknown) => string;
}

export const telixonReady: Promise<void> = ensureEngineReady();

// ── Telixon ──────────────────────────────────────────────

const telixonAdapter: PhoneLibraryAdapter = {
  name: 'telixon',
  parse: (input, region) => telixonParse(input, { defaultRegion: region as RegionCode }),
  isValid: (parsed) => (parsed as TelixonPhoneNumber).isValid(),
  isPossible: (parsed) => (parsed as TelixonPhoneNumber).isPossible(),
  isPossibleWithReason: (parsed) => (parsed as TelixonPhoneNumber).isPossibleWithReason(),
  getNumberType: (parsed) => (parsed as TelixonPhoneNumber).getNumberType(),
  getNationalNumber: (parsed) => (parsed as TelixonPhoneNumber).getNationalNumber(),
  getCallingCode: (parsed) => (parsed as TelixonPhoneNumber).getCallingCode(),
  getRegion: (parsed) => (parsed as TelixonPhoneNumber).getRegion(),
  formatE164: (parsed) => (parsed as TelixonPhoneNumber).formatE164() ?? '',
  formatNational: (parsed) => (parsed as TelixonPhoneNumber).formatNational() ?? '',
  formatInternational: (parsed) => (parsed as TelixonPhoneNumber).formatInternational() ?? '',
  formatRfc3966: (parsed) => (parsed as TelixonPhoneNumber).formatRfc3966() ?? '',
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
  getRegion: (parsed) => (parsed as LibphonenumberJsPhoneNumber).country ?? null,
  formatE164: (parsed) => (parsed as LibphonenumberJsPhoneNumber).number,
  formatNational: (parsed) => (parsed as LibphonenumberJsPhoneNumber).formatNational(),
  formatInternational: (parsed) => (parsed as LibphonenumberJsPhoneNumber).formatInternational(),
  formatRfc3966: (parsed) => (parsed as LibphonenumberJsPhoneNumber).getURI(),
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
  getRegion: (parsed) => googleUtil.getRegionCodeForNumber(parsed as GooglePhoneNumber) ?? null,
  formatE164: (parsed) => googleUtil.format(parsed as GooglePhoneNumber, PhoneNumberFormat.E164),
  formatNational: (parsed) => googleUtil.format(parsed as GooglePhoneNumber, PhoneNumberFormat.NATIONAL),
  formatInternational: (parsed) => googleUtil.format(parsed as GooglePhoneNumber, PhoneNumberFormat.INTERNATIONAL),
  formatRfc3966: (parsed) => googleUtil.format(parsed as GooglePhoneNumber, PhoneNumberFormat.RFC3966),
};

// The competitor adapters exist only for the wall-time comparison ratio. Under CodSpeed (BENCH_TELIXON_ONLY) only telixon is benched, so the comparison libraries are not tracked as our own regressions.
const COMPARISON_ADAPTERS: readonly PhoneLibraryAdapter[] = [
  telixonAdapter,
  libphonenumberJsAdapter,
  googleLibphonenumberAdapter,
];

export const ADAPTERS: readonly PhoneLibraryAdapter[] = process.env.BENCH_TELIXON_ONLY
  ? [telixonAdapter]
  : COMPARISON_ADAPTERS;

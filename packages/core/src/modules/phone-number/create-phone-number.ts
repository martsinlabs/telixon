import { NumberType, RegionId } from '@telixon/core/engine';
import { PhoneNumber, PhoneNumberValidationResult, ResolvedPhoneNumber, ValidationError } from './models';
import { formatE164 } from './query/format-e164';
import { formatInternational } from './query/format-international';
import { formatNational } from './query/format-national';
import { formatRfc3966 } from './query/format-rfc3966';
import { getCallingCode } from './query/get-calling-code';
import { getCountry } from './query/get-country';
import { getNationalNumber } from './query/get-national-number';
import { getNumberType } from './query/get-number-type';
import { getValidationError } from './query/get-validation-error';
import { isPossibleWithReason } from './query/is-possible-with-reason';
import { isValidForCountry } from './query/is-valid-for-country';

class PhoneNumberView implements PhoneNumber {
  private cachedNationalNumber: string | undefined = undefined;

  private cachedCallingCode: string | null | undefined = undefined;

  private cachedCountry: RegionId | null | undefined = undefined;

  private cachedE164: string | null | undefined = undefined;

  private cachedFormattedNational: string | null | undefined = undefined;

  private cachedFormattedInternational: string | null | undefined = undefined;

  private cachedRfc3966: string | null | undefined = undefined;

  private cachedValidationResult: PhoneNumberValidationResult | undefined = undefined;

  private cachedValidationError: ValidationError | null | undefined = undefined;

  private cachedIsValid: boolean | undefined = undefined;

  private cachedNumberType: Exclude<NumberType, 'UNKNOWN'> | null | undefined = undefined;

  constructor(private readonly resolved: ResolvedPhoneNumber) {}

  // libphonenumber isValidNumber: a number is valid when it resolves to a concrete type.
  isValid(): boolean {
    if (this.cachedIsValid === undefined) {
      this.cachedIsValid = this.getNumberType() !== null;
    }

    return this.cachedIsValid;
  }

  // libphonenumber isValidNumberForRegion: valid for one specific country's patterns.
  isValidForCountry(country: RegionId): boolean {
    return isValidForCountry(this.resolved, country);
  }

  isPossible(): boolean {
    const validationResult: PhoneNumberValidationResult = this.isPossibleWithReason();

    return validationResult === 'IS_POSSIBLE' || validationResult === 'IS_POSSIBLE_LOCAL_ONLY';
  }

  isPossibleWithReason(): PhoneNumberValidationResult {
    if (this.cachedValidationResult === undefined) {
      this.cachedValidationResult = isPossibleWithReason(this.resolved);
    }

    return this.cachedValidationResult;
  }

  getValidationError(): ValidationError | null {
    if (this.cachedValidationError === undefined) {
      this.cachedValidationError = getValidationError(this.resolved, this.isPossibleWithReason(), this.isValid());
    }

    return this.cachedValidationError;
  }

  getNumberType(): Exclude<NumberType, 'UNKNOWN'> | null {
    if (this.cachedNumberType === undefined) {
      this.cachedNumberType = getNumberType(this.resolved);
    }

    return this.cachedNumberType;
  }

  getNationalNumber(): string {
    if (this.cachedNationalNumber === undefined) {
      this.cachedNationalNumber = getNationalNumber(this.resolved);
    }

    return this.cachedNationalNumber;
  }

  getCallingCode(): string | null {
    if (this.cachedCallingCode === undefined) {
      this.cachedCallingCode = getCallingCode(this.resolved);
    }

    return this.cachedCallingCode;
  }

  getCountry(): RegionId | null {
    if (this.cachedCountry === undefined) {
      this.cachedCountry = getCountry(this.resolved);
    }

    return this.cachedCountry;
  }

  formatE164(): string | null {
    if (this.cachedE164 === undefined) {
      this.cachedE164 = formatE164(this.resolved);
    }

    return this.cachedE164;
  }

  formatNational(): string | null {
    if (this.cachedFormattedNational === undefined) {
      this.cachedFormattedNational = formatNational(this.resolved);
    }

    return this.cachedFormattedNational;
  }

  formatInternational(): string | null {
    if (this.cachedFormattedInternational === undefined) {
      this.cachedFormattedInternational = formatInternational(this.resolved);
    }

    return this.cachedFormattedInternational;
  }

  formatRfc3966(): string | null {
    if (this.cachedRfc3966 === undefined) {
      this.cachedRfc3966 = formatRfc3966(this.resolved);
    }

    return this.cachedRfc3966;
  }
}

export function createPhoneNumber(resolved: ResolvedPhoneNumber): PhoneNumber {
  return new PhoneNumberView(resolved);
}

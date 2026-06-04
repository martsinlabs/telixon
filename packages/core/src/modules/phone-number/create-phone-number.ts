import { NumberType, RegionId } from '@telixon/core/engine';
import { PhoneNumber, PhoneNumberValidationResult, ResolvedPhoneNumber, ValidationError } from './models';
import { formatInternational } from './query/format-international';
import { formatNational } from './query/format-national';
import { getCallingCode } from './query/get-calling-code';
import { getCountry } from './query/get-country';
import { getE164 } from './query/get-e164';
import { getNationalNumber } from './query/get-national-number';
import { getNumberType } from './query/get-number-type';
import { getURI } from './query/get-uri';
import { getValidationError } from './query/get-validation-error';
import { isPossibleWithReason } from './query/is-possible-with-reason';
import { isValid } from './query/is-valid';

class PhoneNumberView implements PhoneNumber {
  private cachedNationalNumber: string | undefined = undefined;

  private cachedCallingCode: string | null | undefined = undefined;

  private cachedCountry: RegionId | null | undefined = undefined;

  private cachedE164: string | null | undefined = undefined;

  private cachedFormattedNational: string | null | undefined = undefined;

  private cachedFormattedInternational: string | null | undefined = undefined;

  private cachedURI: string | null | undefined = undefined;

  private cachedValidationResult: PhoneNumberValidationResult | undefined = undefined;

  private cachedValidationError: ValidationError | null | undefined = undefined;

  private cachedIsValid: boolean | undefined = undefined;

  constructor(private readonly resolved: ResolvedPhoneNumber) {}

  isValid(): boolean {
    if (this.cachedIsValid === undefined) {
      this.cachedIsValid = isValid(this.resolved);
    }

    return this.cachedIsValid;
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
    return getNumberType(this.resolved);
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

  getE164(): string | null {
    if (this.cachedE164 === undefined) {
      this.cachedE164 = getE164(this.resolved);
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

  getURI(): string | null {
    if (this.cachedURI === undefined) {
      this.cachedURI = getURI(this.resolved);
    }

    return this.cachedURI;
  }
}

export function createPhoneNumber(resolved: ResolvedPhoneNumber): PhoneNumber {
  return new PhoneNumberView(resolved);
}

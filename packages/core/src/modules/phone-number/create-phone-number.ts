import { NumberType, RegionCode } from '@telixon/core/engine';
import { PhoneNumber, PossibilityResult, ResolvedPhoneNumber, ValidationError } from './models';
import { formatE164 } from './query/format-e164';
import { formatInternational } from './query/format-international';
import { formatNational } from './query/format-national';
import { formatRfc3966 } from './query/format-rfc3966';
import { getCallingCode } from './query/get-calling-code';
import { getNationalNumber } from './query/get-national-number';
import { getNumberType } from './query/get-number-type';
import { getRegion } from './query/get-region';
import { getValidationError } from './query/get-validation-error';
import { isPossibleWithReason } from './query/is-possible-with-reason';
import { isValidForRegion } from './query/is-valid-for-region';

// `undefined` marks an unfilled memo slot; `null` is a legitimate cached result.
class PhoneNumberView implements PhoneNumber {
  #cachedNationalNumber: string | undefined = undefined;

  #cachedCallingCode: string | null | undefined = undefined;

  #cachedRegion: RegionCode | null | undefined = undefined;

  #cachedE164: string | null | undefined = undefined;

  #cachedFormattedNational: string | null | undefined = undefined;

  #cachedFormattedInternational: string | null | undefined = undefined;

  #cachedRfc3966: string | null | undefined = undefined;

  #cachedValidationResult: PossibilityResult | undefined = undefined;

  #cachedValidationError: ValidationError | null | undefined = undefined;

  #cachedIsValid: boolean | undefined = undefined;

  #cachedNumberType: NumberType | undefined = undefined;

  readonly #resolved: ResolvedPhoneNumber;

  constructor(resolved: ResolvedPhoneNumber) {
    this.#resolved = resolved;
  }

  // libphonenumber isValidNumber: a number is valid when it resolves to a concrete type.
  isValid(): boolean {
    if (this.#cachedIsValid === undefined) {
      this.#cachedIsValid = this.getNumberType() !== 'UNKNOWN';
    }

    return this.#cachedIsValid;
  }

  // libphonenumber isValidNumberForRegion: valid for one specific region's patterns.
  isValidForRegion(region: RegionCode): boolean {
    return isValidForRegion(this.#resolved, region);
  }

  isPossible(): boolean {
    const validationResult: PossibilityResult = this.isPossibleWithReason();

    return validationResult === 'IS_POSSIBLE' || validationResult === 'IS_POSSIBLE_LOCAL_ONLY';
  }

  isPossibleWithReason(): PossibilityResult {
    if (this.#cachedValidationResult === undefined) {
      this.#cachedValidationResult = isPossibleWithReason(this.#resolved);
    }

    return this.#cachedValidationResult;
  }

  getValidationError(): ValidationError | null {
    if (this.#cachedValidationError === undefined) {
      this.#cachedValidationError = getValidationError(this.#resolved, this.isPossibleWithReason(), this.isValid());
    }

    return this.#cachedValidationError;
  }

  getNumberType(): NumberType {
    if (this.#cachedNumberType === undefined) {
      this.#cachedNumberType = getNumberType(this.#resolved);
    }

    return this.#cachedNumberType;
  }

  getNationalNumber(): string {
    if (this.#cachedNationalNumber === undefined) {
      this.#cachedNationalNumber = getNationalNumber(this.#resolved);
    }

    return this.#cachedNationalNumber;
  }

  getCallingCode(): string | null {
    if (this.#cachedCallingCode === undefined) {
      this.#cachedCallingCode = getCallingCode(this.#resolved);
    }

    return this.#cachedCallingCode;
  }

  // Captured at parse; the stored value is the answer, with nothing to compute or cache.
  getExtension(): string | null {
    return this.#resolved.extension;
  }

  getRegion(): RegionCode | null {
    if (this.#cachedRegion === undefined) {
      this.#cachedRegion = getRegion(this.#resolved);
    }

    return this.#cachedRegion;
  }

  formatE164(): string | null {
    if (this.#cachedE164 === undefined) {
      this.#cachedE164 = formatE164(this.#resolved);
    }

    return this.#cachedE164;
  }

  formatNational(): string | null {
    if (this.#cachedFormattedNational === undefined) {
      this.#cachedFormattedNational = formatNational(this.#resolved);
    }

    return this.#cachedFormattedNational;
  }

  formatInternational(): string | null {
    if (this.#cachedFormattedInternational === undefined) {
      this.#cachedFormattedInternational = formatInternational(this.#resolved);
    }

    return this.#cachedFormattedInternational;
  }

  formatRfc3966(): string | null {
    if (this.#cachedRfc3966 === undefined) {
      this.#cachedRfc3966 = formatRfc3966(this.#resolved);
    }

    return this.#cachedRfc3966;
  }
}

export function createPhoneNumber(resolved: ResolvedPhoneNumber): PhoneNumber {
  return new PhoneNumberView(resolved);
}

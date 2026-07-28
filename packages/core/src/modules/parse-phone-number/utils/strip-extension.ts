// Port of libphonenumber's extension capture (createExtnPattern_ / maybeStripExtension), byte-exact
// to the engine's pinned commit. The pattern lives in code and the preferred output prefix lives in
// territory metadata, mirroring where Google keeps each. Compiled once; parsePhoneNumber gates the
// call, keeping inputs of digits and plain punctuation off the regex machinery entirely.

// Character classes from PhoneNumberUtil at the pinned commit, kept as \u escapes for auditability.
const VALID_DIGITS = '0-9\uFF10-\uFF19\u0660-\u0669\u06F0-\u06F9';
const PLUS_CHARS = '+\uFF0B';
const STAR_SIGN = '*';
const VALID_ALPHA = 'A-Za-z';
const VALID_PUNCTUATION =
  '-x\u2010-\u2015\u2212\u30FC\uFF0D-\uFF0F \u00A0\u00AD\u200B\u2060\u3000' +
  '()\uFF08\uFF09\uFF3B\uFF3D.\\[\\]/~\u2053\u223C\uFF5E';

// Capture of 1..maxLength extension digits (extnDigits_).
function extensionDigitsPattern(maxLength: number): string {
  return `([${VALID_DIGITS}]{1,${maxLength}})`;
}

// The six alternatives of createExtnPattern_, with Google's per-notation digit limits.
function createExtensionPattern(): string {
  const extLimitAfterExplicitLabel = 20;
  const extLimitAfterLikelyLabel = 15;
  const extLimitAfterAmbiguousChar = 9;
  const extLimitWhenNotSure = 6;

  const possibleSeparatorsBetweenNumberAndExtLabel = '[ \u00A0\\t,]*';
  const possibleCharsAfterExtLabel = '[:\\.\uFF0E]?[ \u00A0\\t,-]*';
  const optionalExtnSuffix = '#?';

  const explicitExtLabels =
    '(?:e?xt(?:ensi(?:o\u0301?|\u00F3))?n?|\uFF45?\uFF58\uFF54\uFF4E?|\u0434\u043E\u0431|anexo)';
  const ambiguousExtLabels = '(?:[x\uFF58#\uFF03~\uFF5E]|int|\uFF49\uFF4E\uFF54)';
  const ambiguousSeparator = '[- ]+';
  const possibleSeparatorsNumberExtLabelNoComma = '[ \u00A0\\t]*';
  const autoDiallingAndExtLabelsFound = '(?:,{2}|;)';

  const rfcExtn = `;ext=${extensionDigitsPattern(extLimitAfterExplicitLabel)}`;
  const explicitExtn =
    possibleSeparatorsBetweenNumberAndExtLabel +
    explicitExtLabels +
    possibleCharsAfterExtLabel +
    extensionDigitsPattern(extLimitAfterExplicitLabel) +
    optionalExtnSuffix;
  const ambiguousExtn =
    possibleSeparatorsBetweenNumberAndExtLabel +
    ambiguousExtLabels +
    possibleCharsAfterExtLabel +
    extensionDigitsPattern(extLimitAfterAmbiguousChar) +
    optionalExtnSuffix;
  const americanStyleExtnWithSuffix = `${ambiguousSeparator}${extensionDigitsPattern(extLimitWhenNotSure)}#`;
  const autoDiallingExtn =
    possibleSeparatorsNumberExtLabelNoComma +
    autoDiallingAndExtLabelsFound +
    possibleCharsAfterExtLabel +
    extensionDigitsPattern(extLimitAfterLikelyLabel) +
    optionalExtnSuffix;
  const onlyCommasExtn =
    possibleSeparatorsNumberExtLabelNoComma +
    '(?:,)+' +
    possibleCharsAfterExtLabel +
    extensionDigitsPattern(extLimitAfterAmbiguousChar) +
    optionalExtnSuffix;

  return `${rfcExtn}|${explicitExtn}|${ambiguousExtn}|${americanStyleExtnWithSuffix}|${autoDiallingExtn}|${onlyCommasExtn}`;
}

// EXTN_PATTERN_: the extension notations anchored to the end of the input.
const EXTENSION_SUFFIX_PATTERN = new RegExp(`(?:${createExtensionPattern()})$`, 'i');

// VALID_PHONE_NUMBER_PATTERN_: the guard that the text before a suffix is itself a phone number.
const MIN_LENGTH_PHONE_NUMBER_PATTERN = `[${VALID_DIGITS}]{2}`;
const VALID_PHONE_NUMBER =
  `[${PLUS_CHARS}]*(?:[${VALID_PUNCTUATION}${STAR_SIGN}]*[${VALID_DIGITS}]){3,}` +
  `[${VALID_PUNCTUATION}${STAR_SIGN}${VALID_ALPHA}${VALID_DIGITS}]*`;
const VIABLE_PHONE_NUMBER_PATTERN = new RegExp(
  `^${MIN_LENGTH_PHONE_NUMBER_PATTERN}$|^${VALID_PHONE_NUMBER}(?:${createExtensionPattern()})?$`,
  'i',
);

export interface StrippedExtension {
  readonly base: string;
  readonly extension: string | null;
}

/**
 * Splits a trailing extension off `input`, mirroring libphonenumber's maybeStripExtension. The
 * suffix is cut only when the text before it is a viable phone number; the captured digits are
 * returned as typed, with the notation and any trailing `#` dropped.
 */
export function stripExtension(input: string): StrippedExtension {
  const match: RegExpExecArray | null = EXTENSION_SUFFIX_PATTERN.exec(input);
  if (match === null) return { base: input, extension: null };

  const base: string = input.slice(0, match.index);
  if (!VIABLE_PHONE_NUMBER_PATTERN.test(base)) return { base: input, extension: null };

  // The alternatives capture into separate groups; the one that matched holds the digits.
  for (let groupIndex = 1; groupIndex < match.length; groupIndex++) {
    const captured: string | undefined = match[groupIndex];
    if (captured !== undefined && captured.length > 0) return { base, extension: captured };
  }

  return { base: input, extension: null };
}

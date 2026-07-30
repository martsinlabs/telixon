/**
 * The confidence grade for two inputs denoting the same number. Mirrors libphonenumber's
 * MatchType: `EXACT_MATCH` needs the calling code, the national number, and the extension to
 * agree; `NSN_MATCH` lacks a calling code on at least one side; `SHORT_NSN_MATCH` covers one
 * national number being a shorter variant of the other, or a difference only in a leading zero or
 * an extension's presence; `NOT_A_NUMBER` reports an input no number could be read from.
 */
export type PhoneNumberMatch = 'EXACT_MATCH' | 'NSN_MATCH' | 'SHORT_NSN_MATCH' | 'NO_MATCH' | 'NOT_A_NUMBER';

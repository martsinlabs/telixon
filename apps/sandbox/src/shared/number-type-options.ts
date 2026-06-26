import type { NumberType } from '@telixon/core';
import type { ChipFilterOption } from './chip-filter';

// The number-type filter options, shared by the demos so both present the same vocabulary.
export const NUMBER_TYPE_OPTIONS: readonly ChipFilterOption<NumberType>[] = [
  { value: 'FIXED_LINE', label: 'Fixed line' },
  { value: 'MOBILE', label: 'Mobile' },
  { value: 'FIXED_LINE_OR_MOBILE', label: 'Fixed line or mobile' },
  { value: 'TOLL_FREE', label: 'Toll free' },
  { value: 'PREMIUM_RATE', label: 'Premium rate' },
  { value: 'SHARED_COST', label: 'Shared cost' },
  { value: 'VOIP', label: 'VoIP' },
  { value: 'PERSONAL_NUMBER', label: 'Personal number' },
  { value: 'PAGER', label: 'Pager' },
  { value: 'UAN', label: 'UAN' },
  { value: 'VOICEMAIL', label: 'Voicemail' },
];

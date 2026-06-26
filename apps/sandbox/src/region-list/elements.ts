import { mustGet } from '../shared/must-get';

export const localeEl = mustGet('#locale', HTMLSelectElement);
export const sortEl = mustGet('#sort', HTMLSelectElement);
export const prioritizeEl = mustGet('#prioritize', HTMLInputElement);
export const applyConfigBtn = mustGet('#apply-config', HTMLButtonElement);
export const refreshBtn = mustGet('#refresh', HTMLButtonElement);
export const regionFilterEl = mustGet('#region-filter', HTMLInputElement);
export const numberTypeFilterEl = mustGet('#number-type-filter', HTMLDivElement);
export const applyFiltersBtn = mustGet('#apply-filters', HTMLButtonElement);
export const clearFiltersBtn = mustGet('#clear-filters', HTMLButtonElement);
export const searchEl = mustGet('#search', HTMLInputElement);
export const countEl = mustGet('#count', HTMLSpanElement);
export const optionsEl = mustGet('#options', HTMLUListElement);
export const stateEl = mustGet('#state', HTMLPreElement);

import type { ParseReport } from '../models';

/** The report of a parse that carries a changed fault and leaves the value alone. */
export const ERROR_REPORT: ParseReport = { kind: 'error' };

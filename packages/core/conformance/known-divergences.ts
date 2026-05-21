import { MethodName, Mismatch } from './models';

export interface KnownDivergence {
  readonly method: MethodName;
  readonly regionCode: string;
  readonly e164: string;
  readonly reason: string;
}

// Mismatches we explicitly accept. Every entry needs a reason; anything not listed fails the gate.
export const KNOWN_DIVERGENCES: readonly KnownDivergence[] = [
  {
    method: 'isPossibleWithReason',
    regionCode: 'CA',
    e164: '+13101234',
    reason:
      'Metadata drift: the pinned engine treats a length-7 CA number as a national UAN length; the older oracle treats it as local-only.',
  },
];

function matches(divergence: KnownDivergence, mismatch: Mismatch): boolean {
  return (
    divergence.method === mismatch.method &&
    divergence.regionCode === mismatch.regionCode &&
    divergence.e164 === mismatch.e164
  );
}

export interface DivergenceAudit {
  // Mismatches absent from the allowlist — must be empty for the gate to pass.
  readonly unexpected: readonly Mismatch[];
  // Allowlist entries no longer observed — must be empty so the list cannot rot.
  readonly stale: readonly KnownDivergence[];
}

export function auditMismatches(mismatches: readonly Mismatch[]): DivergenceAudit {
  return {
    unexpected: mismatches.filter((mismatch) => !KNOWN_DIVERGENCES.some((known) => matches(known, mismatch))),
    stale: KNOWN_DIVERGENCES.filter((known) => !mismatches.some((mismatch) => matches(known, mismatch))),
  };
}

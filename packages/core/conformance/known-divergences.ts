import { MethodName, Mismatch, MismatchKind } from './models';

export interface KnownDivergence {
  readonly method: MethodName;
  readonly kind: MismatchKind;
  readonly regionCode: string;
  readonly input: string;
  readonly reason: string;
}

// Mismatches we explicitly accept. Every entry needs a reason; anything not listed fails the gate.
export const KNOWN_DIVERGENCES: readonly KnownDivergence[] = [];

function matches(divergence: KnownDivergence, mismatch: Mismatch): boolean {
  return (
    divergence.method === mismatch.method && divergence.kind === mismatch.kind && divergence.input === mismatch.input
  );
}

export interface DivergenceAudit {
  // Mismatches absent from the allowlist: must be empty for the gate to pass.
  readonly unexpected: readonly Mismatch[];
  // Allowlist entries no longer observed: must be empty so the list cannot rot.
  readonly stale: readonly KnownDivergence[];
}

export function auditMismatches(mismatches: readonly Mismatch[]): DivergenceAudit {
  return {
    unexpected: mismatches.filter((mismatch) => !KNOWN_DIVERGENCES.some((known) => matches(known, mismatch))),
    stale: KNOWN_DIVERGENCES.filter((known) => !mismatches.some((mismatch) => matches(known, mismatch))),
  };
}

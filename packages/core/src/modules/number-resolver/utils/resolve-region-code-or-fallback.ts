import { RegionCode } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveRegionCodeFast } from './resolve-region-code';

// Region the number belongs to, else the fallback region (keeps the controllers' flag stable mid-typing).
export function resolveRegionCodeOrFallback(
  callingCodeState: number,
  endState: number,
  nationalDigits: string,
  fallbackRegionIndex: number,
): RegionCode | null {
  return (
    resolveRegionCodeFast(callingCodeState, endState, nationalDigits) ??
    getResourceProvider().regionIds[fallbackRegionIndex] ??
    null
  );
}

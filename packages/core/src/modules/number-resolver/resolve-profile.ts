import {
  ENGINE_DEAD,
  Engine,
  STATE_FLAG_TERMINAL_PREFIX,
  findScopeEntry,
  forEachExactRegion,
  forEachLength,
  forEachScopeRegion,
  getExactTypeMask,
  getMaxLength,
  getProfileLengthMask,
  getReachableLengthMask,
  getRegionTypeCount,
  getRegionTypeId,
  getScopeNumberTypeMask,
  getScopeProfileId,
  getScopeTerminalTypeMask,
  getStateFlags,
  getTypeMaskAtLength,
  hasExactMatch,
  stepDigit,
} from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { NumberResolverSnapshot, NumberTypeProfileRef } from './models';
import { stateMatchesFilters } from './utils/state-matches-filters';

// Resolution context for one snapshot: scope describes the live branch below the end state, the exact layer terminals at/above; candidacy unions both (R4).
interface ResolveContext {
  readonly engine: Engine;
  readonly length: number;
  readonly endState: number;
  // Totals achievable from the typed digits.
  readonly reachableTotals: number;
  readonly hasTerminals: boolean;
  readonly callingCodeState: number;
  readonly nationalDigits: string;
  readonly regionFilter: BinaryFilter | null;
  readonly numberTypeFilter: BinaryFilter | null;
}

function makeContext(snapshot: NumberResolverSnapshot): ResolveContext {
  const { engine } = getResourceProvider();
  return {
    engine,
    length: snapshot.nationalDigits.length,
    endState: snapshot.endState,
    reachableTotals: getReachableLengthMask(engine, snapshot.endState),
    hasTerminals: hasExactMatch(engine, snapshot.endState),
    callingCodeState: snapshot.callingCodeState,
    nationalDigits: snapshot.nationalDigits,
    regionFilter: snapshot.regionFilter,
    numberTypeFilter: snapshot.numberTypeFilter,
  };
}

function isRegionExcluded(context: ResolveContext, regionIndex: number): boolean {
  return context.regionFilter !== null && context.regionFilter[regionIndex] === 0;
}

function isTypeExcluded(context: ResolveContext, regionIndex: number, typePosition: number): boolean {
  if (context.numberTypeFilter === null) return false;
  const typeId: number = getRegionTypeId(context.engine, regionIndex, typePosition);
  return context.numberTypeFilter[typeId] === 0;
}

function isConcrete(context: ResolveContext, profile: NumberTypeProfileRef): boolean {
  return profile.numberTypeIndex !== getRegionTypeCount(context.engine, profile.regionIndex) - 1;
}

// Deepest walk state whose scope lists the region (re-walks the short truncated prefix for regions absent at the end state).
function findScopeEntryAlongWalk(context: ResolveContext, regionIndex: number): number {
  if (context.callingCodeState === -1) return -1;

  let entry: number = findScopeEntry(context.engine, context.callingCodeState, regionIndex);
  let state: number = context.callingCodeState;
  const digits: string = context.nationalDigits;
  for (let i = 0; i < digits.length; i++) {
    state = stepDigit(context.engine, state, digits.charCodeAt(i) - 48);
    if (state === ENGINE_DEAD) break;
    const candidate: number = findScopeEntry(context.engine, state, regionIndex);
    if (candidate !== -1) entry = candidate;
  }
  return entry;
}

// First allowed type of the candidate mask as a profile ref (CTZ priority order); profile id from the scope entry or the walk.
function profileFromMask(
  context: ResolveContext,
  scopeEntryIndex: number,
  regionIndex: number,
  candidateMask: number,
): NumberTypeProfileRef | null {
  if (candidateMask === 0) return null;

  const entry: number = scopeEntryIndex !== -1 ? scopeEntryIndex : findScopeEntryAlongWalk(context, regionIndex);
  if (entry === -1) return null;

  const scopeTypeMask: number = getScopeNumberTypeMask(context.engine, entry);

  let mask: number = candidateMask;
  while (mask !== 0) {
    const typePosition: number = 31 - Math.clz32(mask & -mask);
    mask &= mask - 1;

    if (isTypeExcluded(context, regionIndex, typePosition)) continue;

    return {
      regionIndex,
      numberTypeIndex: typePosition,
      numberTypeProfileId: getScopeProfileId(context.engine, entry, scopeTypeMask, typePosition),
    };
  }

  return null;
}

// Partial candidacy at the end state (R4): scope candidacy below unioned with exact acceptance above, over achievable totals >= minTotal.
function futureCandidateMask(
  context: ResolveContext,
  scopeEntryIndex: number,
  regionIndex: number,
  minTotal: number,
): number {
  const totals: number = context.reachableTotals & ~((1 << minTotal) - 1);
  let union = 0;
  forEachLength(totals, (total: number) => {
    if (scopeEntryIndex !== -1) union |= getTypeMaskAtLength(context.engine, scopeEntryIndex, total);
    union |= getExactTypeMask(context.engine, context.endState, regionIndex, total);
  });
  return union;
}

// Exact probe: types whose pattern accepts the entire typed number (exact layer, accumulated).
function exactProfileAt(context: ResolveContext, regionIndex: number): NumberTypeProfileRef | null {
  const exactMask: number = getExactTypeMask(context.engine, context.endState, regionIndex, context.length);
  if (exactMask === 0) return null;
  const entry: number = findScopeEntry(context.engine, context.endState, regionIndex);
  return profileFromMask(context, entry, regionIndex, exactMask);
}

// Partial probe: types that can still grow to an achievable total from here.
function partialProfileAt(context: ResolveContext, regionIndex: number): NumberTypeProfileRef | null {
  const entry: number = findScopeEntry(context.engine, context.endState, regionIndex);
  return profileFromMask(context, entry, regionIndex, futureCandidateMask(context, entry, regionIndex, context.length));
}

// Exact matches across regions: concrete preferred-then-fallback; among generalDesc, a region live at the end state wins, then preferred.
function resolveAnyExact(context: ResolveContext, preferredRegionIndex: number): NumberTypeProfileRef | null {
  let concretePreferred: NumberTypeProfileRef | null = null;
  let concreteFallback: NumberTypeProfileRef | null = null;
  let generalScopedPreferred: NumberTypeProfileRef | null = null;
  let generalScoped: NumberTypeProfileRef | null = null;
  let generalPreferred: NumberTypeProfileRef | null = null;
  let generalFallback: NumberTypeProfileRef | null = null;

  forEachExactRegion(context.engine, context.endState, context.length, (regionIndex, exactTypeMask) => {
    if (isRegionExcluded(context, regionIndex)) return;

    const entry: number = findScopeEntry(context.engine, context.endState, regionIndex);
    const profile = profileFromMask(context, entry, regionIndex, exactTypeMask);
    if (!profile) return;

    const isPreferred: boolean = regionIndex === preferredRegionIndex;
    if (!isConcrete(context, profile)) {
      if (entry !== -1 && isPreferred && !generalScopedPreferred) generalScopedPreferred = profile;
      else if (entry !== -1 && !generalScoped) generalScoped = profile;
      else if (isPreferred && !generalPreferred) generalPreferred = profile;
      else if (!generalFallback) generalFallback = profile;
      return;
    }

    if (isPreferred) {
      concretePreferred = profile;
      return true;
    }
    if (!concreteFallback) concreteFallback = profile;
  });

  return (
    concretePreferred ??
    concreteFallback ??
    generalScopedPreferred ??
    generalScoped ??
    generalPreferred ??
    generalFallback
  );
}

// One pass over non-preferred regions: the first concrete partial and the first generalDesc partial.
interface FallbackPartials {
  readonly concrete: NumberTypeProfileRef | null;
  readonly general: NumberTypeProfileRef | null;
}

function resolveFallbackPartials(context: ResolveContext, preferredRegionIndex: number): FallbackPartials {
  let concrete: NumberTypeProfileRef | null = null;
  let general: NumberTypeProfileRef | null = null;

  forEachScopeRegion(context.engine, context.endState, (scopeEntryIndex, regionIndex) => {
    if (isRegionExcluded(context, regionIndex) || regionIndex === preferredRegionIndex) return;

    const profile = profileFromMask(
      context,
      scopeEntryIndex,
      regionIndex,
      futureCandidateMask(context, scopeEntryIndex, regionIndex, context.length),
    );
    if (!profile) return;

    if (isConcrete(context, profile)) {
      concrete = profile;
      return true;
    }
    if (!general) general = profile;
  });

  return { concrete, general };
}

// Strict mode never leaves the preferred region: exact first, then partial.
function resolveStrictPreferred(context: ResolveContext, preferredRegionIndex: number): NumberTypeProfileRef | null {
  if (isRegionExcluded(context, preferredRegionIndex)) return null;

  let generalProfile: NumberTypeProfileRef | null = null;

  if (context.hasTerminals) {
    const profile = exactProfileAt(context, preferredRegionIndex);
    if (profile && isConcrete(context, profile)) return profile;
    if (profile) generalProfile = profile;
  }

  const profile = partialProfileAt(context, preferredRegionIndex);
  if (profile && isConcrete(context, profile)) return profile;
  if (profile && !generalProfile) generalProfile = profile;

  return generalProfile;
}

// Resolution order: anchored exact, any exact (preferred first), preferred partial, anchored partial, fallback partial, generalDesc partial.
export function resolveProfile(
  snapshot: NumberResolverSnapshot,
  preferredRegionIndex: number,
): NumberTypeProfileRef | null {
  const context: ResolveContext = makeContext(snapshot);

  if (snapshot.strict && preferredRegionIndex !== -1) {
    return resolveStrictPreferred(context, preferredRegionIndex);
  }

  const anchoredRegionIndex: number = resolveAnchoredRegionIndex(context, snapshot);

  if (context.hasTerminals) {
    if (anchoredRegionIndex !== -1 && !isRegionExcluded(context, anchoredRegionIndex)) {
      const anchoredExact = exactProfileAt(context, anchoredRegionIndex);
      if (anchoredExact && isConcrete(context, anchoredExact)) return anchoredExact;
    }

    const anyExact = resolveAnyExact(context, preferredRegionIndex);
    if (anyExact) return anyExact;
  }

  let preferredPartial: NumberTypeProfileRef | null = null;
  if (preferredRegionIndex !== -1 && !isRegionExcluded(context, preferredRegionIndex)) {
    preferredPartial = partialProfileAt(context, preferredRegionIndex);
    if (preferredPartial && isConcrete(context, preferredPartial)) return preferredPartial;
  }

  if (
    anchoredRegionIndex !== -1 &&
    anchoredRegionIndex !== preferredRegionIndex &&
    !isRegionExcluded(context, anchoredRegionIndex)
  ) {
    const profile = partialProfileAt(context, anchoredRegionIndex);
    if (profile) return profile;
  }

  const fallback: FallbackPartials = resolveFallbackPartials(context, preferredRegionIndex);
  if (fallback.concrete) return fallback.concrete;

  // GeneralDesc tail: the preferred region's partial (general here, concrete returned above).
  return preferredPartial ?? fallback.general;
}

// Unique concrete region with a terminal at this state whose profile can still reach the full length.
function uniqueConcreteTerminalRegionAt(context: ResolveContext, state: number, totalDigits: number): number {
  let uniqueRegionIndex = -1;
  let multiple = false;

  forEachScopeRegion(context.engine, state, (scopeEntryIndex, regionIndex) => {
    if (isRegionExcluded(context, regionIndex)) return;

    const generalDescPosition: number = getRegionTypeCount(context.engine, regionIndex) - 1;
    let mask: number = getScopeTerminalTypeMask(context.engine, scopeEntryIndex) & ~(1 << generalDescPosition);
    const scopeTypeMask: number = getScopeNumberTypeMask(context.engine, scopeEntryIndex);

    let reachable = false;
    while (mask !== 0 && !reachable) {
      const typePosition: number = 31 - Math.clz32(mask & -mask);
      mask &= mask - 1;

      if (isTypeExcluded(context, regionIndex, typePosition)) continue;

      const profileId: number = getScopeProfileId(context.engine, scopeEntryIndex, scopeTypeMask, typePosition);
      if (totalDigits <= getMaxLength(getProfileLengthMask(context.engine, profileId))) reachable = true;
    }
    if (!reachable) return;

    if (uniqueRegionIndex === -1) {
      uniqueRegionIndex = regionIndex;
      return;
    }
    if (uniqueRegionIndex !== regionIndex) {
      multiple = true;
      return true;
    }
  });

  return multiple ? -1 : uniqueRegionIndex;
}

// The anchor: latest digit position whose state has a single concrete terminal region reaching the full length (keeps the region stable while typing).
function resolveAnchoredRegionIndex(context: ResolveContext, snapshot: NumberResolverSnapshot): number {
  const totalDigits: number = snapshot.nationalDigits.length;
  if (totalDigits === 0 || snapshot.callingCodeState === -1) return -1;

  const filtersActive: boolean = snapshot.regionFilter !== null || snapshot.numberTypeFilter !== null;

  // Only states carrying a terminal can anchor; the flags word filters them during the re-walk.
  const terminalStates: number[] = [];
  let state: number = snapshot.callingCodeState;
  for (let i = 0; i < totalDigits; i++) {
    state = stepDigit(context.engine, state, snapshot.nationalDigits.charCodeAt(i) - 48);
    if (state === ENGINE_DEAD) break;
    if (filtersActive && !stateMatchesFilters(state, snapshot.regionFilter, snapshot.numberTypeFilter)) break;
    if (getStateFlags(context.engine, state) & STATE_FLAG_TERMINAL_PREFIX) terminalStates.push(state);
  }

  for (let position = terminalStates.length - 1; position >= 0; position--) {
    const regionIndex: number = uniqueConcreteTerminalRegionAt(context, terminalStates[position]!, totalDigits);
    if (regionIndex !== -1) return regionIndex;
  }

  return -1;
}

export function resolveLatestConcreteRegionIndex(snapshot: NumberResolverSnapshot): number {
  return resolveAnchoredRegionIndex(makeContext(snapshot), snapshot);
}

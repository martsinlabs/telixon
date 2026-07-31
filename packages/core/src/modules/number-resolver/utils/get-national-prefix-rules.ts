import {
  getRegionNationalPrefix,
  getRegionPrefixForParsing,
  getRegionTransformRule,
  NationalPrefixRules,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getProcessScopedCache } from '@telixon/core/utils/get-process-scoped-cache';

// National-prefix rules per region, decoded lazily and cached (consulted per parse and per
// keystroke). Process-scoped, so every bundled copy of this module shares the memo.
const cache = getProcessScopedCache('nationalPrefixRules', () => [] as (NationalPrefixRules | undefined)[]);

export function getNationalPrefixRules(regionIndex: number): NationalPrefixRules | undefined {
  if (regionIndex < 0) return undefined;

  let rules: NationalPrefixRules | undefined = cache[regionIndex];
  if (rules === undefined) {
    const tables = getResourceProvider().engine;
    const nationalPrefix: string | undefined = getRegionNationalPrefix(tables, regionIndex);
    const prefixForParsing: string | undefined = getRegionPrefixForParsing(tables, regionIndex);
    const transformRule: string | undefined = getRegionTransformRule(tables, regionIndex);

    rules = {};
    if (nationalPrefix !== undefined) rules.nationalPrefix = nationalPrefix;
    if (prefixForParsing !== undefined) rules.nationalPrefixForParsing = prefixForParsing;
    if (transformRule !== undefined) rules.nationalPrefixTransformRule = transformRule;

    cache[regionIndex] = rules;
  }
  return rules;
}

export function __clearNationalPrefixRulesCache(): void {
  cache.length = 0;
}

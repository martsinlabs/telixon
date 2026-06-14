import {
  getRegionNationalPrefix,
  getRegionPrefixForParsing,
  getRegionTransformRule,
  NationalPrefixRules,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// National-prefix rules per region, decoded lazily and cached (consulted per parse and per keystroke).
const cache: (NationalPrefixRules | undefined)[] = [];

export function getNationalPrefixRules(countryIndex: number): NationalPrefixRules | undefined {
  if (countryIndex < 0) return undefined;

  let rules: NationalPrefixRules | undefined = cache[countryIndex];
  if (rules === undefined) {
    const tables = getResourceProvider().engine;
    const nationalPrefix: string | undefined = getRegionNationalPrefix(tables, countryIndex);
    const prefixForParsing: string | undefined = getRegionPrefixForParsing(tables, countryIndex);
    const transformRule: string | undefined = getRegionTransformRule(tables, countryIndex);

    rules = {};
    if (nationalPrefix !== undefined) rules.nationalPrefix = nationalPrefix;
    if (prefixForParsing !== undefined) rules.nationalPrefixForParsing = prefixForParsing;
    if (transformRule !== undefined) rules.nationalPrefixTransformRule = transformRule;

    cache[countryIndex] = rules;
  }
  return rules;
}

export function __clearNationalPrefixRulesCache(): void {
  cache.length = 0;
}

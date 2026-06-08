// Cached prefix matchers for a format's leadingDigits. Format selection runs per keystroke, so the
// compiled regex is memoized. An empty leadingDigits places no constraint and matches anything.
const prefixMatchers = new Map<string, RegExp>();

export function matchesLeadingDigits(leadingDigits: string, nationalDigits: string): boolean {
  if (!leadingDigits) return true;
  let matcher: RegExp | undefined = prefixMatchers.get(leadingDigits);
  if (!matcher) {
    matcher = new RegExp(`^(?:${leadingDigits})`);
    prefixMatchers.set(leadingDigits, matcher);
  }
  return matcher.test(nationalDigits);
}

export function __clearPrefixMatcherCache(): void {
  prefixMatchers.clear();
}

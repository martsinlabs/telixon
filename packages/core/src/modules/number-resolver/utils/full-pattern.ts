// Cached anchored full-pattern matchers (^(?:pattern)$). Pattern matching runs per keystroke.
const fullPatterns = new Map<string, RegExp>();

export function fullPattern(pattern: string): RegExp {
  let matcher: RegExp | undefined = fullPatterns.get(pattern);
  if (!matcher) {
    matcher = new RegExp(`^(?:${pattern})$`);
    fullPatterns.set(pattern, matcher);
  }
  return matcher;
}

export function __clearFullPatternCache(): void {
  fullPatterns.clear();
}

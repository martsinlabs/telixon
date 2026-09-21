import type { TelixonPhoneInputOptions } from '../models';

// The widget has setters for these. Every other option only takes effect in a new widget.
const LIVE_OPTION_KEYS: ReadonlySet<string> = new Set(['regionFilter', 'numberTypeFilter']);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameOption(a: unknown, b: unknown): boolean {
  if (!isRecord(a) || !isRecord(b)) return Object.is(a, b);
  const keysOfA: string[] = Object.keys(a);
  if (keysOfA.length !== Object.keys(b).length) return false;
  return keysOfA.every((key) => Object.is(a[key], b[key]));
}

/** Whether moving from `previous` to `next` needs a new widget. A structurally equal object needs none. */
export function requiresRebuild(previous: TelixonPhoneInputOptions, next: TelixonPhoneInputOptions): boolean {
  if (previous === next) return false;
  const optionsOfPrevious: Readonly<Record<string, unknown>> = previous;
  const optionsOfNext: Readonly<Record<string, unknown>> = next;
  const keys: Set<string> = new Set([...Object.keys(optionsOfPrevious), ...Object.keys(optionsOfNext)]);
  for (const key of keys) {
    if (LIVE_OPTION_KEYS.has(key)) continue;
    if (!sameOption(optionsOfPrevious[key], optionsOfNext[key])) return true;
  }
  return false;
}

// Sinks a benchmark result so V8 cannot dead-code-eliminate the work that produced it. The cost is a
// constant per call, identical across libraries, so absolute numbers shift uniformly and ratios are unaffected.
let sink = 0;

export function consume(value: unknown): void {
  if (typeof value === 'string') sink += value.length;
  else if (typeof value === 'number') sink += value;
  else if (typeof value === 'boolean') sink += value ? 1 : 0;
  else if (value !== null && value !== undefined) sink += 1;
}

// Escapes the accumulated sink to a global the runtime cannot prove unused, keeping every consume() call.
export function flushSink(): void {
  (globalThis as unknown as Record<string, number>).__telixonBenchSink = sink;
}

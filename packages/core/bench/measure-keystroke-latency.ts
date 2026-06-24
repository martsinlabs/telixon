import { createInternationalInputController, ensureEngineReady, type InputController } from '@telixon/core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { consume, flushSink } from './consume';
import { CORPUS } from './corpus';

await ensureEngineReady();

const WARMUP_PASSES = 3;
const MEASUREMENT_PASSES = 5;

interface KeystrokeLatencyDistribution {
  readonly scenario: string;
  readonly sampleCount: number;
  readonly min: number;
  readonly mean: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
}

interface KeystrokeLatencyReport {
  readonly scenarios: readonly KeystrokeLatencyDistribution[];
}

function percentile(sorted: readonly number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

// The full per-keystroke wall-clock distribution. The maximum and the deep tail (p99.9) are omitted: they
// are dominated by OS scheduling (not the code) and grow with sample count, so it is reported to the 99th.
function summarize(scenario: string, samples: number[]): KeystrokeLatencyDistribution {
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((s, x) => s + x, 0);
  return {
    scenario,
    sampleCount: samples.length,
    min: samples[0]!,
    mean: sum / samples.length,
    p50: percentile(samples, 50),
    p95: percentile(samples, 95),
    p99: percentile(samples, 99),
  };
}

function typeFullNumberRaw(
  controller: InputController,
  numberString: string,
  record: (latencyMs: number) => void,
): void {
  controller.setValue('');
  let value = '';
  let selectionEnd = 0;
  for (let i = 0; i < numberString.length; i++) {
    const character: string = numberString[i]!;
    const t0 = process.hrtime.bigint();
    const state = controller.insert(value, character, selectionEnd, selectionEnd);
    const t1 = process.hrtime.bigint();
    record(Number(t1 - t0) / 1_000_000);
    value = state.value;
    selectionEnd = state.selectionEnd;
  }
}

function typeFullNumberWithQueries(
  controller: InputController,
  numberString: string,
  record: (latencyMs: number) => void,
): void {
  controller.setValue('');
  let value = '';
  let selectionEnd = 0;
  for (let i = 0; i < numberString.length; i++) {
    const character: string = numberString[i]!;
    const t0 = process.hrtime.bigint();
    const state = controller.insert(value, character, selectionEnd, selectionEnd);
    const phoneNumber = controller.getPhoneNumber();
    consume(phoneNumber.isValid());
    consume(phoneNumber.isPossible());
    consume(phoneNumber.getNumberType());
    consume(phoneNumber.getCountry());
    consume(phoneNumber.getNationalNumber());
    consume(phoneNumber.getCallingCode());
    consume(phoneNumber.formatInternational());
    const t1 = process.hrtime.bigint();
    record(Number(t1 - t0) / 1_000_000);
    value = state.value;
    selectionEnd = state.selectionEnd;
  }
}

function runScenario(
  scenarioName: string,
  typeFn: (controller: InputController, e164: string, record: (latencyMs: number) => void) => void,
): KeystrokeLatencyDistribution {
  const controller: InputController = createInternationalInputController({ initialValue: '' });
  const noop = (): void => {};
  for (let pass = 0; pass < WARMUP_PASSES; pass++) {
    for (const entry of CORPUS) typeFn(controller, entry.e164, noop);
  }

  const samples: number[] = [];
  for (let pass = 0; pass < MEASUREMENT_PASSES; pass++) {
    for (const entry of CORPUS) typeFn(controller, entry.e164, (latencyMs: number) => samples.push(latencyMs));
  }
  return summarize(scenarioName, samples);
}

const report: KeystrokeLatencyReport = {
  scenarios: [
    runScenario('international: insert per keystroke', typeFullNumberRaw),
    runScenario('international: insert + 7 query methods per keystroke', typeFullNumberWithQueries),
  ],
};

const outputDir = join(dirname(fileURLToPath(import.meta.url)), 'dist');
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'keystroke-latency.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Wrote keystroke-latency.json (${report.scenarios.length} scenarios)`);
flushSink();

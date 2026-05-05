import { NodeResourceLoader } from '@telixon/core/resource-loader/node-resource-loader';
import { setResourceLoader } from '@telixon/core/resource-loader/resource-loader.config';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { performance } from 'node:perf_hooks';
import { InputState } from '../models';
import { createNationalInputController } from './index';

type BenchmarkResult = {
  scenario: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  avgUs: number;
  opsPerSecond: number;
  finalState: InputState;
};

type BenchmarkCase = {
  scenario: string;
  iterations: number;
  warmup: number;
  run: () => InputState;
};

type BenchmarkSuite = {
  country: string;
  setValueInput: string;
  typedInput: string;
  selectionStart: number;
  selectionEnd: number;
};

const STEADY_STATE_ITERATIONS = 1_000_000;
const STEADY_STATE_WARMUP = 20_000;
const STEADY_STATE_BATCH_SIZE = 5_000;
const SCENARIO_ITERATIONS = 100_000;
const SCENARIO_WARMUP = 2_000;

const SUITES: readonly BenchmarkSuite[] = [
  {
    country: 'AR',
    setValueInput: '011 15-3434-3444',
    typedInput: '011 15-3434-3444',
    selectionStart: 4,
    selectionEnd: 10,
  },
];

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function createController(suite: BenchmarkSuite) {
  return createNationalInputController({ country: suite.country });
}

function measureCase(suite: BenchmarkSuite, benchmarkCase: BenchmarkCase): BenchmarkResult {
  let finalState: InputState = createController(suite).currentState;

  for (let i = 0; i < benchmarkCase.warmup; i++) {
    finalState = benchmarkCase.run();
  }

  const startedAt: number = performance.now();

  for (let i = 0; i < benchmarkCase.iterations; i++) {
    finalState = benchmarkCase.run();
  }

  const totalMs: number = performance.now() - startedAt;
  const avgMs: number = totalMs / benchmarkCase.iterations;

  return {
    scenario: benchmarkCase.scenario,
    iterations: benchmarkCase.iterations,
    totalMs: round(totalMs),
    avgMs: round(avgMs),
    avgUs: round(avgMs * 1000),
    opsPerSecond: round((benchmarkCase.iterations / totalMs) * 1000),
    finalState,
  };
}

function measureSteadyStateSetValue(suite: BenchmarkSuite): BenchmarkResult {
  function run(totalIterations: number): InputState {
    let finalState: InputState = createController(suite).currentState;

    for (let offset = 0; offset < totalIterations; ) {
      const controller = createController(suite);
      const limit: number = Math.min(STEADY_STATE_BATCH_SIZE, totalIterations - offset);

      for (let i = 0; i < limit; i++) {
        finalState = controller.setValue(suite.setValueInput);
      }

      offset += limit;
    }

    return finalState;
  }

  run(STEADY_STATE_WARMUP);

  const startedAt: number = performance.now();
  const finalState: InputState = run(STEADY_STATE_ITERATIONS);
  const totalMs: number = performance.now() - startedAt;
  const avgMs: number = totalMs / STEADY_STATE_ITERATIONS;

  return {
    scenario: 'setValue steady state',
    iterations: STEADY_STATE_ITERATIONS,
    totalMs: round(totalMs),
    avgMs: round(avgMs),
    avgUs: round(avgMs * 1000),
    opsPerSecond: round((STEADY_STATE_ITERATIONS / totalMs) * 1000),
    finalState,
  };
}

function createBenchmarkCases(suite: BenchmarkSuite): BenchmarkCase[] {
  return [
    {
      scenario: 'insert input characters',
      iterations: SCENARIO_ITERATIONS,
      warmup: SCENARIO_WARMUP,
      run: (): InputState => {
        const controller = createController(suite);
        let state: InputState = controller.currentState;

        for (let i = 0; i < suite.typedInput.length; i++) {
          state = controller.insert(state.value, suite.typedInput[i]!, state.selectionStart, state.selectionEnd);
        }

        return state;
      },
    },
    {
      scenario: 'replace selected range',
      iterations: SCENARIO_ITERATIONS,
      warmup: SCENARIO_WARMUP,
      run: (): InputState => {
        const controller = createController(suite);
        const state: InputState = controller.setValue(suite.setValueInput);

        return controller.insert(state.value, '99', suite.selectionStart, suite.selectionEnd);
      },
    },
    {
      scenario: 'backspace at caret',
      iterations: SCENARIO_ITERATIONS,
      warmup: SCENARIO_WARMUP,
      run: (): InputState => {
        const controller = createController(suite);
        const state: InputState = controller.setValue(suite.setValueInput);

        return controller.deleteBackward(state.value, state.selectionStart, state.selectionEnd);
      },
    },
    {
      scenario: 'delete selected range backward',
      iterations: SCENARIO_ITERATIONS,
      warmup: SCENARIO_WARMUP,
      run: (): InputState => {
        const controller = createController(suite);
        const state: InputState = controller.setValue(suite.setValueInput);

        return controller.deleteBackward(state.value, suite.selectionStart, suite.selectionEnd);
      },
    },
    {
      scenario: 'delete selected range forward',
      iterations: SCENARIO_ITERATIONS,
      warmup: SCENARIO_WARMUP,
      run: (): InputState => {
        const controller = createController(suite);
        const state: InputState = controller.setValue(suite.setValueInput);

        return controller.deleteForward(state.value, suite.selectionStart, suite.selectionEnd);
      },
    },
    {
      scenario: 'selection delete undo',
      iterations: SCENARIO_ITERATIONS,
      warmup: SCENARIO_WARMUP,
      run: (): InputState => {
        const controller = createController(suite);
        const state: InputState = controller.setValue(suite.setValueInput);

        controller.deleteBackward(state.value, suite.selectionStart, suite.selectionEnd);

        return controller.undo();
      },
    },
    {
      scenario: 'selection delete undo redo',
      iterations: SCENARIO_ITERATIONS,
      warmup: SCENARIO_WARMUP,
      run: (): InputState => {
        const controller = createController(suite);
        const state: InputState = controller.setValue(suite.setValueInput);

        controller.deleteBackward(state.value, suite.selectionStart, suite.selectionEnd);
        controller.undo();

        return controller.redo();
      },
    },
  ];
}

function printResults(controllerName: string, suite: BenchmarkSuite, results: BenchmarkResult[]): void {
  console.log(`${controllerName} stress test for ${suite.country}`);
  console.table(
    results.map((result) => ({
      scenario: result.scenario,
      iterations: result.iterations,
      totalMs: result.totalMs,
      avgMs: result.avgMs,
      avgUs: result.avgUs,
      opsPerSecond: result.opsPerSecond,
    })),
  );

  console.log('\nFinal states:');
  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    console.log(`${result.scenario}: ${JSON.stringify(result.finalState)}`);
  }
}

async function main(): Promise<void> {
  setResourceLoader(new NodeResourceLoader());
  await getResourceProvider().ensureReady();

  for (let i = 0; i < SUITES.length; i++) {
    const suite: BenchmarkSuite = SUITES[i]!;
    const benchmarkCases: BenchmarkCase[] = createBenchmarkCases(suite);
    const results: BenchmarkResult[] = [measureSteadyStateSetValue(suite)];

    for (let caseIndex = 0; caseIndex < benchmarkCases.length; caseIndex++) {
      results.push(measureCase(suite, benchmarkCases[caseIndex]!));
    }

    printResults('NationalInputController', suite, results);

    if (i < SUITES.length - 1) {
      console.log('');
    }
  }
}

await main();

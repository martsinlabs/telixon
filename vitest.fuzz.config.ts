import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Differential fuzzer against Google's actual libphonenumber. Long-running; configure with FUZZ_N
// (input count), FUZZ_START (slice offset), FUZZ_SHARD_COUNT/FUZZ_SHARD_INDEX (parallel sharding),
// FUZZ_AIRTIGHT (the exhaustive proof), and FUZZ_MINLEN/FUZZ_MAXLEN (length range). The timeout is the
// GitHub job ceiling so a single job can run the full airtight space when it is not sharded.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['packages/core/conformance/fuzz.ts'],
    setupFiles: ['./packages/core/src/test-setup.ts'],
    testTimeout: 21_600_000,
    hookTimeout: 21_600_000,
  },
});

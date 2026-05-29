# Telixon

Phone number processing library for JavaScript/TypeScript. Priorities: **performance**, **accuracy**, **stability**, **semantic clarity**.

## Repository

pnpm monorepo (`packages/*`).

```
packages/
  core/       # @telixon/core: pure TS engine, all phone number logic
  web-sdk/    # @telixon/web-sdk: headless DOM adapter
  angular/    # (planned)
  react/      # (planned)
  vue/        # (planned)
  components/ # (planned)
```

### Core package

- `src/engine/`: binary DFA compiled from Google's libphonenumber metadata (`.bin` files + JSON metadata)
- `src/modules/`: feature modules (`number-resolver`, `input-controller`, …)
- `src/models/`: shared types
- `src/utils/`: pure, reusable utilities
- `src/resource-provider/`: resource abstraction
- `src/resource-loader/`: environment loaders (node / browser)
- Entry points: `index.ts`, `index.node.ts`, `index.browser.ts`

Build: `tsup`. Engine binaries copied post-build via `cpy`.

## Stack

- TypeScript strict, pnpm 10, tsup, ESLint + typescript-eslint, Prettier

## Engineering standards

The canonical engineering standards live in [CONTRIBUTING.md](CONTRIBUTING.md) ("Engineering standards"). Follow them exactly.

Non-negotiable hard rules: pure functions or closure factories by default. A class is allowed only for one of four documented patterns (polymorphic contract, I/O adapter, cached interface implementation, state machine: see CONTRIBUTING.md). No `any`, no default exports, no input mutations, no silent failures. Module-level and per-instance memoization caches are permitted as internal optimizations when the cached function stays referentially transparent.

## Pre-commit verification

Before reporting a code change as complete, run the pre-commit sequence in
[CONTRIBUTING.md](CONTRIBUTING.md) "Submitting changes" (step 3). Skip only for pure documentation
changes or read-only sessions.

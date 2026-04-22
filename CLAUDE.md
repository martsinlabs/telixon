# Telixon

Phone number processing library for JavaScript/TypeScript. Priorities: **performance**, **accuracy**, **stability**, **semantic clarity**.

## Repository

pnpm monorepo (`packages/*`).

```
packages/
  core/       # @telixon/core — pure TS engine, all phone number logic
  web-sdk/    # (planned) input components
  angular/    # (planned)
  react/      # (planned)
  vue/        # (planned)
  stencil/    # (planned)
```

### Core Package

- `src/engine/` — binary DFA compiled from Google's libphonenumber metadata (`.bin` files + JSON metadata)
- `src/modules/` — feature modules (`number-resolver`, `input-controller`, …)
- `src/models/` — shared types
- `src/utils/` — pure, reusable utilities
- `src/resource-provider/` — resource abstraction
- `src/resource-loader/` — environment loaders (node / browser)
- Entry points: `index.ts`, `index.node.ts`, `index.browser.ts`

Build: `tsup`. Engine binaries copied post-build via `cpy`.

## Stack

- TypeScript strict, pnpm 10, tsup, ESLint + typescript-eslint, Prettier

## Standards

### Functions

- One responsibility per function — no "and" in what it does
- Pure by default; side effects only at explicit I/O boundaries
- No boolean flag parameters; no optional params that change fundamental behavior — use separate functions
- Never mutate inputs; always return new values

### Types

- Branded types for domain primitives (phone number, country code, calling code)
- Discriminated unions over optional fields for variants
- `unknown` + type guards at all system boundaries (binary parsing, user input)
- No `as` casts, no type widening — fix the root cause
- Types live close to usage; move to `models/` only when shared across modules

### Error Handling

- Pure functions never throw — return `null` / typed result where failure is possible
- Use `{ ok: true; value: T } | { ok: false; error: E }` for meaningful failure cases
- Throw only at unrecoverable system boundaries (e.g. corrupt binary data)
- Never swallow errors silently

### Module Organization

- One primary concept per file
- Each module is self-contained: own `models/`, `utils/`, `index.ts`
- `index.ts` is a re-export barrel only — no logic
- Never import from a module's internals — only from its `index.ts`

### Naming

- All public exports must be self-documenting — no abbreviations, no ambiguity
- Internal names can be shorter but must still be unambiguous in context

### Public API

- Exports are a contract — add deliberately, removal is breaking
- Never expose internal types through public API — define explicit public-facing types
- Callers must not need to understand internals to use a function correctly

### Performance

- No unnecessary allocations or copies in hot paths
- Every dependency must be justified by measurable need
- Bundle size is a hard constraint, not a soft preference

## Rules

- No classes
- No `any`
- No default exports
- No mutations
- No silent failures

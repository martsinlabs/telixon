# Telixon Engineering Guidelines

## Core Priority

- Performance first
- Correctness second
- Simplicity third

---

## Performance Rules

- Prefer for-loops over map/filter/reduce in hot paths
- Avoid regex in performance-critical code
- Use charCode-based parsing when working with strings
- Avoid allocations in hot paths
- Prefer early exits (continue / break)

---

## Memory

- Avoid allocations in hot paths
- Outside hot paths: allocations are allowed if they improve clarity

---

## Architecture

- Flexible: may simplify structure if it improves clarity or performance
- Do not introduce unnecessary layers or abstractions

---

## Naming

- Short, clear, semantic names
- Avoid generic names (data, utils, helper)
- Avoid unnecessary verbosity

---

## Abstractions

- Allowed, but no overengineering
- Only introduce abstractions if they provide real value

---

## Comments

- Only for non-obvious logic
- Keep comments short and precise

---

## Edge Cases

- Always consider edge cases
- Validate inputs where it matters
- Avoid silent failures

---

## API Design

- Prefer stable, predictable APIs
- Avoid breaking contracts
- Design with long-term usage in mind

---

## Decision Rules

When choosing between options:

1. Performance wins
2. Then correctness
3. Then simplicity

---

## Anti-Patterns

- Unnecessary allocations in loops
- Regex in hot paths
- Overengineered abstractions
- Hidden side effects
- Complex code for no measurable gain

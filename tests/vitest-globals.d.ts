// Vitest runs with `globals: true`, so test files use bare
// `describe`/`it`/`expect` without imports. This reference declares those
// globals from vitest (instead of `@types/jest`, which is not installed).
// jest-dom matchers come from the `@testing-library/jest-dom/vitest` import
// in `tests/setup.ts`, which is part of the same TS program.
 /// <reference types="vitest/globals" />

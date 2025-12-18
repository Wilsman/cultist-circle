# Repository Guidelines

## Project Structure & Module Organization
- `app/` houses Next.js route handlers, layouts, and server actions; treat each route folder as an independent feature module with colocated loading/error UI.
- `components/` contains reusable UI built with Radix primitives and Tailwind utilities. `hooks/`, `contexts/`, and `lib/` hold shared logic, state, and helpers, while domain settings live in `config/` and mock data sits in `data/`.
- Static assets stay under `public/`, and automated verification resides in `tests/` (mirroring the source folder names for clarity).

## Build, Test, and Development Commands
- `bun run dev` – starts the local Next dev server with hot reloading.
- `bun run build` – creates the production bundle; run before pushing sizable changes.
- `bun run start` – serves the compiled build to smoke-test deployments.
- `bun run test` / `bun run test:watch` – executes the Vitest suite once or in watch mode.
- `bun run lint` – enforces ESLint rules aligned with `eslint-config-next` and Prettier.

## Coding Style & Naming Conventions
- Use TypeScript, functional React components, and 2-space indentation; favor hooks over class lifecycles.
- Component files follow `feature-name.component.tsx`, hooks use `use-something.ts`, and tests append `.test.ts(x)`.
- Tailwind classes should remain composable; extract variants into `class-variance-authority` helpers when styles repeat.
- Run `bun run lint` + `bunx prettier --check "**/*.{ts,tsx,md}"` before committing to maintain formatting.

## Testing Guidelines
- Tests live in `tests/<area>` and mirror the module they cover; name suites after behavior (`item-selector.exclusions.test.tsx`).
- Use Vitest + Testing Library for components and `vi.mock` for Supabase/PostHog calls.
- Cover critical state transitions, API boundaries, and edge-case rendering states; add regression tests for reported issues before fixing them.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(scope): summary`) with imperative, lowercase descriptions; group atomic changes into separate commits.
- PRs should describe motivation, highlight affected routes/components, reference related issues, and attach screenshots or logs for UI/API changes.
- Confirm `bun run build && bun run test` locally, and note any skipped checks or environment assumptions in the PR description.

## Security & Configuration Tips
- Load secrets via `.env.local` and never commit them; document required keys (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.) in Notion or the issue thread.
- Be mindful of user data in analytics hooks; scrub or mock identifiers inside tests and preview builds.

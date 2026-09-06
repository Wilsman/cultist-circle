# Repository guidelines

`app/` contains Next.js routes and server actions. Reuse the existing components,
hooks, contexts and helpers; follow adjacent filenames (for example
`components/item-selector.tsx` and `hooks/use-something.ts`). Use TypeScript,
functional React components, 2-space indentation and the existing Radix/Tailwind
design system. Extract repeated variants only when the change benefits from it.

`cloudflare/feedback/` is the feedback Worker and its configuration. Treat its
deployment and data changes separately from the Next.js app. The root
`package.json` is the command source of truth; this project uses Bun.

- `bun run dev` starts the Next.js app and feedback Worker together.
- `bun run dev:app` starts only Next.js; `bun run feedback:dev` starts only the Worker.
- `bun run build` builds the app; `bun run start` serves that build.
- `bun run test` runs Vitest; `bun run test:watch` starts watch mode.
- `bun run lint` runs ESLint. Feedback type/deploy commands are in `package.json`.

Carry the requested change through relevant verification. Choose checks for the
affected behavior and run required CI checks; do not repeat a successful check
without a new change or unresolved concern. Add behavior-level regression tests
when they meaningfully protect the fix. Use changed-file formatting checks rather
than a repository-wide formatting pass for a narrow edit. Report unrelated
failures without expanding the fix.

Use Conventional Commits and group changes logically. PRs should explain the
resulting behavior and relevant validation, including screenshots or logs when
they help assess a UI/API change. Keep secrets in the established environment or
secret-store workflow and out of git. Scrub or mock user identifiers in tests and
preview data.

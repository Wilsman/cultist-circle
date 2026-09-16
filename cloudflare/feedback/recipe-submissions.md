# Special recipe submissions

The Recipes page submits directly to `POST /api/recipe-submissions` on the existing
feedback Worker (through the local rewrite during development). No account or
contact details are required. Requests share the feedback IP rate limit, body
size limit and origin allowlist. The server validates item IDs, names, quantities,
game mode and timer. Item names are untrusted reports, not verified catalog data.

All records enter `recipe_submissions` with `status = 'pending'`. There is no public
read endpoint. Repeating a request with the same submission ID is a no-op, so a
retry after a lost response does not create another record.

## Setup

Apply migration 0007 before running the updated Worker. For local testing:

```powershell
bunx wrangler d1 migrations apply cultist-circle-feedback --local --config cloudflare/feedback/wrangler.jsonc
bun run dev
```

For deployment, apply the migrations with `--remote`, deploy the Worker using
`bun run feedback:deploy`, then deploy the frontend through the existing workflow.

## Review

Use the existing Cloudflare D1 console for `cultist-circle-feedback`:

```sql
SELECT id, game_mode, timer_seconds, sacrifices_json, rewards_json, created_at
FROM recipe_submissions
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 100;
```

Verify the reported items and timer, then add accepted recipes through the existing
`bun run add-recipe` workflow in `data/recipes.ts`. Check mode applicability during
review: the submitted mode is an observation, not proof of a mode restriction.
Publish through the normal app deployment. Mark the row `approved` after publishing,
or `rejected` when declining it, using its exact ID:

```sql
UPDATE recipe_submissions SET status = 'approved' WHERE id = '<reviewed submission ID>' AND status = 'pending';
```

Changing the status alone does not publish a recipe. Public recipes continue to
use the curated catalog, stable IDs, completion tracking and existing vote system.

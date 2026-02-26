# Tools

Deterministic scripts for automation tasks. Layer 3 of the A.N.T. model.

## Conventions

- All scripts are atomic and testable
- Environment variables loaded from `.env.local`
- Intermediate files go in `.tmp/` (gitignored)
- Existing scripts in `scripts/` are grandfathered in

## Existing Scripts (in `scripts/`)

| Script | Purpose |
|--------|---------|
| `seed-users.ts` | Seed test users into the database |
| `seed-fake-reviews.ts` | Generate fake review data for testing |
| `apply-migrations.ts` | Programmatic migration runner |
| `diagnose_pipeline.ts` | Pipeline health diagnostics |
| `patch-batch-review.py` | One-time batch review data patch |

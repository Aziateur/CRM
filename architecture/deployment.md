# SOP: Deployment

## Build & Deploy Pipeline

```
Developer pushes to `sandbox` branch
  → Cloudflare Pages auto-builds (npm run build → static export)
    → Deploys to production URL
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server (localhost:3000) |
| `npm run build` | Production build (static export, catches type errors) |
| `npm run lint` | ESLint check |
| `npx tsc --noEmit` | Type check only |
| `npx supabase db push` | Push pending migrations to remote Supabase |
| `git push origin sandbox` | Deploy to Cloudflare Pages |

## Database Migrations

### Creating a Migration

1. Create file: `supabase/migrations/YYYYMMDDNNNNNN_description.sql`
2. Write SQL (use `IF NOT EXISTS` / `IF EXISTS` for safety)
3. Test locally or push directly: `npx supabase db push`
4. Commit the migration file to git

### Naming Convention
```
20260220000001_stage_not_null.sql
│        │      └── Description (snake_case)
│        └────── Sequence within day (000001, 000002, ...)
└───────────── Date (YYYYMMDD)
```

### Safety Rules
- Always `IF NOT EXISTS` / `DROP IF EXISTS` for idempotency
- Always `BEGIN; ... COMMIT;` for multi-statement migrations
- Test with `supabase db push` before committing
- Never alter RLS policies without checking auth SOP

## Git Workflow

```
sandbox (default) ← all development happens here
main              ← not used for deploys (Cloudflare watches sandbox)
```

### Commit Checklist
1. `npm run build` passes
2. No placeholder code / TODOs
3. Migration file included if DB changed
4. `gemini.md` updated if schema/rules changed
5. `progress.md` updated with session log

## Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Supabase anon key |
| `DATABASE_URL` | `.env.local` | Direct DB connection (scripts only) |
| `POSTGRES_PASSWORD` | `.env.local` | DB password |

> ⚠️ Only `NEXT_PUBLIC_*` vars work in the browser build. Others are for scripts only.

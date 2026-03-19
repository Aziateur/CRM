---
description: How to apply a SQL migration to Supabase production database
---

# Run Migration on Supabase

Use this procedure to apply any `.sql` migration file to the production Supabase database.

## Prerequisites

- The project has `pg` installed (`node_modules/pg`)
- The DB connection string is: `postgresql://postgres:Aztere395733%40@db.syyrrgxqiqdsmaiiapnw.supabase.co:5432/postgres`
- The Supabase project ref is: `syyrrgxqiqdsmaiiapnw`

## Procedure

### 1. Run the SQL via Node `pg` client

// turbo
```bash
node -e "
const { Client } = require('pg');
const fs = require('fs');
const sql = fs.readFileSync('<PATH_TO_SQL_FILE>', 'utf8');
const client = new Client({
  connectionString: 'postgresql://postgres:Aztere395733%40@db.syyrrgxqiqdsmaiiapnw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
(async () => {
  await client.connect();
  await client.query(sql);
  console.log('✅ Migration applied successfully');
  await client.end();
})().catch(e => { console.error('❌', e.message); process.exit(1); });
"
```

Replace `<PATH_TO_SQL_FILE>` with the absolute path to the migration file.

If the migration is a short inline SQL (not a file), replace the `fs.readFileSync` line with the SQL string directly:

```bash
node -e "
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:Aztere395733%40@db.syyrrgxqiqdsmaiiapnw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
(async () => {
  await client.connect();
  await client.query('<INLINE_SQL_HERE>');
  console.log('✅ Migration applied successfully');
  await client.end();
})().catch(e => { console.error('❌', e.message); process.exit(1); });
"
```

### 2. Commit the migration file

```bash
git add supabase/migrations/<MIGRATION_FILE>
git commit -m "migration: <description>"
```

### 3. Push to sandbox

Follow the `/push-sandbox` workflow.

## Notes

- `psql` is **not installed** on this machine. Always use the Node `pg` approach.
- The Supabase CLI is logged in (`supabase projects list` works), but `supabase db push` hangs — avoid it.
- The Supabase MCP server requires a separate `SUPABASE_ACCESS_TOKEN` which is not currently configured.

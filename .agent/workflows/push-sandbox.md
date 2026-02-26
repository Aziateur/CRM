---
description: Pushes the current state of the workspace to the GitHub sandbox branch with safety checks
---

This workflow ensures the code is production-ready before pushing to the `sandbox` branch for testing.
**Reference CLAUDE.md before every push for the full verification checklist and sidebar contract.**

// turbo
1. Run any pending SQL migrations against Supabase
   Check `supabase/migrations/` for any `.sql` files that haven't been applied yet.
   For each new migration file, run it against the database using node + pg:
   ```
   node -e "
   const { Client } = require('pg');
   const fs = require('fs');
   const sql = fs.readFileSync('supabase/migrations/<filename>.sql', 'utf8');
   const client = new Client({ connectionString: process.env.DATABASE_URL });
   client.connect().then(() => client.query(sql)).then(() => { console.log('✅ Applied'); client.end(); }).catch(e => { console.error('❌', e.message); client.end(); process.exit(1); });
   "
   ```
   The `DATABASE_URL` is in `.env.local`. Source it or pass inline.
   *If a migration fails, do NOT push. Fix the migration first.*

// turbo
2. Run local build check
   `npm run build`
   *If this fails, do NOT push. Fix the errors first.*

2. Sanity Check: Inspect `components/app-sidebar.tsx`
   Per CLAUDE.md, the sidebar MUST contain these items in order:
   - Leads (`/`)
   - Dashboard (`/dashboard`)
   - Playbook (`/playbook`)
   - Dial Session (`/dial-session`)
   - Batch Review (`/batch-review`)
   - Settings (`/settings`)
   - Admin (`/admin`, admin-only)
   Also verify:
   - No markdown backticks (```) in `.tsx`/`.ts` files
   - No `console.log` statements in `lib/` or `components/`

// turbo
3. Stage all changes
   `git add .`

4. Review the diff before committing
   `git diff --cached --stat`
   *Verify only intended files are changed. If a shared layout file (sidebar, auth-gate, layout.tsx) was fully rewritten, STOP and review manually.*

5. Commit with a descriptive message
   `git commit -m "<type>: <description>"`
   Types: `feat`, `fix`, `chore`, `refactor`

// turbo
6. Push to remote sandbox
   `git push origin sandbox`

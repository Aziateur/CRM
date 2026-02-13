---
description: Pushes the current state of the workspace to the GitHub sandbox branch with safety checks
---

This workflow ensures the code is production-ready before pushing to the `sandbox` branch for testing.
**Reference CLAUDE.md before every push for the full verification checklist and sidebar contract.**

// turbo
1. Run local build check
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

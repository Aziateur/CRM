# CLAUDE.md

## Project Context
Dalio CRM is a sales pipeline management tool built for high-volume cold calling, with features for lead tracking, dial sessions, batch review, playbooks, and experiment-driven sales improvement.

## Tech Stack
- Framework: Next.js 15 (App Router, static export via Cloudflare Pages)
- Language: TypeScript (strict)
- Database: Supabase (PostgreSQL with custom auth via RPC, not Supabase Auth)
- Styling: Tailwind CSS + shadcn/ui components
- Hosting: Cloudflare Pages (sandbox branch auto-deploys)
- Automation: N8N (external, webhook-based)

## Key Directories
- `app/` — Next.js App Router pages (Leads, Dashboard, Dial Session, Batch Review, Playbook, Settings, Admin, Debug)
- `components/` — React components (UI primitives in `components/ui/`, feature components at root)
- `hooks/` — Custom React hooks (`use-leads`, `use-attempts`, `use-tasks`, `use-project-id`, etc.)
- `lib/` — Core libraries (`auth-context.tsx`, `supabase.ts`, `store.ts` with types/enums)
- `supabase/migrations/` — SQL migration files (21 files, applied sequentially)
- `scripts/` — Utility scripts (e.g., `seed-users.ts`)
- `.agent/workflows/` — Agent workflow definitions

## Commands
- `npm run dev` — Start dev server (localhost:3000)
- `npm run build` — Build for production (static export)
- `npm run lint` — Run ESLint
- No test suite configured yet

---

## How I Want You to Work

### Before Coding
- Ask clarifying questions before starting
- Draft a plan for complex work and confirm before coding
- If unsure, ask — don't assume

### While Coding
- Write complete, working code — no placeholders, no TODOs
- Keep it simple and readable over clever
- Follow existing patterns in the codebase
- One change at a time, verify as you go

### After Coding
- Run `npm run build` to verify changes compile
- Run linter/formatter before finishing
- Summarize what you changed and why

## TypeScript Idioms

Follow the TypeScript language idioms guide at `docs/typescript-idioms.md`. Key rules:
- `const` by default, `let` only when unavoidable, `var` never
- `unknown` over `any` — narrow explicitly
- `as const` objects over enums
- `??` over `||` for defaults
- Spread to copy — never mutate the original
- Annotate at boundaries, infer the rest
- Named exports over default exports (except Next.js pages)
- Arrow functions for callbacks, `function` for top-level declarations

---

## Code Style
- Use ES modules (import/export)
- Functional components with hooks
- Type hints on all functions
- Descriptive variable names
- No commented-out code
- Use `"use client"` directive on all interactive components

## Do Not
- Rewrite entire shared layout files (sidebar, auth-gate, layout) — use surgical edits only
- Commit directly to main — always push to `sandbox`
- Leave placeholder code or TODOs
- Make changes outside the scope of the task
- Assume — ask if unclear
- Paste sub-agent output directly into source files without stripping markdown
- Include `console.log` statements in production code

---

## Verification Loop
After completing a task, verify:
1. Code compiles without errors (`npm run build`)
2. Sidebar navigation has all 7 links: Leads, Dashboard, Playbook, Dial Session, Batch Review, Settings, Admin
3. No markdown artifacts (```) in `.tsx`/`.ts` files
4. No linting warnings
5. Changes match the original request

If any fail, fix before marking complete.

---

## Quick Commands
When I type these shortcuts, do the following:

**"plan"** — Analyze the task, draft an approach, ask clarifying questions, don't write code yet

**"build"** — Implement the plan, run tests, verify it works

**"check"** — Review your changes like a skeptical senior dev. Check for bugs, edge cases, and code quality

**"verify"** — Run build and linting, summarize results

**"done"** — Summarize what changed, what was tested, and any notes for me

---

## Success Criteria
A task is complete when:
- [ ] Code works as requested
- [ ] Build passes
- [ ] No errors or warnings
- [ ] Changes are minimal and focused
- [ ] I can understand what you did without explanation

---

## Architecture Notes

### Authentication
- Custom auth, NOT Supabase Auth. Uses `authenticate()` and `register_user()` RPCs with bcrypt.
- Sessions stored in `sessions` table with UUID tokens and 30-day sliding expiry.
- Session token stored in `localStorage` as `dalio_session_token` and sent via `x-session-token` header.
- `get_session_user()` PL/pgSQL function extracts user ID from the header for RLS.
- `validate_session()` RPC validates and extends session on page reload.

### Multi-Tenancy
- All data tables have a `project_id` column.
- RLS policies use `is_member_of(project_id)` which checks `user_projects` membership.
- `useProjectId()` hook provides the active project ID to all data hooks.

### User Roles
- `system_role` column on `users` table: `'admin'` or `'user'`.
- Admin link in sidebar only visible to admins.
- `/admin` page has client-side route protection.
- RLS policy allows admins to SELECT all users.

### Sidebar Navigation (CRITICAL — do not alter without checking)
The sidebar must always contain these items in this order:
1. Leads (`/` — root page, main CRM table/kanban)
2. Dashboard (`/dashboard` — analytics widgets)
3. Playbook (`/playbook` — templates and sequences)
4. Dial Session (`/dial-session` — the dialer)
5. Batch Review (`/batch-review` — call analysis)
6. Settings (`/settings` — pipeline, automation, profile)
7. Admin (`/admin` — user management, admin-only)

### Debugging Protocol (MANDATORY)

When fixing bugs, follow `.agent/workflows/fix.md`. Key rules:

1. **Severity First** — Classify as Level 1–5. Fix Level 5 (core UX broken) before touching anything else. NEVER merge branches, refactor, or do housekeeping during an active bug.
2. **Query Before You Fix** — Run a diagnostic query that proves your hypothesis. If it doesn't confirm, re-diagnose. Do NOT write code until the root cause is proven.
3. **Trace the Data Path** — For "X doesn't show" bugs, trace: `DB Table → View/JOIN → RLS → API Query → Hook → Component`. Find the exact broken link.
4. **One Fix, One Verify** — After every fix, verify with the same diagnostic query. If the bug persists, the fix was wrong — go back to diagnosis. Do NOT move on.
5. **No Side Quests** — Do not merge branches, create docs, investigate tooling, or fix "related" issues until the reported bug is confirmed fixed.

**Supabase-specific**: If data exists in DB but not in UI, check in this order:
- `project_id` is NOT NULL (RLS hides NULL project_id records)
- JOINs are intact (e.g., `call_sessions.attempt_id` links to `attempts.id`)
- The hook filters by the correct `project_id`

### Known Gotchas
- `REVOKE SELECT ON users FROM anon` was applied in migration `000000`. Admin policies and `updateUser` may conflict with this. Profile updates use direct table UPDATE which requires RLS UPDATE policy.
- The `/debug` page is accessible in production (no auth gate). Consider removing or protecting.
- Seed script (`scripts/seed-users.ts`) requires `DATABASE_URL` pointing to the remote Supabase database, not localhost.
- Supabase client is a singleton; call `resetSupabaseClient()` after login/logout to pick up the new session token header.
- **Call recordings**: `v_attempts_enriched` joins `call_sessions` on `attempt_id`. If `attempt_id` is NULL, recordings/transcripts won't show. The webhook creates call_sessions separately — they must be linked to attempts via phone number + timestamp matching.

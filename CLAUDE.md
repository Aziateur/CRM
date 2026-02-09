# CRM Project — Claude Code Instructions

## ⚠️ CRITICAL: Code Tab MCP Limitation

This Code tab does **NOT** have MCP tools. MCP tools live in **Cowork** only.

When a task needs external APIs (GitHub API beyond git, Supabase admin, Cloudflare DNS, error tracking):
1. **Do NOT** install MCP servers, create `.mcp.json`, or run `claude mcp add`
2. **Draft a Cowork prompt** for the user to paste into the Cowork tab

### Cowork handoff template
```
Hey, I need you to [action] using [Rube / Supabase MCP / etc].
Context: [details, IDs, file names]
Expected output: [what to bring back]
```

---

## Project Architecture

### Stack (exact versions matter)
- **Next.js 15.5.10** — STATIC EXPORT (SPA). No SSR, no API routes, no server actions.
- **React 19** — UI rendering
- **TypeScript** — strict mode, entire frontend
- **Tailwind CSS** — styling
- **shadcn/ui** — component library
- **Supabase (PostgreSQL)** — database only. No Supabase Auth in use.
- **n8n** — workflow automation, processes OpenPhone webhooks
- **Cloudflare Pages** — production hosting, auto-deploys from git
- **OpenPhone** — phone/SMS (integrated via n8n webhooks, no direct API)

### ❌ NEVER DO THESE (common Claude Code mistakes)

1. **Do NOT use `getServerSideProps`, `getStaticProps`, server actions, or API routes** — this is a static export SPA. There is no Node.js server at runtime. Everything runs client-side.
2. **Do NOT use `next/headers`, `next/cookies`, or any server-only imports** — static export means no request/response cycle on the server.
3. **Do NOT create `app/api/` route handlers** — there is no server to run them. External calls go through Supabase client SDK or n8n webhooks.
4. **Do NOT use Supabase Auth** — there is no auth system in this project currently. Don't add auth middleware, session checks, or RLS policies based on auth.
5. **Do NOT use `createServerClient()` from `@supabase/ssr`** — no server. Use `createClient()` from `@supabase/supabase-js` directly (browser client).
6. **Do NOT add `middleware.ts`** — static exports don't support Next.js middleware.
7. **Do NOT use `revalidatePath`, `revalidateTag`, or ISR** — no server-side rendering or caching.
8. **Do NOT use `next/image` with loader** — static export requires `unoptimized: true` in next.config or use regular `<img>` tags.
9. **Do NOT create `.mcp.json` files or run `claude mcp add`** — this crashes the Code tab.
10. **Do NOT use `require()` syntax** — TypeScript project, always use ES module `import`.

### ✅ HOW THINGS ACTUALLY WORK

**Data fetching**: All Supabase queries happen client-side via `@supabase/supabase-js`. Use `useEffect` + `useState` or a data fetching hook (React Query / SWR if available, otherwise raw useEffect).

**Supabase client**: One shared instance created with `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`. Never instantiate multiple clients. Import from the shared helper.

**Routing**: Next.js App Router with `output: 'export'` in `next.config.mjs`. All pages are statically generated at build time. Dynamic routes need `generateStaticParams()`.

**External integrations**: OpenPhone → n8n webhook → Supabase (n8n writes to DB, frontend reads from DB). The frontend never calls OpenPhone directly.

**Environment variables**: Only `NEXT_PUBLIC_*` vars work in static export (they're baked into the JS bundle at build time). Never reference `process.env.SECRET_*` — it won't exist at runtime.

**Deployment**: Push to GitHub → Cloudflare Pages auto-builds and deploys. No manual deploy step.

### Code Conventions

- `"use client"` — most components need this since we're an SPA. But keep it at the page/layout level, not on every tiny component.
- Import paths: `@/` alias maps to project root (e.g., `@/components/ui/button`, `@/lib/supabase`)
- Files: `kebab-case.tsx` — Components: `PascalCase`
- TypeScript: `interface` for object shapes, `type` for unions/primitives
- Always type Supabase responses with generated types from `database.types.ts`
- Error handling: try/catch around all Supabase calls, surface errors via toast, never silently swallow
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes

### shadcn/ui Patterns

- `components/ui/` = shadcn primitives (don't modify)
- `components/` = your custom compositions of shadcn primitives
- Forms: shadcn `<Form>` + react-hook-form + zod
- Tables: shadcn `<DataTable>` + @tanstack/react-table
- Modals: shadcn `<Dialog>` — never build custom modals
- Toasts: `useToast()` hook + `<Toaster>`

### SQL & Database

- Language: PostgreSQL (via Supabase)
- Migrations go in `supabase/migrations/` with timestamp prefix
- After schema changes, regenerate types: `npx supabase gen types typescript --project-id <ID> > lib/types/database.types.ts`
- No RLS policies tied to auth (no auth). If RLS is enabled on a table, it uses anon key permissions.
- Triggers and views are defined in migration SQL files

### n8n Workflows

- n8n is self-hosted, handles webhook processing
- OpenPhone sends webhooks to n8n → n8n processes and writes to Supabase
- Workflow definitions are JSON. If editing n8n workflows, the format is specific to n8n — don't invent fields.
- To trigger or check workflows programmatically, hand off to Cowork (n8n MCP tools)

### Git Workflow

- `main` = production (auto-deploys to Cloudflare Pages)
- Feature branches: `feature/short-description`
- Bug fixes: `fix/short-description`
- Never push directly to main — always PR
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`)

### Common Commands

```bash
npm run dev          # Dev server at localhost:3000
npm run build        # Static export build (catches errors that dev doesn't)
npm run lint         # ESLint
npx tsc --noEmit     # Type check without emitting
```

### Key Files
- `next.config.mjs` — has `output: 'export'`, `images: { unoptimized: true }`
- `lib/supabase.ts` — shared Supabase browser client
- `lib/types/database.types.ts` — auto-generated DB types
- `components/ui/` — shadcn primitives (don't modify)
- `components/` — custom components
- `app/` — main app routes (Next.js App Router)
- `hooks/` — custom React hooks
- `styles/` — global styles
- `supabase/migrations/` — SQL migrations
- `.env.local` — NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

---

## Tool Arsenal (Cowork Only)

### Supabase
| Tool | Purpose |
|------|---------|  
| `SUPABASE_BETA_RUN_SQL_QUERY` | Execute SQL against Postgres |
| `SUPABASE_GET_TABLE_SCHEMAS` | Get column/type/constraint info |
| `SUPABASE_LIST_TABLES` | List all tables |
| `SUPABASE_SELECT_FROM_TABLE` | Query rows with filters |
| `SUPABASE_GENERATE_TYPE_SCRIPT_TYPES` | Regenerate TS types from DB |
| `SUPABASE_GETS_PROJECT_S_SERVICE_HEALTH_STATUS` | Check DB/API health |
| `SUPABASE_GETS_PROJECT_S_POSTGRES_CONFIG` | View Postgres config |

### GitHub
| Tool | Purpose |
|------|---------|  
| `GITHUB_CREATE_A_PULL_REQUEST` | Open PRs |
| `GITHUB_CREATE_AN_ISSUE` | File issues |
| `GITHUB_LIST_CODE_SCANNING_ALERTS_FOR_A_REPOSITORY` | View code quality alerts |
| `GITHUB_LIST_WORKFLOW_RUNS_FOR_A_REPOSITORY` | Check CI/CD run status |
| `GITHUB_LIST_CHECK_RUNS_FOR_A_REF` | Check build pass/fail for a commit |
| `GITHUB_SEARCH_ISSUES_AND_PULL_REQUESTS` | Search issues/PRs |
| `GITHUB_GRAPHQL_API` | Arbitrary GitHub API queries |

### Cloudflare
| Tool | Purpose |
|------|---------|  
| `CLOUDFLARE_LIST_DNS_RECORDS` | View DNS records |
| `CLOUDFLARE_CREATE_DNS_RECORD` | Add records |
| `CLOUDFLARE_UPDATE_DNS_RECORD` | Modify records |
| `CLOUDFLARE_LIST_ZONES` | List domains |

### Sentry (Error Tracking & Debugging — Native MCP)
Sentry MCP is connected directly to Cowork (not through Rube). It provides:
- **Error search**: Find errors by message, file, frequency, user impact
- **Stack traces**: Full stack traces with exact file and line numbers
- **Seer AI**: Automated root cause analysis and fix suggestions
- **Release tracking**: See which deploy introduced a bug
- **Performance monitoring**: Slow queries, transaction traces

Use Sentry to: investigate production errors, check if a deploy broke something, find recurring bugs before users report them, get AI-generated fix suggestions.

### GitHub (Native MCP — not Rube)
GitHub MCP is connected directly to Cowork. It provides:
- **Repo access**: Browse code, search files, read commits
- **Issues & PRs**: Create, update, review, merge
- **CI/CD**: Check GitHub Actions status, analyze build failures
- **Code scanning**: Security alerts, Dependabot alerts
- **Releases**: Create and manage releases

### Cowork Native MCP (also available)
- **Supabase**: `execute_sql`, `apply_migration`, `list_tables`, `generate_typescript_types`, `deploy_edge_function`, `get_logs`
- **Cloudflare**: `workers_list`, `d1_database_query`, `kv_namespaces_list`, `search_cloudflare_documentation`
- **n8n**: `search_workflows`, `execute_workflow`, `get_workflow_details`

---

## When to Hand Off to Cowork

| Need | Code Tab does it | Cowork does it |
|------|-----------------|----------------|
| Write/fix code | ✅ | — |
| Git commit, push, branch | ✅ | — |
| Run build/lint/typecheck | ✅ | — |
| Create GitHub issue/PR via API | ❌ → draft prompt | ✅ |
| Query Supabase data | ❌ → draft prompt | ✅ |
| Run SQL migration | ❌ → draft prompt | ✅ |
| Regenerate DB types | ❌ → draft prompt | ✅ |
| Update DNS | ❌ → draft prompt | ✅ |
| Check error logs (Sentry) | ❌ → draft prompt | ✅ |
| Get AI root cause analysis | ❌ → draft prompt | ✅ Sentry Seer |
| Browse repo / read code | ❌ → draft prompt | ✅ GitHub MCP |
| Trigger n8n workflow | ❌ → draft prompt | ✅ |
| Check CI status | ❌ → draft prompt | ✅ |

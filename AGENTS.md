# CRM Project Agent Configuration

## Predicate System

This project uses [predicate](https://github.com/nrdxp/predicate) for agent configuration.

> [!IMPORTANT]
> You **must** review [.agent/PREDICATE.md](.agent/PREDICATE.md) and follow its instructions before beginning work.

**Active Personas:**
- typescript.md (TypeScript/JavaScript idioms and conventions)
- planning.md (Planning pipeline for /sketch → /plan → /core workflow)

---

## Project Overview

Sales CRM built as a Next.js static export SPA. See `CLAUDE.md` for full architecture details, constraints, and tool arsenal.

**Key constraint**: This is a **static export** — no server-side code. All data fetching is client-side via Supabase JS SDK.

---

## Build & Commands

- Dev server: `npm run dev`
- Production build: `npm run build` (static export — catches errors dev doesn't)
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`

---

## Code Style

- TypeScript strict mode — no `any`, use `unknown` + narrowing
- `const` over `let`, never `var`
- `interface` for object shapes, `type` for unions/primitives
- Discriminated unions over type assertions
- Nullish coalescing (`??`) over logical or (`||`) for defaults
- `"use client"` at page/layout level, not every component
- `cn()` for conditional Tailwind classes
- try/catch all Supabase calls, surface errors via toast

---

## Architecture

- **Frontend**: Next.js 15 (static export) + React 19 + Tailwind + shadcn/ui
- **Database**: Supabase (PostgreSQL) — no auth
- **Automation**: n8n (processes OpenPhone webhooks → writes to Supabase)
- **Hosting**: Cloudflare Pages (auto-deploys from git)
- **Error tracking**: Sentry (via MCP in Cowork)

---

## Security

- Never commit `.env.local` or secrets
- Only `NEXT_PUBLIC_*` env vars work (baked into bundle)
- No Supabase Auth — no RLS policies tied to auth
- Validate all user inputs before Supabase queries

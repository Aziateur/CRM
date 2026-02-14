# CRM Feature Implementation — Handoff Prompt

> Paste this into a new Claude Code session to continue where we left off.

---

## Context

This is a cold-calling CRM built as a Next.js 15 static export SPA (no SSR, no API routes). Stack: React 19, TypeScript, Tailwind, shadcn/ui, Supabase (Postgres), Cloudflare Pages. Read `/home/user/CRM/CLAUDE.md` for the full architecture constraints.

We've been implementing features inspired by **EspoCRM** (open-source CRM) and **Close.com** (sales CRM), adapted for our static SPA architecture.

---

## Current Branch

**Branch:** `claude/add-sales-pipeline-6r2KU`
**Build:** Passing clean (`npx next build` — 9 static pages)
**All changes are committed and pushed.** No uncommitted work.

---

## What's Been Built (DO NOT rebuild these)

### Phase 1 — Pipeline & Core Admin (all working)
- **Pipeline Stages** — full CRUD, Close.com-style numbered list with color dots, Active/Won/Lost badges, reorder/edit/delete (Settings page)
- **Custom Fields** — 8 field types, tabbed by entity (Leads/Contacts/Opportunities), visual type picker, proper options list manager, edit/delete (Settings page)
- **Tasks / Follow-ups** — auto-created from call outcomes, overdue/today/upcoming splits
- **Kanban Board** — optimistic drag-and-drop (no snap-back), scrollable columns, 50-card pagination for large datasets
- **Settings page** — Pipeline Stages + Custom Fields + System Diagnostics
- **Dev Tools page** — Integration reference cards (OpenPhone, n8n, Supabase, Cloudflare)
- **Dashboard page** — KPI cards (Calls Today, Total Leads, Connect Rate, Meetings) + Pipeline funnel bar chart

### Phase 2 — Productivity Features (all working)
- **CSV Export** — `lib/csv.ts` — export leads (with custom fields) and call history as CSV
- **CSV Import** — `components/lead-import.tsx` — upload CSV, auto-map columns via aliases, user-typed custom field names for unmapped columns, auto-creates field_definitions, no Company column required
- **Activity Log / Notes** — `hooks/use-lead-activities.ts` — notes input in LeadDrawer, chronological timeline per lead
- **Saved Views** — `hooks/use-view-presets.ts` — save/load filter+sort+view combos from "Views" dropdown on leads toolbar
- **Bulk Operations** — `components/bulk-actions-bar.tsx` — checkbox selection on leads table, bulk stage change, export selected, bulk delete
- **Import/Export in Settings** — Data Management section with import/export buttons

### Files that exist on disk (verified)
```
app/page.tsx, app/dashboard/page.tsx, app/settings/page.tsx, app/dev-tools/page.tsx
app/batch-review/page.tsx, app/dial-session/page.tsx, app/playbook/page.tsx, app/debug/page.tsx
components/: add-lead-dialog, app-sidebar, attempt-detail-modal, bulk-actions-bar,
  CallsPanel, dashboard-widgets, dynamic-field-renderer, field-editor, kanban-board,
  lead-drawer, lead-import, leads-table, log-attempt-modal, pipeline-editor,
  tasks-dashboard, theme-provider, topbar
hooks/: use-attempts, use-field-definitions, use-lead-activities, use-leads,
  use-mobile, use-pipeline-stages, use-tasks, use-toast, use-view-presets, useCallSync
lib/: csv, store, supabase, utils
```

---

## DB Migrations — Status

### Already applied (in Supabase):
- `20240523000000_add_call_sessions_link.sql`
- `20240523000001_create_artifacts_view.sql`
- `20240523000002_ensure_artifacts_view.sql`
- `20260209000000_pipeline_stages.sql` — pipeline_stages table + 4 new columns on leads
- `20260209000001_tasks.sql` — tasks table
- `20260209000002_custom_fields.sql` — field_definitions table + custom_fields JSONB on leads

### Need to be run on Supabase (migration files exist but NOT yet applied):
```sql
-- 20260210000000_lead_activities.sql
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'stage_change', 'field_edit', 'created', 'imported')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_lead_activities_lead_id ON lead_activities (lead_id);
CREATE INDEX idx_lead_activities_created_at ON lead_activities (created_at DESC);
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON lead_activities FOR ALL USING (true) WITH CHECK (true);

-- 20260210000001_view_presets.sql
CREATE TABLE IF NOT EXISTS view_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'lead',
  filters JSONB DEFAULT '{}',
  sort JSONB DEFAULT '{}',
  view_mode TEXT DEFAULT 'table',
  is_default BOOLEAN DEFAULT false,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_view_presets_entity_type ON view_presets (entity_type);
ALTER TABLE view_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON view_presets FOR ALL USING (true) WITH CHECK (true);
```

---

## WHAT NEEDS TO BE BUILT NEXT

### Phase 3 — Data Quality & Productivity (NOT on disk — must be built from scratch)

These were coded in a previous session but **the files do not exist on the current branch**. They need to be rebuilt.

#### 3a. Lead Tags / Labels
- **What:** Color-coded tags on leads. Many-to-many relationship. Filterable in table/kanban.
- **DB:** `tags` table (id, name, color, created_at) + `lead_tags` junction table (lead_id, tag_id)
- **Hook:** `hooks/use-tags.ts` — useTags() for CRUD on tag definitions, useLeadTags(leadId) for toggle/list
- **Component:** `components/tag-manager.tsx` — TagManager (popover to toggle/create tags with color picker), TagBadges (compact read-only display)
- **Wire into:** LeadDrawer header (below company name), leads-table (optional tag column), leads page filter bar (tag filter dropdown)

#### 3b. Call/Email Templates
- **What:** Reusable call scripts and email templates with [variable] placeholders. Quick-insert during dial sessions.
- **DB:** `templates` table (id, name, type ['call_script'|'email'], subject, body, variables JSONB, created_at, updated_at). Seed with 4 examples.
- **Hook:** `hooks/use-templates.ts` — CRUD, auto-extract variables from [brackets]
- **Component:** `components/template-manager.tsx` — TemplateManager (tabbed Call Scripts / Email Templates, create/edit/delete dialogs), TemplateQuickPick (small popover for dial-session integration)
- **Wire into:** Settings page (new section), dial-session page (TemplateQuickPick next to call script area)

#### 3c. Duplicate Detection
- **What:** Scan leads for duplicates by phone (normalized), email (lowercased), company (fuzzy — strip Inc/LLC/Corp suffixes). Merge or delete.
- **No new table** — queries existing leads table
- **Component:** `components/duplicate-detector.tsx` — scans on button click, groups duplicates, Merge (keeps oldest lead, moves attempts/contacts/tasks) or Delete (removes newer duplicates)
- **Wire into:** Settings > Data Management section, also optionally during CSV import

---

### Phase 4 — Automation (after Phase 3)

#### 4a. Simple Workflows / Automations
- **What:** "When [trigger] then [action]" rules
- **Triggers:** stage changes, new attempt logged, task overdue, tag added
- **Actions:** create task, change stage, add note, add tag
- **DB:** `workflows` table (id, name, trigger_type, conditions JSONB, actions JSONB, is_active, created_at)
- **Evaluated client-side** when relevant events fire (inside existing hooks)
- **Component:** `components/workflow-editor.tsx` — list of rules with enable/disable toggle, create/edit dialog

#### 4b. Sequences / Cadences (Close.com's core feature)
- **What:** Multi-step outreach plans (call → wait 2d → call → wait 1d → email)
- **DB:** `sequences` table + `sequence_steps` table + `lead_sequences` junction (tracks which step each lead is on)
- **Large feature** — build after workflows are stable

---

### Phase 5 — Analytics & Reporting (after Phase 4)

#### 5a. Enhanced Dashboard
- Time-series charts (calls/day trend over 7/30 days)
- Conversion funnel (New → Contacted → Interested → Meeting → Won)
- Stage velocity (avg days per stage)

#### 5b. Lead Scoring
- Computed score based on: engagement (attempts count), stage progress, recency of last attempt, tags
- Score column in leads table, sort by score
- Configurable weights in Settings

---

### Phase 6 — Advanced (lowest priority)

- **File Attachments** — upload files per lead via Supabase Storage
- **Calendar View** — see meetings/tasks on a calendar layout
- **Email Integration** — log/send emails from CRM (needs SMTP or API)
- **Label Manager** — rename displayed field labels globally

---

## Key Architectural Patterns to Follow

1. **All data fetching is client-side** — `useEffect` + `useState` in hooks, never SSR
2. **Supabase client** — single shared instance from `lib/supabase.ts`, use `createClient()` from `@supabase/supabase-js`
3. **Graceful fallback** — hooks catch `42P01` (table doesn't exist) and return empty arrays, so features work before migrations are applied
4. **Optimistic updates** — modify local state immediately, revert on DB error (see kanban-board.tsx for pattern)
5. **No new npm dependencies** — use HTML5 native APIs and existing shadcn/ui components
6. **File naming** — `kebab-case.tsx` for files, `PascalCase` for components
7. **Import paths** — `@/components/...`, `@/hooks/...`, `@/lib/...`
8. **RLS policies** — `FOR ALL USING (true) WITH CHECK (true)` (no auth in this project)
9. **Always run `npx next build`** after changes to verify static export compiles

## Key Files to Read First

Before making changes, read these to understand the patterns:
- `lib/store.ts` — all TypeScript interfaces (Lead, Attempt, Task, PipelineStage, FieldDefinition, etc.)
- `hooks/use-leads.ts` — how leads are fetched and mapped (mapLeadRow is critical)
- `hooks/use-pipeline-stages.ts` — CRUD hook pattern with fallback
- `app/page.tsx` — main leads page, filter state, view toggle, all hooks wired together
- `app/settings/page.tsx` — admin page structure
- `components/lead-drawer.tsx` — lead detail panel structure

## Cowork Handoff Template (for DB operations)

```
Hey, I need you to run SQL migrations using Supabase MCP (execute_sql or SUPABASE_BETA_RUN_SQL_QUERY).

[paste the SQL here]

Expected output: Table(s) created with RLS policies.
```

---

## Immediate Next Action

**Build Phase 3: Tags, Templates, Duplicate Detection** — create the migrations, hooks, components, and wire them into the existing pages. Then commit and push.

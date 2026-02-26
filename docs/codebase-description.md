# CRM Codebase — Complete Description for AI Planning

## Architecture

**Static SPA** — Next.js 15.5.10 with `output: 'export'`. No server. No SSR. No API routes. No middleware. Everything runs client-side in the browser. Hosted on Cloudflare Pages, auto-deploys from GitHub.

**Data layer** — Supabase (PostgreSQL) accessed via `@supabase/supabase-js` browser client. Single shared instance in `lib/supabase.ts`. No auth — all RLS policies allow full anon access.

**UI** — React 19 + Tailwind CSS + shadcn/ui (Radix primitives). Custom components compose shadcn primitives. `cn()` from `lib/utils.ts` for conditional classes.

**Env vars** — Only `NEXT_PUBLIC_*` work (baked into JS at build). Three vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SANDBOX_CALLS`.

**Build** — `npx next build` produces static HTML/JS. ESLint and TypeScript errors are ignored during build (`ignoreDuringBuilds: true`, `ignoreBuildErrors: true` in next.config.mjs).

---

## File Structure

```
app/
  layout.tsx              — Root layout: SidebarProvider + AppSidebar + Toaster
  page.tsx                — "/" Main leads page (most complex file)
  dashboard/page.tsx      — "/dashboard" KPI cards + pipeline funnel
  settings/page.tsx       — "/settings" Pipeline editor, field editor, import/export, diagnostics
  dev-tools/page.tsx      — "/dev-tools" Integration reference cards (static)
  dial-session/page.tsx   — "/dial-session" Speed-optimized call dialing
  batch-review/page.tsx   — "/batch-review" 5-step review workflow
  playbook/page.tsx       — "/playbook" Rules and stop signals CRUD
  debug/page.tsx          — "/debug" System diagnostics (legacy)

components/
  app-sidebar.tsx         — Sidebar nav: Leads, Dashboard, Dial Session, Batch Review, Playbook, Settings, Dev Tools
  topbar.tsx              — Header bar with title, optional search, action slot
  theme-provider.tsx      — next-themes wrapper

  leads-table.tsx         — Table with checkboxes, derived fields, custom field columns
  kanban-board.tsx        — Drag-drop pipeline board, optimistic updates, 50-card pagination
  lead-drawer.tsx         — Right sheet: full lead editor, contacts, tasks, notes, timeline, custom fields
  add-lead-dialog.tsx     — Dialog to create new lead (company, phone, segment)
  lead-import.tsx         — CSV upload → column mapping → batch insert wizard

  log-attempt-modal.tsx   — Log call outcome (outcome, why, rep mistake, note)
  attempt-detail-modal.tsx — View attempt details with transcript and recording
  CallsPanel.tsx          — Call history from v_calls_with_artifacts (sandbox only)

  dashboard-widgets.tsx   — 4 KPI cards + pipeline funnel bar chart
  tasks-dashboard.tsx     — Tasks grouped: overdue (red), today (amber), upcoming
  bulk-actions-bar.tsx    — Bulk stage change, export, delete for selected leads

  pipeline-editor.tsx     — CRUD for pipeline stages (name, color, probability, type)
  field-editor.tsx        — CRUD for custom field definitions (8 types, tabbed by entity)
  dynamic-field-renderer.tsx — Renders any field type as input or read-only display

  components/ui/          — shadcn primitives (DO NOT MODIFY): button, card, dialog,
                            dropdown-menu, input, label, select, separator, sheet,
                            skeleton, switch, table, tabs, textarea, toast, etc.

hooks/
  use-leads.ts            — Reads "leads" table (optionally with nested contacts)
  use-attempts.ts         — Reads "v_attempts_enriched" view
  use-pipeline-stages.ts  — CRUD on "pipeline_stages", falls back to DEFAULT_PIPELINE_STAGES
  use-tasks.ts            — CRUD on "tasks", filters incomplete, falls back on 42P01
  use-field-definitions.ts — CRUD on "field_definitions", falls back on 42P01
  use-lead-activities.ts  — CRUD on "lead_activities", falls back on missing table
  use-view-presets.ts     — CRUD on "view_presets", falls back on missing table
  use-tags.ts             — ❌ DOES NOT EXIST (needs to be built)
  use-templates.ts        — ❌ DOES NOT EXIST (needs to be built)
  use-toast.ts            — Global toast state (shadcn pattern)
  use-mobile.ts           — Returns true if viewport < 768px
  useCallSync.ts          — Polls v_calls_with_artifacts for recording/transcript artifacts

lib/
  store.ts                — All TypeScript interfaces + helper functions (see below)
  supabase.ts             — Singleton Supabase browser client
  csv.ts                  — CSV parse, export leads, export attempts
  utils.ts                — cn() helper for Tailwind class merging

supabase/migrations/      — 8 SQL migration files (schema documented below)
docs/                     — handoff-prompt.md, typescript-idioms.md
```

---

## Database Schema (PostgreSQL via Supabase)

### Pre-existing tables (not in migration files, created outside this codebase)

**leads** — Core entity
```
id, company, phone, email, website, address, segment, lead_source,
is_decision_maker, is_fleet_owner, operational_context, opportunity_angle,
confirmed_facts (JSONB array), open_questions (JSONB array),
next_call_objective, constraints (JSONB array), constraint_other,
created_at
+ Added by migrations: stage, stage_changed_at, deal_value, close_probability, custom_fields
```

**contacts** — Belongs to lead
```
id, lead_id (FK→leads), name, role, phone, email
```

**attempts** — Call attempts on leads
```
id, lead_id (FK→leads), contact_id, timestamp, outcome, why, rep_mistake,
dm_reached, next_action, next_action_at, note, duration_sec, experiment_tag,
session_id, matters_most, is_top_call, is_bottom_call, created_at,
openphone_call_id, direction, dialed_number, answered_at, completed_at,
recording_url, recording_duration_sec, transcript, call_transcript_text,
call_summary, status
```

**call_sessions** — OpenPhone call tracking
```
id, openphone_call_id, lead_id, phone_e164, direction, status,
started_at, attempt_id (FK→attempts), recording_url, transcript_text, created_at
```

**rules** — Playbook rules (if X then Y because Z)
```
id, if_when, then, because, confidence, evidence_attempt_ids, is_active, created_at
```

**stop_signals** — Dial session stop signals
```
id, name, description, trigger_condition, threshold, window_size,
recommended_drill_id, is_active
```

### Tables created by migrations

**pipeline_stages** — 6 seeded stages (New→Contacted→Interested→Meeting Booked→Won→Lost)
```
id UUID PK, name TEXT UNIQUE, position INT, default_probability INT (0-100),
color TEXT, is_won BOOLEAN, is_lost BOOLEAN, created_at TIMESTAMPTZ
```

**tasks** — Follow-up tasks linked to leads
```
id UUID PK, lead_id UUID FK→leads CASCADE, contact_id UUID FK→contacts SET NULL,
attempt_id UUID FK→attempts SET NULL, type TEXT (call_back|follow_up|meeting|email|custom),
title TEXT, description TEXT, due_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
priority TEXT (low|normal|high), created_at TIMESTAMPTZ
Indexes: idx_tasks_pending (due_at WHERE completed_at IS NULL), idx_tasks_lead_id
```

**field_definitions** — Custom field registry
```
id UUID PK, entity_type TEXT, field_key TEXT, field_label TEXT,
field_type TEXT (text|number|select|multi_select|date|boolean|url|email),
options JSONB, is_required BOOLEAN, position INT, created_at TIMESTAMPTZ
UNIQUE(entity_type, field_key)
```

**lead_activities** — Activity/notes timeline per lead
```
id UUID PK, lead_id UUID FK→leads CASCADE,
activity_type TEXT (note|stage_change|field_edit|created|imported),
description TEXT, metadata JSONB, created_at TIMESTAMPTZ
Indexes: idx_lead_activities_lead_id, idx_lead_activities_created_at DESC
```

**view_presets** — Saved filter/view combos
```
id UUID PK, name TEXT, entity_type TEXT, filters JSONB, sort JSONB,
view_mode TEXT, is_default BOOLEAN, position INT, created_at TIMESTAMPTZ
Index: idx_view_presets_entity_type
```

### Views

**v_attempts_enriched** — Pre-existing enriched view of attempts (not in migration files)
**v_calls_with_artifacts** — Call sessions with recording/transcript data

### Added columns on existing tables

**leads** += stage, stage_changed_at, deal_value NUMERIC(12,2), close_probability INT, custom_fields JSONB
**call_sessions** += attempt_id FK, recording_url, transcript_text

### All RLS policies: `FOR ALL USING (true) WITH CHECK (true)` — no auth

---

## TypeScript Types (lib/store.ts)

### Core Entities
- **Lead** — company, phone, email, website, segment, contacts[], stage?, dealValue?, customFields?, confirmedFacts?, openQuestions?, nextCallObjective?, constraints?, opportunityAngle?, operationalContext?
- **Contact** — name, role (DM|Gatekeeper|Other), phone?, email?
- **Attempt** — leadId, outcome (5 options), why? (5 reasons), repMistake? (4 options), dmReached, nextAction (4 options), note?, durationSec, experimentTag?, transcript?, recordingUrl?, callSummary?
- **PipelineStage** — name, position, defaultProbability, color, isWon, isLost
- **Task** — leadId, type (5 types), title, dueAt, completedAt?, priority (3 levels)
- **FieldDefinition** — entityType, fieldKey, fieldLabel, fieldType (8 types), options?, isRequired, position

### Derived Types
- **LeadWithDerived** extends Lead — derivedStage, derivedStatus, lastAttempt, attemptCount
- **DerivedStage** — Not Contacted | Contacted | Meeting | Won | Lost
- **DerivedStatus** — New | No answer | Gatekeeper | Not interested | Interested | Meeting booked | Closed won | Closed lost

### Key Functions
- `getEffectiveStage(lead, attempts)` — Returns explicit stage or auto-derives from attempts
- `getDerivedStage(attempts)` / `getDerivedStatus(attempts)` — Compute from attempt history
- `getDefaultTaskForOutcome(outcome, why, company)` — Auto-task creation mapping
- `calculateSessionMetrics(attempts)` — Totals, rates, top failure reasons
- `checkStopSignals(attempts, signals, drills)` — Evaluates drill triggers
- `getDialableLeads(leads, attempts)` — Filters leads ready for calling
- `suggestTopBottomCalls(attempts)` — Scores and ranks attempts

---

## Page-by-Page Behavior

### / (Leads) — `app/page.tsx`
**The main hub.** Hooks: useLeads, useAttempts, usePipelineStages, useTasks, useFieldDefinitions, useViewPresets.

State: viewMode (table|kanban), segmentFilter, outcomeFilter, stageFilter, searchQuery, selectedIds (Set), selectedLead, isDrawerOpen, isLogAttemptOpen.

Flow: Loads all leads + attempts → derives computed fields (stage, status, lastAttempt, attemptCount) → applies filters (AND logic: segment × outcome × stage × search) → renders table or kanban.

Key callbacks: handleLeadUpdated (optimistic, updates both table and drawer), handleCall (opens tel: URL, copies to clipboard, creates pending attempt in sandbox mode), applyPreset/handleSaveView (saved views).

Components composed: Topbar → TasksDashboard → filter bar + Views dropdown → BulkActionsBar → LeadsTable or KanbanBoard → LeadDrawer → LogAttemptModal → AttemptDetailModal.

### /dashboard — `app/dashboard/page.tsx`
Stateless wrapper. Fetches leads + attempts + stages, passes to DashboardWidgets.
DashboardWidgets computes: calls today, total leads, connect rate (%), meetings count, pipeline stage distribution.

### /settings — `app/settings/page.tsx`
Four sections stacked vertically (max-w-3xl):
1. **PipelineEditor** — numbered stage list with CRUD
2. **FieldEditor** — tabbed custom fields with CRUD
3. **DataManagement** — LeadImport component + export buttons (leads CSV, attempts CSV)
4. **SystemDiagnostics** — env vars check, Supabase connection test, browser info

### /dial-session — `app/dial-session/page.tsx`
**Most stateful page (20+ state vars).** Setup dialog → active session loop.

Loop: Show current lead → Dial (opens tel:) → Timer runs → End Call → Speed-optimized log modal (outcome buttons, conditional why/repMistake, note, keyboard shortcuts 1-5/D/Enter) → Auto-create follow-up task → Check stop signals every 5 attempts → Next lead.

Keyboard shortcuts: D=dial, 1-5=select outcome, Enter=save.
Stop signals trigger drill alerts. Drills count down remaining calls.

### /batch-review — `app/batch-review/page.tsx`
5-step wizard: Setup (range + experiment filter) → Review (paginated attempts, rate top/bottom/skip) → Summary (metrics + top/bottom calls) → Learnings (notes + proposed rules + drill assignment) → Complete.

### /playbook — `app/playbook/page.tsx`
CRUD for rules (if/when/then/because with confidence levels) and stop signals. Rules split into Active vs Draft. Stop signals have on/off toggles. Drills listed read-only.

### /dev-tools — `app/dev-tools/page.tsx`
Static reference page. Four cards: OpenPhone (webhook URL, events), n8n (workflow description), Supabase (tables, views, triggers), Cloudflare (production + sandbox URLs).

---

## Hook Patterns

Every data hook follows the same structure:
```typescript
export function useX() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await getSupabase().from("table").select("*")
      if (error) throw error
      setItems(data.map(mapRow))
    } catch (err) {
      // Graceful fallback: if table doesn't exist (42P01), return []
      // Otherwise: toast error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  return { items, setItems, loading, refetch: fetchItems, /* CRUD functions */ }
}
```

**Key patterns:**
- `42P01` catch → empty array (table may not exist pre-migration)
- `"does not exist"` message catch → same fallback
- Optimistic local state updates, revert on DB error
- Toast on mutation errors, silent on fetch errors
- `mapRow()` helper converts snake_case DB → camelCase TypeScript

---

## Component Patterns

- **Drawer** = shadcn Sheet (right side, full lead editor)
- **Modals** = shadcn Dialog (log attempt, add lead, add field, add stage)
- **Tables** = shadcn Table + manual mapping (not @tanstack/react-table DataTable pattern despite it being available)
- **Forms** = mostly raw useState (not react-hook-form despite it being available)
- **Toasts** = `useToast()` hook, destructive variant for errors
- **Drag-and-drop** = HTML5 native (onDragStart/onDragOver/onDrop), no library
- **Icons** = lucide-react throughout

---

## What Does NOT Exist (must be built)

### Tags / Labels
No `tags` table, no `lead_tags` junction, no `use-tags.ts` hook, no `tag-manager.tsx` component. Zero tag-related code anywhere.

### Templates (Call Scripts / Email)
No `templates` table, no `use-templates.ts` hook, no `template-manager.tsx` component. Zero template-related code anywhere.

### Duplicate Detection
No duplicate detection logic anywhere. No merge UI. No fuzzy matching.

### Workflows / Automations
No `workflows` table, no automation engine. Only hardcoded auto-task creation in `getDefaultTaskForOutcome()`.

### Sequences / Cadences
No multi-step outreach plans. No sequence tables or UI.

### Lead Scoring
No scoring logic. No score column.

### File Attachments
No file upload. No Supabase Storage integration.

### Calendar View
No calendar page or component.

### Email Integration
No email sending/receiving.

---

## Dependencies (package.json)

**Runtime:** next 15.5.10, react 19.2.0, @supabase/supabase-js ^2, @tanstack/react-table 8.21.3, react-hook-form ^7.60.0, zod 3.25.76, date-fns 4.1.0, recharts 2.15.4, lucide-react ^0.454.0, next-themes ^0.4.6, cmdk 1.0.4, sonner ^1.7.4, class-variance-authority ^0.7.1, clsx ^2.1.1, tailwind-merge ^3.3.1, embla-carousel-react 8.5.1, react-day-picker 9.8.0, vaul ^1.1.2, react-resizable-panels ^2.1.7, All @radix-ui/* primitives for shadcn

**Dev:** typescript ^5, tailwindcss ^3.4.17, postcss ^8.5, @types/node ^22, @types/react ^19

**Zero new dependencies policy** — use HTML5 native APIs and existing packages.

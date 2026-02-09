# PLAN: Pipeline Stages, Follow-up Tasks, and Custom Fields

## Goal

Add three features adapted from EspoCRM's open-source architecture to transform this CRM from a call logger into a sales process engine:

1. **Pipeline stages** with Kanban board — persistent, user-editable stages replacing the current computed-only derivation
2. **Follow-up tasks** with auto-creation — so nothing falls through the cracks after a call
3. **Custom fields** via JSONB + field registry — so the user can add fields from UI without SQL migrations

All three must work within the static export SPA constraint (no server, client-side Supabase only) and must not break any existing functionality.

## Constraints

- **Static export SPA** — no API routes, no server actions, no middleware. All logic runs client-side.
- **No MCP in Code tab** — SQL migrations must be drafted as files; execution requires a Cowork handoff.
- **No network for npm install** — cannot add new dependencies. All features use existing packages + HTML5 APIs.
- **No `database.types.ts`** — all Supabase responses typed as `Record<string, unknown>`. New tables follow the same pattern.
- **No auth** — no user scoping on tasks or field definitions. Single-user assumption.
- **Existing pages must not break** — dial-session, batch-review, and settings all consume `useLeads()` / `useAttempts()` hooks.

## Decisions

| Decision | Choice | Rationale |
| :------- | :----- | :-------- |
| Kanban drag-and-drop | HTML5 native `draggable` events | Zero new dependencies. `@hello-pangea/dnd` would require `npm install` which fails without network. HTML5 DnD is sufficient for column-to-column moves. |
| Stage storage | Free-text `leads.stage` + separate `pipeline_stages` config table | No FK constraint — stages can be renamed/reordered without cascading updates. Stage name matched by string. |
| Stage derivation | New `getEffectiveStage(lead, attempts)` function; keep `getDerivedStage()` unchanged | `getDerivedStage()` is called by `getDialableLeads()` which `dial-session` depends on. Changing its signature would break the dial queue. New function checks `lead.stage` first, falls back to computed. |
| Task due dates | Computed from outcome, not from `next_action_at` | `next_action_at` exists in the TypeScript interface but is never set in any INSERT. Column may not exist in DB. Safer to compute: "No connect" → +1d, "Some interest" → +2d, etc. |
| Task creation timing | Fire-and-forget after attempt save | Task INSERT must never block or fail the attempt save. If `tasks` table doesn't exist yet, attempt still logs successfully. |
| Custom field storage | `leads.custom_fields JSONB` + `field_definitions` table | EspoCRM uses ALTER TABLE (real columns). That requires a backend to run DDL. JSONB works client-side via Supabase SDK. GIN index handles filter performance for <10K rows. |
| New hooks error handling | Catch `42P01` (relation not found) and return empty arrays | All three new tables won't exist until Cowork runs migrations. Frontend must degrade gracefully — show empty states, not crash. |
| Custom field columns in table | Max 3 visible, user-configurable | Prevents table overflow. 5 existing columns + 3 custom = 8 max. Horizontal scroll as fallback. |

## Risks & Assumptions

| Risk / Assumption | Severity | Status | Mitigation / Evidence |
| :---------------- | :------- | :----- | :-------------------- |
| `next_action_at` column may not exist in DB | MEDIUM | Unvalidated | Don't use it. Compute task due dates from outcome type. Wire it up later after DB verification. |
| HTML5 DnD has poor mobile support | LOW | Known | This CRM is desktop-first (cold-calling workflow). Mobile Kanban can be added later with touch events. |
| `pipeline_stages` table empty before migration | LOW | Mitigated | Migration seeds 6 default stages. Hook returns hardcoded fallback if table missing. |
| `handleSave()` in LeadDrawer must include `stage` | MEDIUM | Mitigated | Plan explicitly updates the save payload. Without this, Kanban stage changes would be lost on drawer save. |
| No auth means anyone can edit stages/fields | HIGH | Accepted | Already true for ALL data. Auth is a separate, larger initiative. Not made worse by this change. |
| `v_attempts_enriched` view could break if attempts table altered | LOW | Validated | We don't alter the attempts table. Tasks table is separate. View is safe. |
| JSONB queries slower than real columns for filtering | LOW | Accepted | GIN index. <10K rows. Not a concern until scale. |
| Build may fail if new components have import errors | MEDIUM | Mitigated | Run `npm run build` after each phase. Static export catches all errors at build time. |

## Open Questions

- **Does `next_action_at` column exist in the DB?** — Can't verify without Supabase access. Plan doesn't depend on it. Cowork can check during migration execution.
- **What are the actual column names in the `leads` table?** — Inferred from `mapLeadRow()` snake_case patterns. Migration uses `IF NOT EXISTS` to be safe.
- **Should stages be per-segment?** — EspoCRM has one pipeline. For now, one global pipeline. Can add segment-specific pipelines later via a `segment` column on `pipeline_stages`.

## Scope

### In Scope

- `pipeline_stages` table + seed data (6 default stages)
- `leads.stage`, `leads.stage_changed_at`, `leads.deal_value`, `leads.close_probability` columns
- `tasks` table with full CRUD
- `field_definitions` table + `leads.custom_fields` JSONB column
- Kanban board component (HTML5 drag-drop)
- Tasks dashboard widget ("Today's Tasks")
- Auto-create tasks on attempt log
- Dynamic field renderer for custom fields
- Field editor in Settings page
- Stage selector in LeadDrawer
- Task list in LeadDrawer
- Custom fields in LeadDrawer
- Stage column in LeadsTable
- 3 SQL migration files
- All new hooks with graceful error handling

### Out of Scope

- Authentication / RBAC (separate initiative)
- Mobile-optimized Kanban (desktop-first)
- Segment-specific pipelines (single pipeline for now)
- Task notifications / reminders (no notification system exists)
- Task assignment to users (no user model)
- Custom fields on contacts or attempts (leads only for now)
- Email integration
- Calendar view for tasks
- Drag-drop reordering in field editor (simple up/down arrows)
- `database.types.ts` regeneration (Cowork task, separate from this plan)

## Phases

### 1. Phase 1: Pipeline Stages + Kanban — persistent stages with visual board

Each phase is independently valuable. Phase 1 ships a working Kanban even if Phase 2/3 never happen.

**Deliverables:**

1. Migration SQL: `supabase/migrations/20260209000000_pipeline_stages.sql`
   - Create `pipeline_stages` table (id, name, position, default_probability, color, is_terminal, is_won, is_lost)
   - Seed 6 default stages: New, Contacted, Interested, Meeting Booked, Won, Lost
   - Add columns to `leads`: `stage TEXT DEFAULT 'New'`, `stage_changed_at TIMESTAMPTZ`, `deal_value NUMERIC(12,2)`, `close_probability INT`

2. Types: Add to `lib/store.ts`
   - `PipelineStage` interface
   - Add `stage?`, `stageChangedAt?`, `dealValue?`, `closeProbability?` to `Lead` interface
   - New `getEffectiveStage(lead: Lead, attempts: Attempt[]): string` function

3. Hook: `hooks/use-pipeline-stages.ts`
   - Fetch from `pipeline_stages` table ordered by `position`
   - Graceful fallback: return hardcoded defaults if table doesn't exist

4. Update: `hooks/use-leads.ts`
   - Add `stage`, `stage_changed_at`, `deal_value`, `close_probability` to `mapLeadRow()`

5. Component: `components/kanban-board.tsx`
   - HTML5 native drag-drop (no library)
   - Reads stages from `usePipelineStages()`
   - Renders leads as cards in stage columns
   - On drop: updates `leads.stage` + `leads.stage_changed_at` via Supabase
   - Shows lead count per column
   - Cards show: company name, segment badge, last outcome badge, phone icon

6. Update: `components/leads-table.tsx`
   - Add "Stage" column with colored badge (color from `pipeline_stages`)
   - `LeadWithDerived` gets `effectiveStage` field

7. Update: `components/lead-drawer.tsx`
   - Add stage selector (dropdown) in header next to segment badge
   - Include `stage` in `handleSave()` update payload

8. Update: `app/page.tsx`
   - Add view toggle button: Table | Kanban
   - Conditionally render `<LeadsTable>` or `<KanbanBoard>`
   - Add stage filter to existing filter bar
   - Pass `pipelineStages` to Kanban

9. Build verification: `npm run build` must succeed with 0 new errors

### 2. Phase 2: Follow-up Tasks — auto-created tasks with dashboard widget

Builds on Phase 1 (uses stages context) but is independently useful even without Kanban.

**Deliverables:**

1. Migration SQL: `supabase/migrations/20260209000001_tasks.sql`
   - Create `tasks` table (id, lead_id FK, contact_id FK nullable, attempt_id FK nullable, type, title, description, due_at, completed_at, priority, created_at)
   - Index on `(completed_at IS NULL, due_at)` for overdue queries
   - Index on `lead_id` for per-lead lookups

2. Types: Add to `lib/store.ts`
   - `Task` interface
   - `TaskType = 'call_back' | 'follow_up' | 'meeting' | 'email' | 'custom'`
   - `TaskPriority = 'low' | 'normal' | 'high'`
   - `getDefaultTaskForOutcome(outcome, why?)` — returns `{ type, title, dueDays }` or null

3. Hook: `hooks/use-tasks.ts`
   - Fetch pending tasks (completed_at IS NULL), ordered by due_at
   - `createTask(task)` — INSERT
   - `completeTask(id)` — UPDATE completed_at = now()
   - `rescheduleTask(id, newDueAt)` — UPDATE due_at
   - Graceful fallback: return empty array if table doesn't exist

4. Component: `components/tasks-dashboard.tsx`
   - Three sections: Overdue (red), Due Today (amber), Upcoming 7 days (gray)
   - Each task shows: lead name, task title, due date, complete button
   - Click lead name → opens lead drawer
   - "Mark done" button with optimistic update
   - Empty state when no tasks

5. Update: `components/log-attempt-modal.tsx`
   - After successful attempt INSERT, auto-create task based on outcome mapping:
     - "No connect" → "Call back [Company]" due +1 day
     - "Gatekeeper only" → "Call back [Company]" due +1 day
     - "DM → No interest" (Timing/Money) → "Follow up with [Company]" due +14 days
     - "DM → Some interest" → "Follow up with [Company]" due +2 days
     - "Meeting set" → "Prepare for meeting with [Company]" due +1 day
     - "DM → No interest" (Targeting/Value) → "Drop" → no task
   - Task creation is fire-and-forget (wrapped in try/catch, never blocks)
   - Optional: date picker to override default due date

6. Update: `components/lead-drawer.tsx`
   - Add "Pending Tasks" card between Last Attempt and Account Reality
   - Show tasks for this lead (due_at, type, title)
   - "Complete" and "Reschedule" buttons per task
   - "Add Task" button (manual task creation)

7. Update: `app/page.tsx`
   - Add `<TasksDashboard>` above filters section
   - Collapsible to save space when user doesn't need it

8. Build verification: `npm run build` must succeed

### 3. Phase 3: Custom Fields — JSONB storage with dynamic UI

Most complex phase. Independently useful but works best with Phase 1+2 context.

**Deliverables:**

1. Migration SQL: `supabase/migrations/20260209000002_custom_fields.sql`
   - Create `field_definitions` table (id, entity_type, field_key, field_label, field_type, options JSONB, is_required, position, created_at)
   - UNIQUE constraint on (entity_type, field_key)
   - Add `custom_fields JSONB DEFAULT '{}'` column to `leads`
   - GIN index on `leads.custom_fields`

2. Types: Add to `lib/store.ts`
   - `FieldDefinition` interface
   - `FieldType = 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'boolean' | 'url' | 'email'`
   - Add `customFields?: Record<string, unknown>` to `Lead` interface

3. Hook: `hooks/use-field-definitions.ts`
   - Fetch from `field_definitions` where entity_type = 'lead', ordered by position
   - `createField(def)` — INSERT
   - `updateField(id, changes)` — UPDATE
   - `deleteField(id)` — DELETE
   - `reorderFields(ids[])` — batch UPDATE positions
   - Graceful fallback

4. Update: `hooks/use-leads.ts`
   - Add `custom_fields` to `mapLeadRow()`

5. Component: `components/dynamic-field-renderer.tsx`
   - Takes `FieldDefinition` + current value + onChange callback
   - Renders appropriate input per field_type:
     - `text` → Input
     - `number` → Input type=number
     - `select` → Select with options from field def
     - `multi_select` → Badge toggle chips (like constraints UI)
     - `date` → Input type=date
     - `boolean` → Switch
     - `url` → Input with external link icon
     - `email` → Input type=email
   - Read-only mode for non-editing view
   - Required field validation

6. Component: `components/field-editor.tsx`
   - Admin UI for managing field definitions
   - List existing fields with: label, key, type, required badge
   - "Add Field" dialog: label, key (auto-generated from label), type selector, options editor (for select types), required toggle
   - Edit inline
   - Delete with confirmation
   - Reorder with up/down arrow buttons

7. Update: `components/lead-drawer.tsx`
   - After "Lead Info" card, render "Custom Fields" card
   - Fetches field definitions via hook
   - Renders each field using `<DynamicFieldRenderer>`
   - In edit mode: editable. In view mode: read-only display
   - Include `custom_fields` in `handleSave()` update payload

8. Update: `components/leads-table.tsx`
   - Accept `fieldDefinitions` prop
   - Render up to 3 custom field columns after existing columns
   - Values read from `lead.customFields[field.field_key]`
   - Custom columns configurable (which 3 to show — store preference in localStorage)

9. Update: `app/settings/page.tsx`
   - Add "Custom Fields" section after existing integration cards
   - Embed `<FieldEditor>`
   - Shows count of defined fields

10. Build verification: `npm run build` must succeed

## Verification

- [ ] Phase 1: `npm run build` passes with pipeline stages code
- [ ] Phase 1: Kanban renders with hardcoded fallback stages (pre-migration)
- [ ] Phase 1: Table view shows Stage column
- [ ] Phase 1: Drawer stage selector included in save payload
- [ ] Phase 2: `npm run build` passes with tasks code
- [ ] Phase 2: Tasks dashboard renders empty state (pre-migration)
- [ ] Phase 2: LogAttemptModal save still works when tasks table absent
- [ ] Phase 2: Auto-create logic matches outcome → task mapping table
- [ ] Phase 3: `npm run build` passes with custom fields code
- [ ] Phase 3: Field editor renders in Settings (pre-migration)
- [ ] Phase 3: DynamicFieldRenderer handles all 8 field types
- [ ] Phase 3: Drawer custom fields section renders empty state
- [ ] All: No regressions in dial-session page
- [ ] All: No regressions in batch-review page
- [ ] All: Existing lead CRUD still works

## Post-Build: Cowork Handoff

After all 3 phases are built and the build passes, paste this into Cowork:

```
Hey, I need you to run 3 SQL migrations against Supabase and verify they succeeded.

1. Read and execute: supabase/migrations/20260209000000_pipeline_stages.sql
2. Read and execute: supabase/migrations/20260209000001_tasks.sql
3. Read and execute: supabase/migrations/20260209000002_custom_fields.sql

Context: Adding pipeline stages, follow-up tasks, and custom fields to the CRM.
Files are on branch claude/crm-handoff-OsMyD.

After executing, please:
- Verify each table exists: SELECT count(*) FROM pipeline_stages; SELECT count(*) FROM tasks; SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name IN ('stage', 'custom_fields');
- Confirm the 6 default pipeline stages were seeded
- Check if next_action_at column exists on attempts table (for future reference)

Expected: 3 new tables, 4 new columns on leads, 6 seeded stages, 0 errors.
```

## Files Changed (Complete Manifest)

### New Files (10)
```
docs/plans/pipeline-tasks-custom-fields.md    # This plan
supabase/migrations/20260209000000_pipeline_stages.sql
supabase/migrations/20260209000001_tasks.sql
supabase/migrations/20260209000002_custom_fields.sql
hooks/use-pipeline-stages.ts
hooks/use-tasks.ts
hooks/use-field-definitions.ts
components/kanban-board.tsx
components/tasks-dashboard.tsx
components/dynamic-field-renderer.tsx
components/field-editor.tsx
```

### Modified Files (7)
```
lib/store.ts                          # +PipelineStage, +Task, +FieldDefinition, +getEffectiveStage, +getDefaultTaskForOutcome
hooks/use-leads.ts                    # +stage, +stage_changed_at, +custom_fields in mapLeadRow
components/leads-table.tsx            # +Stage column, +custom field columns
components/lead-drawer.tsx            # +stage selector, +tasks section, +custom fields section, +save payload
components/log-attempt-modal.tsx      # +auto-create task after save
app/page.tsx                          # +view toggle, +TasksDashboard, +KanbanBoard, +stage filter
app/settings/page.tsx                 # +Custom Fields section with FieldEditor
```

## References

- EspoCRM source: github.com/espocrm/espocrm (Opportunity entity, Entity Manager, BPM)
- Predicate agent system: `.agent/` directory on `origin/main`
- Previous refactoring: PR #7 (page split, shared hooks, settings rewrite)

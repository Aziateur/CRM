# CRM War Plan — Restructure for Dial → Log → Review → Playbook → Dial

## The Problem

The CRM has the right features, but they live in the wrong places and don't connect. The result: a rep can't run their day from one screen, learning from calls doesn't stick, and the review tab is empty because nothing feeds it.

## The Loop This Must Enforce

```
Dialer (execute) → Log (capture) → Review (learn) → Playbook (codify) → Dialer (apply)
```

Every step must reliably feed the next. If any step is optional, hidden, or fragmented, the system doesn't compound.

---

## NON-NEGOTIABLE INVARIANTS

These prevent drift. Any AI implementing this plan must enforce them:

| # | Invariant | Rationale |
|---|-----------|-----------|
| 1 | **No fake attempts** — Call click creates `call_session` only. Attempt created only when rep logs a known outcome. | Currently `initiateCall()` in `dial-session/page.tsx:215-239` inserts a fake "No connect" attempt immediately on call click. This corrupts metrics. |
| 2 | **No call timer** — OpenPhone is authoritative for call duration. UI shows status (Dialing/In progress/Completed), not a ticking timer. | Current `useEffect` at `dial-session/page.tsx:168-177` runs a `setInterval` timer. This is wrong and redundant. |
| 3 | **Single canonical stage** — `leads.stage` is truth. No "derived stage" overrides anywhere. | `getEffectiveStage()` in `store.ts` and `dashboard-widgets.tsx` computes a derived stage that can contradict the stored stage. |
| 4 | **Tasks live in Dialer** — Lead Drawer shows summary + link only. Task management (complete/snooze/reschedule/create) happens in Dialer. | Currently tasks are managed inside Lead Drawer and also shown in Dashboard. Reps don't know where "truth" is. |
| 5 | **Review outputs require evidence links** — Every playbook rule/insight must link to ≥1 call with `call_id` + snippet. | Current batch review doesn't persist anything and has no evidence linking. |
| 6 | **No default dial mode** — Rep must choose what they're calling (New / Follow-ups / Interested / Nurture / Custom) each session. No pre-selected default. | Forces intentionality. |

---

## SURFACE OWNERSHIP MAP

### 1. Dialer → "What am I doing right now?"

| Contains | Currently Lives In | Action |
|----------|--------------------|--------|
| Today's mission control (attempts vs target, pace, follow-up health) | `DashboardWidgets` + `MissionControl` on `/dashboard` | **Move** to Dialer Home |
| Task queue (overdue → due today → upcoming) | `leads-table`, `lead-drawer`, `dashboard` scattered | **Consolidate** into Dialer |
| Dial mode selector (New / Follow-ups / Interested / Nurture / Custom) | Does not exist | **Build** as session setup |
| Dial session (queue → call → inline log → advance) | `dial-session/page.tsx` (popup-based, timer-driven) | **Rebuild** without popups/timer |

### 2. Leads → "Single source of truth about the account"

| Contains | Action |
|----------|--------|
| Account Reality (facts/questions/objective) | No change |
| Contacts (with real primary contact) | Add `is_primary` field |
| Lead Info / Custom Fields | No change |
| Interactions Timeline (read-only) | No change |
| Task summary ("2 tasks due, next: Follow up in 2d") + link to Dialer | **Replace** full task management with summary |

### 3. Review → "Turn raw calls into learning"

Two sub-tabs replacing current `/batch-review`:

| Sub-tab | Purpose | Output |
|---------|---------|--------|
| **Quick Batch** | Fast market intel extraction | Playbook items with evidence links |
| **Deep Dive** | Skill/offer optimization | Rubric scores, top 10 best/worst, experiments |

### 4. Playbook → "Codified truth with evidence"

| Contains | Action |
|----------|--------|
| Rules / Stop Signals / Drills | Add evidence links to rules |
| Dialer pulls relevant rules during calls | **Build** contextual snippets in dial session |

### 5. Dashboard → "Are we winning over weeks/months?" (LONG-TERM ONLY)

| Now shows (REMOVE) | Should show instead |
|--------------------|---------------------|
| Calls today, pace, DM today | 7/30/90-day trends |
| Tasks due today | Pipeline funnel over time |
| Session tracker | Stage velocity, lead aging |
| Today's meetings | Cohort performance by segment/source |

---

## CURRENT BUGS AND FAILURES TO FIX

### Bug 1: Fake attempts on Call click
- **File**: `dial-session/page.tsx`, lines 215–239 (`initiateCall`)
- **Problem**: Inserts `{ outcome: 'No connect', dm_reached: false }` immediately on Call click before the call even connects
- **Impact**: Corrupts connect rate, DM rate, and meeting rate metrics. Creates orphaned attempts.
- **Fix**: Remove the `attempts` insert from `initiateCall`. Only insert a `call_session` with status `initiated`. The attempt is created later in `logAttempt()`.

### Bug 2: Client-side call timer
- **File**: `dial-session/page.tsx`, lines 168–177
- **Problem**: `setInterval` ticks every second, producing a client-side `callDuration` that's used in `logAttempt` (line 355: `duration_sec: callDuration`)
- **Impact**: Duration is inaccurate (includes wait time, doesn't match OpenPhone). Wastes renders.
- **Fix**: Remove timer entirely. Get duration from `call_sessions.duration_sec` (populated by webhook) or compute from `started_at`/`ended_at`.

### Bug 3: Popup-dependent call launch
- **File**: `dial-session/page.tsx`, line 198
- **Problem**: `window.open('tel:...')` is blocked by most browsers as a popup
- **Fix**: Use `<a href="tel:..." target="_blank">` triggered by user click (link element, not `window.open`)

### Bug 4: Derived stage contradicts stored stage
- **File**: `lib/store.ts` → `getEffectiveStage()`, used in `dashboard-widgets.tsx`
- **Problem**: Computes a stage from attempt history that can differ from `leads.stage`
- **Fix**: Remove `getEffectiveStage()`. Use `leads.stage` everywhere. If stage should change based on outcomes, update it explicitly (automation or manual).

### Bug 5: Batch review doesn't persist
- **File**: `batch-review/page.tsx`, line 166–168 (`finishReview`)
- **Problem**: `finishReview` just sets `currentStep = "complete"` — nothing is saved to DB
- **Impact**: All review work is lost on page refresh
- **Fix**: Insert into `batch_reviews` table on finish. New tables for evidence links.

### Bug 6: Queue changes mid-session
- **File**: `use-dial-queue.ts`
- **Problem**: Queue is recomputed on every render from live data. If a task gets completed mid-session, the queue shifts.
- **Fix**: Snapshot queue into `dial_session_items` at session start. Session works from snapshot, not live data.

### Bug 7: No dial mode selection
- **File**: `dial-session/page.tsx`, setup screen (lines 524–622)
- **Problem**: No way to choose what kind of leads to call. Queue just dumps everything together.
- **Fix**: Add dial mode selector before session start. Queue builder filters by mode.

---

## DATA MODEL CHANGES

### New table: `dial_session_items`
```sql
CREATE TABLE dial_session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dial_session_id UUID NOT NULL REFERENCES dial_sessions(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  position INT NOT NULL,
  source TEXT NOT NULL, -- 'task' | 'new' | 'interested' | 'nurture' | 'custom'
  reason TEXT NOT NULL, -- human-readable: "Overdue 3d: Follow up with X"
  task_id UUID REFERENCES tasks(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'called' | 'skipped'
  attempt_id UUID REFERENCES attempts(id),
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects(id)
);
CREATE INDEX idx_dsi_session ON dial_session_items(dial_session_id);
CREATE INDEX idx_dsi_lead ON dial_session_items(lead_id);
```

### Alter `dial_sessions` — add mode + snapshot
```sql
ALTER TABLE dial_sessions
  ADD COLUMN mode TEXT DEFAULT 'all', -- 'new' | 'followups' | 'interested' | 'nurture' | 'custom' | 'all'
  ADD COLUMN preset_snapshot JSONB,
  ADD COLUMN filters JSONB;
```

### New table: `call_reviews`
```sql
CREATE TABLE call_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID REFERENCES call_sessions(id),
  attempt_id UUID REFERENCES attempts(id),
  review_type TEXT NOT NULL, -- 'quick' | 'deep'
  -- Quick fields
  tags TEXT[],
  market_insight TEXT,
  promote_to_playbook BOOLEAN DEFAULT FALSE,
  -- Deep fields
  score_opening INT CHECK (score_opening BETWEEN 1 AND 5),
  score_discovery INT CHECK (score_discovery BETWEEN 1 AND 5),
  score_control INT CHECK (score_control BETWEEN 1 AND 5),
  score_objections INT CHECK (score_objections BETWEEN 1 AND 5),
  score_close INT CHECK (score_close BETWEEN 1 AND 5),
  score_next_step INT CHECK (score_next_step BETWEEN 1 AND 5),
  total_score NUMERIC GENERATED ALWAYS AS (
    COALESCE(score_opening,0) + COALESCE(score_discovery,0) + COALESCE(score_control,0) +
    COALESCE(score_objections,0) + COALESCE(score_close,0) + COALESCE(score_next_step,0)
  ) STORED,
  what_worked TEXT,
  what_failed TEXT,
  coaching_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects(id)
);
```

### New table: `playbook_evidence`
```sql
CREATE TABLE playbook_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  call_session_id UUID REFERENCES call_sessions(id),
  attempt_id UUID REFERENCES attempts(id),
  snippet_text TEXT,
  timestamp_start NUMERIC,
  timestamp_end NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects(id)
);
```

### Alter `contacts` — add primary flag
```sql
ALTER TABLE contacts ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;
```

---

## PHASED IMPLEMENTATION (ordered by dependency)

### Phase 1: Fix the Dialer Foundation (stops data corruption)

**Priority: CRITICAL — do this first, everything else depends on clean data**

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 1.1 | Remove fake attempt from `initiateCall()` | `dial-session/page.tsx` | Call click creates only a `call_session`. No `attempts` insert. |
| 1.2 | Remove call timer `useEffect` + all `callDuration` state | `dial-session/page.tsx` | No `setInterval` anywhere. `duration_sec` comes from webhook data or is 0. |
| 1.3 | Replace `window.open('tel:')` with `<a href="tel:">` | `dial-session/page.tsx` | No popup blocker issues. |
| 1.4 | Remove `getEffectiveStage()` usage from dashboard | `dashboard-widgets.tsx`, `lib/store.ts` | Pipeline funnel uses `leads.stage` only. |

### Phase 2: Dial Modes + Queue Snapshot

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 2.1 | Create migration: `dial_session_items` table + `dial_sessions` alter | `supabase/migrations/` | Tables exist with correct schema. |
| 2.2 | Build `useDialModes()` hook — computes counts per mode from live data | `hooks/use-dial-modes.ts` (NEW) | Returns `{ new: number, followups: number, interested: number, nurture: number }` |
| 2.3 | Rebuild `useDialQueue()` to accept a `mode` parameter | `hooks/use-dial-queue.ts` | Queue filters by mode. Returns typed `QueueItem[]` with `source` field. |
| 2.4 | Build Dialer Home setup screen with mode selector | `dial-session/page.tsx` | 4 mode cards with live counts + optional filters + Start button. No default pre-selected. |
| 2.5 | Snapshot queue to `dial_session_items` on session start | `hooks/use-dial-session.ts`, `dial-session/page.tsx` | Session works from snapshot. Mid-session data changes don't shift the queue. |
| 2.6 | Show "Why this lead" label per queue item | `dial-session/page.tsx` | Each lead shows: "Overdue 3d: Follow up", "Fresh lead", "DM showed interest 2d ago", etc. |

**Mode definitions:**

| Mode | Includes |
|------|----------|
| **New** | Leads with 0 attempts, not won/lost/disqualified. Sorted: oldest created first. |
| **Follow-ups** | Leads with pending incomplete tasks where `due_at ≤ today + horizon`. Sorted: overdue first → priority → due_at. |
| **Interested** | Leads where last outcome = "Some interest" or "Meeting set", OR stage in interested-type stages. Sorted: tasks due first → recent interest first. |
| **Nurture** | Leads where last outcome = "No interest" + why in (Money, Timing), OR stage = "Nurture", OR nurture tasks upcoming. Sorted: due_at → oldest contact first. |

### Phase 3: Move Execution Metrics to Dialer

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 3.1 | Move `MissionControl` into Dialer Home (above queue) | `dial-session/page.tsx`, `mission-control.tsx` | Dialer Home shows: attempts today vs target, pace, follow-up health. |
| 3.2 | Move task dashboard into Dialer Home | `dial-session/page.tsx` | Task queue with actions: complete, snooze, reschedule, create. |
| 3.3 | Strip daily metrics from `/dashboard` | `app/dashboard/page.tsx`, `dashboard-widgets.tsx` | Dashboard shows ONLY: 7/30/90-day trends, funnel over time, stage velocity, cohort performance. |
| 3.4 | Update `AnalyticsSection` for long-term periods | `analytics-section.tsx` | Charts default to weekly/monthly, not daily. |

### Phase 4: Simplify Lead Drawer Tasks

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 4.1 | Replace task management in Lead Drawer with task summary card | `lead-drawer.tsx` | Shows: "3 tasks pending · Next: Follow up in 2d" + "Open in Dialer" link. No complete/edit/create buttons. |
| 4.2 | Add `is_primary` to contacts + persist primary contact | `supabase/migrations/`, `lead-drawer.tsx` | Primary contact survives reload. |

### Phase 5: Review Tab — Quick Batch

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 5.1 | Create migration: `call_reviews` + `playbook_evidence` tables | `supabase/migrations/` | Tables exist with correct schema + RLS policies. |
| 5.2 | Rebuild `/batch-review` as Review tab with Quick Batch / Deep Dive sub-tabs | `app/batch-review/page.tsx` (or rename to `app/review/page.tsx`) | Two sub-tabs render. |
| 5.3 | Build Quick Batch UI: list calls → tag → "Market insight?" → promote to playbook | Review page | Per call: tags, 1-liner insight, promote checkbox. |
| 5.4 | Build playbook promotion flow: category picker → evidence link (call_id + snippet) → save | Review page | Creates `rules` row + `playbook_evidence` row with call link. |
| 5.5 | Persist quick batch reviews to `call_reviews` | `hooks/use-call-reviews.ts` (NEW) | Reviews survive page refresh. |

### Phase 6: Review Tab — Deep Dive

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 6.1 | Build Deep Dive UI: rubric scoring (opening/discovery/control/objections/close/next step) | Review page | 6 sliders/selects per call, 1–5 scale. |
| 6.2 | Build "what worked / what failed" per call | Review page | Free text saved to `call_reviews`. |
| 6.3 | Auto-generate Top 10 Best / Top 10 Worst from scores | Review page | Sorted lists with playback links. |
| 6.4 | Build experiment creation from Deep Dive | Review page | "Test opener A vs B for next 20 calls" → creates experiment + links to playbook. |
| 6.5 | Persist deep dive reviews to `call_reviews` | `hooks/use-call-reviews.ts` | Reviews survive page refresh. |

### Phase 7: Make Playbook Operational

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 7.1 | Add evidence links UI to Playbook rules | `app/playbook/page.tsx` | Each rule shows linked calls with "Play" button. |
| 7.2 | Build "Call Prep" panel in Dialer that pulls relevant playbook rules | `dial-session/page.tsx` or new component | During dialing, shows rules matching current lead's segment/stage/tags. |
| 7.3 | "Review this session" CTA when ending dial session | `dial-session/page.tsx` | End Session → navigates to Review scoped to that session. |

### Phase 8: Hardening

| # | Task | Files | Acceptance |
|---|------|-------|------------|
| 8.1 | Add idempotent webhook handling: `UNIQUE(project_id, openphone_call_id)` on `call_sessions` | Migration | No duplicate call sessions from webhook retries. |
| 8.2 | Add "recording/transcript pending" UI state | `attempt-detail-modal.tsx` | Shows spinner until artifacts arrive. |
| 8.3 | Audit DB trigger coverage: ensure all mutations log to `lead_activities` | Migrations | Activity feed is complete without UI-side logging. |
| 8.4 | Add RLS policies to new tables | Migration | `call_reviews`, `playbook_evidence`, `dial_session_items` all have `project_id` + `is_member_of()` policies. |
| 8.5 | Update sidebar nav | `app-sidebar.tsx` | Rename "Batch Review" → "Review". Keep order: Leads, Dashboard, Playbook, Dialer, Review, Settings, Admin. |

---

## SIDEBAR ORDER (FINAL)

```
1. Leads       → /
2. Dialer      → /dial-session (renamed from "Dial Session")
3. Review      → /review (renamed from /batch-review)
4. Playbook    → /playbook
5. Dashboard   → /dashboard
6. Settings    → /settings
7. Admin       → /admin (admin only)
```

Rationale: ordered by daily usage frequency. Dialer is first-in-loop. Review follows sessions. Dashboard is for weekly check-ins.

---

## AI HANDOFF BLOCK

Copy this to the top of any task given to an AI agent:

```
DO NOT:
- Create attempts on Call click
- Implement a call duration timer
- Use getEffectiveStage() or any derived stage override
- Keep task management in Lead Drawer
- Generate queues without snapshotting them per session
- Pre-select a default dial mode
- Put daily metrics on Dashboard

MUST:
- Implement dial modes (New / Follow-ups / Interested / Nurture / Custom)
- Snapshot queues to dial_session_items at session start
- Keep OpenPhone as duration truth (via webhook data)
- Keep Dashboard long-term only (7/30/90 day trends)
- Persist review data to call_reviews table
- Enforce evidence links (call_id + snippet) on all playbook rules
- Make Dialer the canonical home for tasks + today's metrics + pace
```

---

## VERIFICATION PLAN

After each phase, run these checks:

| Phase | Test |
|-------|------|
| 1 | Click Call → verify NO `attempts` row created. Only `call_sessions`. Verify no timer in DOM. |
| 2 | Start session with "Follow-ups" mode → verify queue only contains leads with due tasks. Refresh page → queue unchanged (snapshot). |
| 3 | Open Dialer Home → see today's pace + task queue. Open Dashboard → see ONLY weekly/monthly charts. No daily metrics. |
| 4 | Open Lead Drawer → see task summary card. Cannot complete/create tasks from drawer. |
| 5 | Quick Batch → tag 5 calls → promote 2 to playbook. Refresh → reviews persisted. Playbook shows 2 new items with evidence links. |
| 6 | Deep Dive → score 10 calls → Top 10 list generates. Create experiment. |
| 7 | Start Dialer session → see relevant playbook rules for current lead. End session → redirects to Review scoped to session. |
| 8 | Send duplicate webhook → verify no duplicate call_session. Check activity feed completeness. |

# Dalio CRM — Complete Feature Map

## System Overview

Dalio CRM is a sales pipeline tool built for **high-volume cold calling** (100+ calls/day). Every feature is designed around one loop: **Dial → Log → Learn → Improve**. The system connects to OpenPhone for live calling, Supabase for data, and N8N for external automations.

---

## 1. Leads Page (`/`)

The home screen. All leads live here. Two views:

### Table View
A sortable, filterable data table. Columns: Company, Phone, Stage, Segment, Last Outcome, Attempts count, Last Attempt date. Each row is clickable → opens the **Lead Drawer**.

### Kanban View
Same data, displayed as cards grouped by pipeline stage. Drag a card between columns to change its stage.

### Shared Features
- **Search bar** — filters by company name
- **Segment filter** — dropdown to filter by segment (e.g., Unknown, Enterprise)
- **Outcome filter** — filter by last attempt outcome
- **View Presets** — save filter+sort combos as named views (stored in `view_presets` table)
- **Bulk Actions Bar** — select multiple leads → assign tags, change stage, delete
- **Add Lead** button — opens `AddLeadDialog` to create a new lead manually
- **Call** button — initiates a call via OpenPhone for the selected lead (creates a `call_session`)

### How it connects
- Calls `useLeads()` → queries `leads` table with `project_id` filter
- Calls `useAttempts()` → queries `v_attempts_enriched` view
- Calls `usePipelineStages()` → queries `pipeline_stages` table
- Calls `useTags()` + `useAllLeadTags()` → queries `tags` and `lead_tags` tables
- Opens `LeadDrawer`, `LogAttemptModal`, `AttemptDetailModal` as child components

---

## 2. Lead Drawer (slide-out panel)

Opens when you click a lead. This is the **most important UI surface** — it's where the rep spends 80% of their time. Three-column layout:

### Column 1: Strategy & Reality
- **Account Reality Card** — The learning card. Contains:
  - **Confirmed Facts** (max 5, max 120 chars each) — things we know about this account
  - **Open Questions** (max 3) — things we need to find out, must start with "Do they / Can they / Will they"
  - **Next Call Objective** — what the rep must accomplish on the next call, must start with a verb (Confirm, Disqualify, Book, Identify, Test)

### Column 2: Execution & Context
- **Pending Tasks** — actionable follow-ups (e.g., "Follow up with OnSIP Free 411"). Generated automatically from attempt outcomes or created manually.
- **Lead Info** — Segment, Decision Maker (yes/no/?), Fleet Owner (yes/no/?), Operational Context (free text), Constraints (chips: Locked contract, Budget freeze, etc.), Opportunity Angle, Deal Value
- **Custom Fields** — dynamic fields defined in Settings → rendered via `DynamicFieldRenderer`
- **Contacts** — multiple named contacts with roles (DM, Gatekeeper, Champion, User, Other) and phone numbers

### Column 3: History & Engagement
- **Last Attempt** — quick-glance card showing the most recent attempt outcome, timestamp, DM reached status, and next action
- **Interactions Timeline** — unified chronological feed of ALL activities:
  - `attempt` — logged call attempts with outcomes
  - `call_session` — raw calls from OpenPhone (direction, duration, inline audio player, collapsible transcript)
  - `note` — manual notes added inline
  - `task_created` / `task_completed` — task lifecycle events
  - `stage_change` — pipeline moves
  - `field_change` — data edits
  - `created` — lead creation
- **Sequence Enrollment** — shows which automated sequences this lead is enrolled in

### How it connects
- Auto-saves edits to `leads` table via debounced Supabase UPDATE
- Notes insert into `lead_activities` table
- Draws from `useAttempts()`, `useTasks()`, `useLeadActivities()`
- Opens `AttemptDetailModal` when clicking a timeline attempt
- Opens `LogAttemptModal` via "Log Attempt" button in the header

---

## 3. Log Attempt Modal

The 2-click attempt logging form. Designed for speed (100 calls/day means < 10 seconds per log).

### Fields
1. **Outcome** (REQUIRED, 1 click) — exactly 5 options:
   - `No connect` — nobody answered
   - `Gatekeeper only` — reached someone who is not the DM
   - `DM reached → No interest` — DM answered, said no
   - `DM reached → Some interest` — DM showed interest
   - `DM reached → Meeting booked` — scheduled a meeting
2. **Why** (CONDITIONAL) — only shown when outcome is "DM reached → No interest". 5 reasons: Bad timing, Already has provider, No budget, No authority, No need
3. **Rep Mistake** (CONDITIONAL) — optional self-assessment: Weak open, Poor rebuttal, Talked too much, Wrong contact
4. **Next Action** (AUTO-COMPUTED) — derived from outcome: Follow up, Disqualify, Nurture, Close
5. **Note** (OPTIONAL) — max 120 chars, free text

### What happens on save
1. Inserts into `attempts` table
2. Creates a `lead_activity` (type `call`) via DB trigger
3. Auto-creates a `task` based on outcome (e.g., "Follow up" task if DM showed interest)
4. Links to the active `call_session` if one exists
5. Updates the lead's derived stage based on outcome history

### How it connects
- Writes to `attempts` table
- Triggers `20260213000008_activity_triggers.sql` → inserts `lead_activities`
- Updates `tasks` table with auto-generated follow-ups

---

## 4. Attempt Detail Modal

Opens when clicking an attempt in the timeline. Shows:
- Outcome badge, Why reason, Rep Mistake
- Note text
- Next action
- **Audio player** — if the attempt has a linked `call_session` with a `recording_url`, renders an `<audio>` element
- **Transcript** — if the attempt has `callTranscriptText` (from webhook) or `transcript` (structured segments), renders the conversation
- **Add to Account Reality** prompt — "Did this attempt change our understanding?" → Yes opens inline form to add a Confirmed Fact or Open Question

### How it connects
- Reads from `v_attempts_enriched` (JOIN of `attempts` + `call_sessions` + webhook recordings/transcripts)
- Writes to `leads.confirmed_facts` / `leads.open_questions` via Supabase UPDATE

---

## 5. Dashboard (`/dashboard`)

Three sections stacked vertically:

### Mission Control
The daily cockpit. Shows:
- **Goal progress** — attempts today vs target (configurable in Framework settings)
- **Pace indicator** — are you ahead or behind? Shows required calls/hour to hit target
- **Follow-up health** — overdue tasks count, upcoming tasks count
- **Phase display** — which Framework phase you're currently in, with lever tracking

### Dashboard Widgets
- **Pipeline Funnel** — visual funnel chart of leads by stage
- **Top metrics cards** — Total leads, Active leads, Connect rate, DM rate, Meeting rate
- **Tasks due today** — count and list of pending tasks
- **Session tracker** — if a dial session is active, shows elapsed time and attempts

### Analytics Section
Charts and graphs:
- Attempts per day (bar chart, last 7/14/30 days)
- Outcome distribution (pie chart)
- Connect rate trend (line chart)
- DM reach rate over time
- Top failure reasons breakdown

### How it connects
- Reads from `useLeads()`, `useAttempts()`, `useTasks()`, `usePipelineStages()`, `useDialSession()`
- Framework data from `useFramework()` (reads `localStorage`)

---

## 6. Dial Session (`/dial-session`)

The power-dialing interface. Designed for marathon calling sessions.

### Session Lifecycle
1. **Start Session** — creates a `dial_session` record, loads a queue of leads to call
2. **Active dialing** — shows one lead at a time with:
   - Lead name, phone, segment, notes
   - Call button (initiates OpenPhone call)
   - **Dial Context Panel** — shows Account Reality, last attempt, contacts
   - **Dial Script Panel** — collapsible panel with the current script/playbook
   - Timer tracking call duration
3. **Log & Advance** — after each call, inline logging form (same fields as Log Attempt Modal) → logs attempt → auto-advances to next lead in queue
4. **Skip** — skip current lead without logging
5. **End Session** — saves session metrics, shows summary

### Queue Logic (`useDialQueue` hook)
Builds a prioritized queue of leads:
- Leads with overdue follow-up tasks first
- Leads that haven't been called recently
- Leads filtered by the user's current segment/tag filters
- Excludes leads marked Disqualified or Won

### Session Metrics
- Total attempts in session
- Connect rate for this session
- DM reach rate
- Average call duration
- Calls per hour

### How it connects
- Writes to `dial_sessions` table (start/end times, metrics)
- Each call creates a `call_session` record
- Each logged attempt writes to `attempts` table
- Uses `useDialQueue()` to manage the lead queue
- Uses `useCallSync()` to sync call state with OpenPhone webhooks

---

## 7. Batch Review (`/batch-review`)

Post-session analysis. The rep reviews their calls in bulk to extract patterns and improve.

### Review Flow (4 steps)
1. **Select scope** — pick a date range, experiment, or session to review
2. **Rate calls** — review each attempt, rate as: Good / Mid / Bad. Mark top and bottom calls.
3. **Summary** — see aggregate metrics: outcome distribution, top failure reasons, DM reach rate
4. **Learnings** — extract patterns:
   - "Seek" list — what to do more of
   - "Avoid" list — what to stop doing
   - Propose new Rules for the Playbook (if/when/then/because format)

### How it connects
- Reads from `useAttempts()`, `useLeads()`
- Writes to `batch_reviews` table (proposed rules, seek/avoid lists)
- Proposed rules can be promoted to the Playbook

---

## 8. Playbook (`/playbook`)

The knowledge base. Three tabs:

### Rules Tab
Collected wisdom in if/when/then/because format:
- **Structure**: "IF [condition] THEN [action] BECAUSE [evidence]"
- **Confidence levels**: Hypothesis (untested), Emerging (< 10 data points), Proven (10+ data points)
- Rules can be toggled active/inactive
- Evidence links to specific attempt IDs

### Stop Signals Tab
Auto-detected warning patterns:
- Each signal has: name, trigger condition, threshold, window size, recommended drill
- Example: "3 consecutive 'No connect' → trigger Dial Quality drill"
- Signals can be toggled active/inactive

### Drills Tab
Practice exercises triggered by stop signals:
- Each drill has: instructions, script, duration (default 10 reps), success metric
- Trigger types: Gatekeeper failure, No connect streak, DM rejection, Conversion slump, Custom

### How it connects
- Reads/writes `rules` table, `stop_signals` table
- Drills are defined in `lib/store.ts` (static)
- Proposed rules come from Batch Review

---

## 9. Settings (`/settings`)

Six tabs:

### Pipeline Tab
- **Pipeline Editor** — drag-and-drop stages (New → Qualifying → Proposal → Negotiation → Won/Lost)
- Each stage has: name, position, default probability, color, isWon/isLost flags
- **Field Editor** — define custom fields (text, number, select, multiselect, date, boolean)
- **Tag Manager** — create/edit/delete tags with colors

### Automation Tab
- **Template Manager** — create message templates (email/SMS/script) with variables like `{{company}}`, `{{contact_name}}`
- **Workflow Editor** — visual rule builder: trigger (event) → condition → action. Actions include: send template, create task, change stage, add tag

### Data Tab
- **CSV Import** — upload leads from CSV with column mapping
- **CSV Export** — download all leads as CSV
- **Duplicate Detector** — finds potential duplicate leads by company name/phone fuzzy matching

### Sequences Tab
- **Sequence Editor** — multi-step automated outreach sequences
- Each step has: type (call/email/SMS/task/wait), template, delay
- Leads can be enrolled in sequences from the Lead Drawer

### Framework Tab (v4)
The sales methodology engine. Fully configurable:
- **Phases** — define named phases (e.g., "Ramp", "Cruise", "Push") with:
  - Target attempts per period
  - Period type (daily, weekly, monthly, rolling N days)
- **Levers** — qualitative dimensions to track (e.g., "Opening strength", "Objection handling")
  - Each lever has: name, description, good/bad labels
- **Markers** — specific qualitative outcomes tracked per attempt (e.g., "DM engaged", "Budget discussed")
  - Each marker has: name, positive label, negative label, applies-to outcomes filter
- Framework data stored in `localStorage` (client-side only)
- Signals (marker hits per attempt) stored in `localStorage` via `lib/signals.ts`

### System Tab
- Diagnostics — checks Supabase connection, RLS policies, data integrity
- Integration info — OpenPhone webhook URL, N8N connection details

---

## 10. Admin (`/admin`)

Admin-only page. Features:
- **User table** — list all users with name, email, role, avatar, creation date
- **Role management** — promote user to admin or demote to user
- Protected by client-side route guard (checks `system_role === 'admin'`)

---

## Cross-Cutting Systems

### Authentication (`lib/auth-context.tsx`)
- Custom auth, NOT Supabase Auth
- `authenticate()` and `register_user()` RPCs with bcrypt
- Sessions stored in `sessions` table with UUID tokens, 30-day sliding expiry
- `get_session_user()` PL/pgSQL function for RLS
- Token in `localStorage` as `dalio_session_token`, sent via `x-session-token` header

### Multi-Tenancy
- Every data table has `project_id`
- RLS policies use `is_member_of(project_id)` → checks `user_projects` table
- `useProjectId()` hook provides active project to all data hooks
- **Project Switcher** in sidebar — users can have multiple projects (CRMs)

### OpenPhone Integration
- **Outbound calls**: CRM "Call" button → creates `call_session` with status `initiated` → opens OpenPhone dialer
- **Webhooks** (via N8N): OpenPhone sends events to N8N → N8N forwards to Supabase:
  - `call.completed` → creates/updates `call_session` with final status, duration
  - `call.recording.completed` → stores `recording_url` in call_session or webhook_events
  - `call.transcript.completed` → stores `transcript_text` in call_session or webhook_events
- **`v_attempts_enriched` view**: JOINs `attempts` + `call_sessions` + webhook CTEs to surface recording URLs and transcripts to the frontend

### Activity Logging (`lead_activities` table)
DB triggers automatically log activities:
- Attempt logged → `activity_type = 'call'`
- Call session created → `activity_type = 'call_session'`
- Task created/completed → `activity_type = 'task_created'` / `'task_completed'`
- Stage changed → `activity_type = 'stage_change'`
- Field changed → `activity_type = 'field_change'`
- All activities have: `lead_id`, `project_id`, `title`, `description`, `metadata` (JSONB), `created_at`

### Task System
- Auto-created from attempt outcomes (e.g., "Follow up" after DM interest)
- Types: Follow up, Call back, Send info, Qualify, Close, Custom
- Priorities: Low, Medium, High, Urgent
- Due dates auto-set based on outcome → task mapping in `getDefaultTaskForOutcome()`
- Displayed in: Lead Drawer (pending tasks card), Dashboard (tasks due today), Dial Session (queue priority)

---

## Data Flow Diagram

```
User clicks "Call" on Lead
    │
    ├──→ Creates call_session (status: initiated, lead_id, project_id)
    │       │
    │       └──→ DB trigger → lead_activity (type: call_session)
    │
    ├──→ Opens OpenPhone dialer
    │       │
    │       └──→ OpenPhone webhook → N8N → Supabase
    │               │
    │               ├──→ call.completed → updates call_session (status, duration)
    │               ├──→ call.recording.completed → webhook_events table
    │               └──→ call.transcript.completed → webhook_events table
    │
    └──→ User clicks "Log Attempt"
            │
            ├──→ Creates attempt (outcome, why, note, project_id)
            │       │
            │       └──→ DB trigger → lead_activity (type: call)
            │
            ├──→ Links call_session.attempt_id = attempt.id
            │
            ├──→ Auto-creates task if outcome warrants it
            │       │
            │       └──→ DB trigger → lead_activity (type: task_created)
            │
            └──→ v_attempts_enriched view
                    │
                    └──→ JOINs attempt + call_session + webhook recordings/transcripts
                            │
                            └──→ Frontend shows audio player + transcript in Attempt Detail Modal
```

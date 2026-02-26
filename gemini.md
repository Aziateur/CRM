# gemini.md — Project Constitution

> **Law file.** Only updated when schemas change, rules are added, or architecture is modified.

---

## 🧭 North Star

**Dalio CRM** is a deterministic, high-volume cold-calling pipeline tool. Every feature exists to make a rep dial 100+ calls/day, learn from each call, and iterate on what works.

---

## 🏗️ Architecture (A.N.T. 3-Layer Model)

### Layer 1: Architecture (`architecture/`)
Technical SOPs. If logic changes, update the SOP *before* updating the code.

### Layer 2: Navigation (Decision Making)
Reasoning layer. Routes data between SOPs and Tools. This is the AI assistant's job.

### Layer 3: Tools (`tools/`, `scripts/`)
Deterministic scripts. Atomic and testable. All secrets in `.env.local`.

### Existing Stack Mapping

| B.L.A.S.T. Concept | Maps To |
|---|---|
| **Architecture SOPs** | `architecture/` (new) + `.agent/workflows/` (existing) |
| **Tools** | `tools/` (new) + `scripts/` (existing) |
| **Intermediates** | `.tmp/` (new) + `supabase/.temp/` (existing) |
| **Cloud Payload** | Supabase (DB) + Cloudflare Pages (deploy) |
| **Triggers** | N8N webhooks + Supabase triggers + `supabase/migrations/` |

---

## 📊 Data Schema (Source of Truth)

### Core Entities

```typescript
// ─── Lead ───
interface Lead {
  id: string            // uuid
  company: string       // required
  phone?: string
  segment: string       // from categories
  stage: string         // NOT NULL DEFAULT 'New' — matches pipeline_stages.name
  contacts: Contact[]
  customFields?: Record<string, unknown>  // JSONB
  project_id: string    // FK → projects.id (multi-tenancy)
  createdAt: string
}

// ─── Attempt (Call Log) ───
interface Attempt {
  id: string
  leadId: string        // FK → leads.id
  outcome: AttemptOutcome  // exactly 5 values (see OUTCOMES below)
  why?: WhyReason       // shown only when outcome = "DM reached → No interest"
  repMistake?: RepMistake
  dmReached: boolean    // derived from outcome
  nextAction: NextAction // derived from outcome + why
  timestamp: string
  project_id: string
}

// ─── Task ───
interface Task {
  id: string
  leadId: string
  attemptId?: string
  type: 'call_back' | 'follow_up' | 'meeting' | 'other'
  title: string
  dueAt: string
  completedAt?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  project_id: string
}
```

### Canonical Constants (OUTCOMES)

```typescript
// ONE source of truth — import OUTCOMES from lib/store.ts everywhere
const OUTCOMES = {
  NO_CONNECT:       { value: "No connect",                    isWin: false, isDmReached: false },
  GATEKEEPER:       { value: "Gatekeeper only",               isWin: false, isDmReached: false },
  DM_NO_INTEREST:   { value: "DM reached → No interest",     isWin: false, isDmReached: true  },
  DM_SOME_INTEREST: { value: "DM reached → Some interest",   isWin: false, isDmReached: true  },
  MEETING_SET:      { value: "Meeting set",                   isWin: true,  isDmReached: true  },
}

const DEFAULT_STAGE = "New"  // matches DB DEFAULT on leads.stage
```

### Supporting Entities

| Entity | Table | Key Fields |
|--------|-------|------------|
| **PipelineStage** | `pipeline_stages` | name, color, sortOrder, project_id |
| **Experiment** | `experiments` | name, hypothesis, status, variants[], project_id |
| **Template** | `review_templates` | name, mode (quick/deep), fields[], version |
| **Workflow** | `workflows` | name, trigger, conditions, actions, project_id |
| **Sequence** | `sequences` | name, steps[], project_id |
| **Tag** | `tags` | name, color, project_id |
| **Category** | `kb_categories` | name, type, icon, project_id |

### External Services

| Service | Purpose | Auth |
|---------|---------|------|
| **Supabase** | PostgreSQL DB + RLS | Anon key in `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Cloudflare Pages** | Static hosting | Git push to `sandbox` branch |
| **N8N** | Webhook automation | External, URL in `.env.local` |
| **OpenPhone** | Call tracking | Webhook → N8N → Supabase |

---

## 🚫 Behavioral Rules (Do Not)

1. **Never hardcode outcome strings** — always use `OUTCOMES.*.value` from `lib/store.ts`
2. **Never hardcode stage "New"** — always use `DEFAULT_STAGE` from `lib/store.ts`
3. **Never use `any`** — use `unknown` + type narrowing
4. **Never mutate state directly** — use spread operators
5. **Never leave placeholders/TODOs** — write complete code or don't write it
6. **Never commit to `main`** — always push to `sandbox`
7. **Never commit `.env.local`** — secrets stay local
8. **Never rewrite layout/sidebar without checking CLAUDE.md** — surgical edits only
9. **Never add emojis as UI icons** — use Lucide React icons
10. **Never make stage nullable in new code** — `lead.stage` is always a string

---

## 🔐 Multi-Tenancy Invariant

**Every data table has `project_id`.** RLS policies enforce isolation via `is_member_of(project_id)`. The `useProjectId()` hook provides the active project to every data hook. Breaking this invariant breaks all data isolation.

---

## 🔑 Auth Invariant

**Custom auth, NOT Supabase Auth.** `authenticate()` and `register_user()` RPCs with bcrypt. Session token in `localStorage` as `dalio_session_token`. `get_session_user()` PL/pgSQL extracts user from `x-session-token` header for RLS.

---

## 📅 Maintenance Log

| Date | Change | Migration |
|------|--------|-----------|
| 2026-02-20 | Centralized OUTCOMES config, removed 15+ hardcoded strings | — |
| 2026-02-20 | Made `leads.stage` NOT NULL DEFAULT 'New' | `20260220000001_stage_not_null.sql` |
| 2026-02-20 | Deleted 5 dead files, removed 4 dead constants | — |
| 2026-02-20 | Replaced all decorative emojis with Lucide icons | — |
| 2026-02-19 | Fixed cascade deletes across all FK relationships | `20260219000001_fix_all_missing_cascades.sql` |

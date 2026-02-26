# Lead Drawer Redesign — Final Plan

> Based on the full code assessment + Dalio-style diagnostic feedback.
> Every item names exact files, functions, and line numbers.
> Read this, mark what you want done, I implement exactly that.

---

## THE DIAGNOSIS (what's actually wrong)

### Problem A — Inconsistent save semantics (the core confusion)

The drawer has TWO persistence models operating simultaneously with no visual distinction.

**Immediate saves (no Save button needed):**

| Action | File | Function | Line | DB table |
|--------|------|----------|------|----------|
| Change stage | `lead-drawer.tsx` | `handleStageChange` | 199-224 | `leads` |
| Add contact | `lead-drawer.tsx` | `handleAddContact` | 234-252 | `contacts` |
| Delete contact | `lead-drawer.tsx` | `handleDeleteContact` | 254-262 | `contacts` |
| Add note | `lead-drawer.tsx` | `handleAddNote` | 135-139 | `lead_activities` |
| Complete task | `hooks/use-tasks.ts` | `completeTask` | 130-145 | `tasks` |
| Toggle tag | `hooks/use-tags.ts` | `toggleTag` via `tag-manager.tsx:TagToggle` | use-tags:195-200 | `lead_tags` |
| Sequence ops | `sequence-enrollment.tsx` | `enroll/updateEnrollmentStatus/advanceStep` | 78-81 | `sequence_enrollments` |

**Deferred saves (require Edit + Save click):**

| Action | File | Function | Line | DB table |
|--------|------|----------|------|----------|
| All 17 lead fields | `lead-drawer.tsx` | `handleSave` | 161-197 | `leads` |

The deferred group includes the **most important after-call fields**: `confirmedFacts`, `openQuestions`, `nextCallObjective`, `constraints`, `operationalContext`, `opportunityAngle`.

**Double-write bug:** Stage is saved immediately by `handleStageChange` (line 211-219) AND included in the batch `handleSave` (line 184). If user changes stage, then edits other fields and clicks Save, stage gets written twice.

---

### Problem B — Stage exists twice

**In the drawer:** `lead.stage` — manual, from the header dropdown, persisted immediately.

```
lead-drawer.tsx line 311:
  <Select value={ed.stage || "New"} onValueChange={handleStageChange}>
```

**In the table/kanban:** `getEffectiveStage(lead, attempts)` — auto-derived, can show a DIFFERENT stage.

```
lib/store.ts line 488-504:
  export function getEffectiveStage(lead: Lead, attempts: Attempt[]): string {
    if (lead.stage && lead.stage !== "New") return lead.stage  // manual wins IF set
    // ... otherwise derives from attempts
  }

app/page.tsx line 109:
  const matchesStage = stageFilter === "all" || getEffectiveStage(lead, attempts) === stageFilter
```

**The contradiction:** User logs "Meeting set" attempt → derived stage becomes "Meeting Booked." But if `lead.stage` is still "New" or "Contacted", the table filter will show the lead in the wrong column (because `getEffectiveStage` returns `lead.stage` if it's set and not "New"). And there's no auto-promotion.

---

### Problem C — Attempt data is polluted

```
app/page.tsx lines 133-145:
  if (process.env.NEXT_PUBLIC_SANDBOX_CALLS === "true") {
    const { data: attempt } = await supabase.from("attempts").insert([{
      lead_id: selectedLead.id,
      outcome: "No connect",        // ← FAKE: assumed before call even connects
      dm_reached: false,
      next_action: "Call again",
      duration_sec: 0,
    }]).select().single()

    // Also creates a call_sessions row
    await supabase.from("call_sessions").insert([{
      attempt_id: attempt.id,
      status: "initiated",           // ← The call hasn't even rung yet
    }])
  }
```

This creates a garbage "No connect" attempt the instant the Call button is clicked. If the person answers, the user must log another attempt → now there are 2 attempts for 1 call. If the user forgets to log the real outcome, the CRM records "No connect" when it was actually a conversation. Analytics, coaching, and pipeline are all poisoned.

---

### Problem D — Activity Feed is structurally dead

```
hooks/use-lead-activities.ts:
  line 113: logActivity()   ← EXISTS, works perfectly, is NEVER CALLED
  line 82:  addNote()       ← the ONLY function that writes to lead_activities
```

The drawer renders icons for 9 activity types (line 750-757 of lead-drawer.tsx):
`note`, `call`, `stage_change`, `tag_change`, `field_change`, `task_created`, `task_completed`, `email`, `sms`

But only `note` ever gets written. The other 8 icons are decorating a feed that will **always be empty** for those types. No code anywhere calls `logActivity("stage_change", ...)` or `logActivity("call", ...)`.

---

### Problem E — Three "call" timelines showing overlapping data

| UI Section | Data source | File | Lines |
|-----------|------------|------|-------|
| Last Attempt card | `attempts` table (sorted, take first) | `lead-drawer.tsx` | 355-382 |
| Call History (Sandbox) | `v_calls_with_artifacts` view → `call_sessions` table | `CallsPanel.tsx` | 30-69 |
| Attempts timeline | `attempts` table (all for lead) | `lead-drawer.tsx` | 773-800 |

When OpenPhone records a call, the recording lands in `call_sessions` (via webhook) AND gets joined to an `attempt` (via `attempt_id` FK from migration `20240523000000`). So the same recording can appear in CallsPanel AND in the Attempts timeline. The Last Attempt card shows the same data as the first row of the Attempts timeline.

---

### Problem F — No data refresh after mutations

```
app/page.tsx line 157-159:
  const handleAttemptLogged = (attempt: Attempt) => {
    setAttempts([attempt, ...attempts])
    // ← does NOT refetch tasks
    // ← does NOT refetch activities
    // ← does NOT refetch call sessions
  }
```

After logging an attempt, the auto-created task (fire-and-forget, `log-attempt-modal.tsx` line 93-113) won't appear in the drawer's Pending Tasks card until the user closes and reopens the drawer, because `useTasks` fetches once on mount and never re-fetches.

---

### Problem G — Primary contact is fake

```
lead-drawer.tsx line 264-269:
  const handleSetPrimaryContact = (contactId: string) => {
    const contact = editedLead.contacts.find((c) => c.id === contactId)
    setEditedLead({ ...editedLead, contacts: [contact, ...editedLead.contacts.filter(...)] })
  }
```

"Primary" = first in the local array. This is never persisted. On page reload, the order resets to whatever Postgres returns (insertion order, or alphabetical, depending on query). The contacts table has no `is_primary` column and no `position` column.

---

### Problem H — queueMicrotask render hack

```
lead-drawer.tsx lines 143-148:
  if (lead && (!editedLead || editedLead.id !== lead.id)) {
    queueMicrotask(() => {
      setEditedLead({ ...lead })
      setIsEditing(false)
    })
  }
```

This sets state inside the render body via `queueMicrotask` to avoid the React "cannot update during render" error. It's a timing hack. The correct solution is `useEffect` with `[lead?.id]` dependency.

---

## THE PLAN (6 moves, ordered by leverage)

---

### Move 1: ONE write contract — Auto-save everything

**Principle:** Every field saves on blur/change. No Edit/Save toggle. Every save shows inline feedback.

**Why this order:** This is the foundational architectural decision. Everything else depends on it. If we pick "auto-save," the entire Edit/Save machinery deletes.

#### File changes:

**`lead-drawer.tsx`** — the big one:

1. **Delete** `isEditing` state (line 128), `setIsEditing`, Edit button (line 344-347), Save button (line 339-342)
2. **Delete** `handleSave` function (lines 161-197)
3. **Replace** each field with an auto-saving input:
   - Confirmed Facts: each input saves on blur → `supabase.from("leads").update({ confirmed_facts: [...] })`
   - Open Questions: same pattern
   - Next Call Objective: save on blur
   - Segment, Decision Maker, Fleet Owner, Operational Context, Constraints, Opportunity Angle, Deal Value, Custom Fields: all save on blur
4. **Add** per-field save status: a tiny "✓ Saved" or "Saving..." indicator next to each field
5. **Remove** `stage` from the batch update (it already saves immediately — this fixes the double-write)
6. **Remove** `editedLead` state entirely. Read from `lead` prop. Each field manages its own local state via `useState` initialized from `lead`.

**`lead-drawer.tsx`** — contacts (already immediate, no change needed):
- `handleAddContact` (line 234) — already immediate ✅
- `handleDeleteContact` (line 254) — already immediate ✅

**`lead-drawer.tsx`** — primary contact fix:
- Add `is_primary` column to contacts table (new migration)
- Change `handleSetPrimaryContact` to write to DB immediately

**New helper:** `lib/commands/update-lead-field.ts`
```ts
export async function updateLeadField(
  leadId: string,
  field: string,
  value: unknown,
  onSuccess?: () => void,
  onError?: (msg: string) => void
) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("leads")
    .update({ [field]: value })
    .eq("id", leadId)
  if (error) onError?.(error.message)
  else onSuccess?.()
}
```

---

### Move 2: Centralize mutations + auto-log activities via DB triggers

**Principle:** Activity logging must be impossible to forget. The only reliable way: Postgres triggers.

**Why DB triggers instead of frontend `logActivity()` calls:**
- 7+ components write to the DB independently (drawer, modals, tag widget, task hook, page.tsx call handler, sequence widget, attempt detail modal)
- Wiring `logActivity()` into every one is fragile and will break when the next feature ships
- Triggers catch writes from webhooks, N8N automations, and future integrations too

#### New migration: `supabase/migrations/20260213000008_activity_triggers.sql`

```sql
-- Trigger: log to lead_activities on attempts insert
CREATE OR REPLACE FUNCTION log_attempt_activity() RETURNS trigger AS $$
BEGIN
  INSERT INTO lead_activities (lead_id, activity_type, title, description, metadata)
  VALUES (
    NEW.lead_id,
    'call',
    'Attempt: ' || NEW.outcome,
    NEW.note,
    jsonb_build_object(
      'attempt_id', NEW.id,
      'outcome', NEW.outcome,
      'why', NEW.why,
      'next_action', NEW.next_action,
      'dm_reached', NEW.dm_reached
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_attempt_activity
  AFTER INSERT ON attempts
  FOR EACH ROW EXECUTE FUNCTION log_attempt_activity();

-- Trigger: log to lead_activities on stage change
CREATE OR REPLACE FUNCTION log_stage_change_activity() RETURNS trigger AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO lead_activities (lead_id, activity_type, title, description, metadata)
    VALUES (
      NEW.id,
      'stage_change',
      'Stage: ' || COALESCE(OLD.stage, 'New') || ' → ' || COALESCE(NEW.stage, 'New'),
      NULL,
      jsonb_build_object('old_stage', OLD.stage, 'new_stage', NEW.stage)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_stage_change_activity
  AFTER UPDATE OF stage ON leads
  FOR EACH ROW EXECUTE FUNCTION log_stage_change_activity();

-- Trigger: log to lead_activities on contact add/delete
CREATE OR REPLACE FUNCTION log_contact_activity() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
    VALUES (NEW.lead_id, 'field_change', 'Contact added: ' || NEW.name,
      jsonb_build_object('contact_id', NEW.id, 'action', 'added'));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
    VALUES (OLD.lead_id, 'field_change', 'Contact removed: ' || OLD.name,
      jsonb_build_object('contact_id', OLD.id, 'action', 'removed'));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_contact_activity
  AFTER INSERT OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION log_contact_activity();

-- Trigger: log to lead_activities on task completion
CREATE OR REPLACE FUNCTION log_task_completed_activity() RETURNS trigger AS $$
BEGIN
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
    VALUES (NEW.lead_id, 'task_completed', 'Task completed: ' || NEW.title,
      jsonb_build_object('task_id', NEW.id, 'type', NEW.type));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_task_completed_activity
  AFTER UPDATE OF completed_at ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_completed_activity();

-- Trigger: log to lead_activities on task creation (auto-tasks from attempts)
CREATE OR REPLACE FUNCTION log_task_created_activity() RETURNS trigger AS $$
BEGIN
  INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
  VALUES (NEW.lead_id, 'task_created', 'Task created: ' || NEW.title,
    jsonb_build_object('task_id', NEW.id, 'type', NEW.type, 'due_at', NEW.due_at));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_task_created_activity
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_created_activity();

-- Trigger: log to lead_activities on tag add/remove
CREATE OR REPLACE FUNCTION log_tag_activity() RETURNS trigger AS $$
DECLARE
  v_tag_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_tag_name FROM tags WHERE id = NEW.tag_id;
    INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
    VALUES (NEW.lead_id, 'tag_change', 'Tag added: ' || COALESCE(v_tag_name, 'unknown'),
      jsonb_build_object('tag_id', NEW.tag_id, 'action', 'added'));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO v_tag_name FROM tags WHERE id = OLD.tag_id;
    INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
    VALUES (OLD.lead_id, 'tag_change', 'Tag removed: ' || COALESCE(v_tag_name, 'unknown'),
      jsonb_build_object('tag_id', OLD.tag_id, 'action', 'removed'));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tag_activity
  AFTER INSERT OR DELETE ON lead_tags
  FOR EACH ROW EXECUTE FUNCTION log_tag_activity();
```

**After this migration:** Every mutation from any source (UI, webhook, N8N, future API) automatically creates the right activity entry. The `logActivity()` function in `use-lead-activities.ts` becomes unnecessary for everything except manual notes.

---

### Move 3: Unify stage into one system

**Principle:** `leads.stage` is canonical. Attempts produce a *suggestion*, not an override.

#### File changes:

**`lib/store.ts`:**
- **Rename** `getEffectiveStage` → `getSuggestedStage` (line 488)
- **Change logic:** always return the derived stage, never read `lead.stage`
- This function becomes advisory only — used for hints, never for display

**`app/page.tsx`:**
- **Change** line 109: use `lead.stage` directly for filtering, not `getEffectiveStage`
- **`leads-table.tsx`:** Stage column shows `lead.stage`
- **`kanban-board.tsx`:** Group by `lead.stage`

**`log-attempt-modal.tsx`** — add stage auto-promotion:
- After logging "Meeting set" → auto-update `lead.stage` to "Meeting Booked" (immediate save)
- After logging "DM reached → Some interest" → auto-update to "Interested" IF current stage < "Interested"
- After logging "DM reached → No interest" + Drop → auto-update to "Lost"
- This is the ONLY place where stage changes automatically. Everywhere else it's manual.

**Delete:** `getDerivedStage()` (line 449-463), `getDerivedStatus()` (line 466-485)
**Delete:** `DerivedStage` type (line 43-48), `DerivedStatus` type (line 51-59)

---

### Move 4: Stop polluting attempt data

**Principle:** A Call button click creates a `call_session` only. An Attempt is created only when the user logs the actual outcome.

#### File changes:

**`app/page.tsx`** — `handleCall` (lines 124-146):

```tsx
// BEFORE (broken):
const { data: attempt } = await supabase.from("attempts").insert([{
  outcome: "No connect", ...  // ← FAKE
}])
await supabase.from("call_sessions").insert([{ attempt_id: attempt.id, ... }])

// AFTER (correct):
await supabase.from("call_sessions").insert([{
  lead_id: selectedLead.id,
  phone_e164: phone,
  direction: "outgoing",
  status: "initiated",
  started_at: new Date().toISOString(),
  project_id: projectId,
  // NO attempt_id — attempt doesn't exist yet
}])
```

The `attempt_id` on `call_sessions` gets linked later when the user logs the actual attempt via LogAttemptModal (requires a small change to LogAttemptModal to find and link the most recent unlinked call_session for this lead).

---

### Move 5: Collapse into ONE "Interactions" timeline

**Principle:** One chronological feed, one mental model.

#### File changes:

**Delete:** `components/CallsPanel.tsx` (entire file, 145 lines)

**`lead-drawer.tsx`:**
- **Delete** Last Attempt card (lines 355-382) — replaced by first item in Interactions feed
- **Delete** `<CallsPanel leadId={ed.id} phone={ed.phone} />` (line 420)
- **Delete** Attempts timeline card (lines 773-800) — replaced by Interactions feed

**Replace with:** A single `<InteractionsTimeline leadId={ed.id} />` component that:
1. Fetches from `lead_activities` (which now includes all types thanks to Move 2 triggers)
2. For activities of type `"call"`, enriches with recording/transcript from `attempts` joined data
3. Shows everything chronologically: attempts, notes, stage changes, tags, tasks, contacts
4. Each call entry shows inline audio player + expandable transcript
5. Each entry is clickable (calls open AttemptDetailModal, tasks navigate to task, etc.)

**New file:** `components/interactions-timeline.tsx` (~200 lines)

The Notes & Activity card (lines 724-768) merges into this. The note input stays at the top.

---

### Move 6: Fix the render hack + performance

**Principle:** No micro-optimizations until the architecture is right, but fix the correctness bugs.

#### File changes:

**`lead-drawer.tsx`** — replace queueMicrotask (lines 141-148):

```tsx
// BEFORE (hack):
const currentLead = editedLead && editedLead.id === lead?.id ? editedLead : lead
if (lead && (!editedLead || editedLead.id !== lead.id)) {
  queueMicrotask(() => {
    setEditedLead({ ...lead })
    setIsEditing(false)
  })
}

// AFTER (correct):
useEffect(() => {
  if (lead) {
    setEditedLead({ ...lead })
    setIsEditing(false)
  }
}, [lead?.id])
```

**`app/page.tsx`** — stop passing all attempts:
- Currently: drawer receives `attempts` (all attempts for all leads), filters inside (line 150-154)
- After: parent pre-filters `const leadAttempts = attempts.filter(a => a.leadId === selectedLead?.id)` and passes only the relevant ones
- Or better: drawer fetches its own attempts via `useAttempts({ leadId })` (requires small hook change)

**`app/page.tsx`** — refetch tasks after attempt log (line 157-159):
- After `handleAttemptLogged`, call `tasks.refetch()` to show the auto-created follow-up task immediately

---

## IMPLEMENTATION ORDER

| Phase | Move | Effort | What changes |
|-------|------|--------|-------------|
| **Day 1** | Move 4: Stop fake attempts | 30 min | `app/page.tsx` — 12 lines changed |
| **Day 1** | Move 6: Fix render hack + perf | 30 min | `lead-drawer.tsx` — 8 lines, `app/page.tsx` — 3 lines |
| **Day 1** | Move 3: Unify stage | 1 hour | `lib/store.ts`, `app/page.tsx`, `log-attempt-modal.tsx`, `leads-table.tsx` |
| **Day 2** | Move 2: DB triggers for activities | 1 hour | 1 new migration file (SQL only, no frontend) |
| **Day 2** | Move 5: Unified timeline | 2-3 hours | New `interactions-timeline.tsx`, delete `CallsPanel.tsx`, rework `lead-drawer.tsx` layout |
| **Day 3** | Move 1: Auto-save everything | 3-4 hours | Major rewrite of `lead-drawer.tsx`, new `update-lead-field.ts`, new migration for `contacts.is_primary` |

**Total: ~3 days of focused work.**

Day 1 alone (Moves 4, 6, 3) fixes the three worst correctness bugs with minimal code changes and zero UI redesign.

---

## WHAT THIS DOES NOT COVER (explicitly out of scope)

- Tabs layout (Activity / Intel / Details) — nice but cosmetic, do after the data layer is clean
- Post-Call Review panel — depends on Move 1 (auto-save) being done first
- Header summary stats (attempt count, days since last) — trivial, add anytime
- React Query / SWR migration — nice but not needed if we fix the specific refetch issues
- `DynamicFieldRenderer` changes — works fine, just needs auto-save wiring from Move 1

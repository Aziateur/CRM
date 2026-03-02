# CRM Workflow Engine — Complete Handoff Spec

> Give this entire file to any AI. It contains everything needed to understand the project, what's broken, and exactly what to build — with code samples.

---

## Project Overview

This is a **sales CRM** for cold-calling pipelines. Built with Next.js (App Router), Supabase (Postgres), shadcn/ui, and pnpm. It manages leads through a Kanban pipeline with call logging, task management, and a **workflow engine** (sequences + automation rules).

**The workflow engine's plumbing works — DB, hooks, runners — but the UI is broken. Steps are empty shells with no content. Tasks have no checklists for SOPs.**

---

## Environment Setup

```bash
cd "/Users/alielhallaoui/Desktop/Projects & Tech/CRM"
pnpm install
pnpm dev   # → http://localhost:3000
```

### `.env.local` (gitignored — recreate manually)
```
NEXT_PUBLIC_SUPABASE_URL=https://syyrrgxqiqdsmaiiapnw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eXJyZ3hxaXFkc21haWlhcG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODkxOTgsImV4cCI6MjA4NTg2NTE5OH0.25kgA-udekMY04eYAZ-wTi_tVAKqfOBjTC421DPG0Dc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eXJyZ3hxaXFkc21haWlhcG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4OTE5OCwiZXhwIjoyMDg1ODY1MTk4fQ.f7KAEtXfOdUG4DN0KZX81cOfUlZBuLSqNA1Dk_gTc4M
```

### Tech Stack
- **Framework:** Next.js 14 (App Router, `app/` directory)
- **Database:** Supabase (Postgres with JSONB columns)
- **UI:** shadcn/ui components in `components/ui/`
- **Icons:** Lucide React (never emojis)
- **Styling:** Tailwind CSS
- **State:** React hooks only (no Redux/Zustand)
- **Package manager:** pnpm
- **Repo:** github.com/Aziateur/CRM, branch: `sandbox`

---

## Relevant Files

| File | Purpose | Status |
|------|---------|--------|
| `supabase/migrations/20260210000005_sequences.sql` | sequences, sequence_steps, sequence_enrollments tables | ✅ |
| `supabase/migrations/20260209000001_tasks.sql` | tasks table (has `description TEXT` but **no `checklist`**) | ⚠️ Needs migration |
| `lib/store.ts` (L149-161) | `Task` interface | ⚠️ Needs `checklist` field |
| `lib/store.ts` (L650-687) | `SequenceStep`, `Sequence`, `SequenceEnrollment`, `Workflow` types | ✅ |
| `lib/workflow-engine.ts` | Event bus + trigger evaluator + describe functions | ✅ |
| `hooks/use-sequences.ts` | `useSequences()` + `useSequenceSteps(id)` — CRUD for sequences & steps | ✅ Already supports `config` |
| `hooks/use-tasks.ts` | `useTasks()` — CRUD for tasks | ⚠️ Needs `toggleChecklistItem` |
| `hooks/use-workflows.ts` | `useWorkflows()` — CRUD for automation rules | ✅ |
| `hooks/use-sequence-runner.ts` | Auto-advances enrollments, creates tasks | ⚠️ Creates generic `[Sequence] Task` |
| `hooks/use-workflow-runner.ts` | Listens to event bus, executes actions | ✅ |
| `components/sequence-editor.tsx` | Sequence list + detail + Add Step dialog | 🔴 Step builder is an EMPTY SHELL |
| `components/sequence-enrollment.tsx` | Lead drawer enrollment widget | ✅ Fixed |
| `components/workflow-editor.tsx` | Automation rule list + create dialog | ⚠️ No edit, no `enroll_sequence` config |
| `components/widgets/pending-tasks.tsx` | Shows pending tasks in lead drawer | ⚠️ No checkboxes |
| `app/work-center/page.tsx` | Work Center tabs (Overview, Templates, Sequences, Automation) | ✅ Fixed |

---

## Database Schema

### `tasks` table (CURRENT — needs migration)
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    attempt_id UUID REFERENCES attempts(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('call_back', 'follow_up', 'meeting', 'email', 'custom')),
    title TEXT NOT NULL,
    description TEXT,
    -- ❌ NO checklist COLUMN — needs to be added
    due_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    project_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### `sequence_steps` table
```sql
CREATE TABLE sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    position INT NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN ('call', 'email', 'sms', 'task', 'wait')),
    delay_days INT NOT NULL DEFAULT 0,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    config JSONB DEFAULT '{}',   -- ← EXISTS but always empty because UI never populates it
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## What's Broken — The Core Problem

### 1. The "Add Step" dialog is an empty shell

The dialog only collects: **step type** (dropdown) + **delay days** (number). No fields for task description, call objective, or checklist items. The `config JSONB` column exists in DB and the hook's `addStep({config})` supports it, but the UI never passes any config — it's always `{}`.

**Result:** Every step is an empty container. The runner creates tasks with generic titles like `"[Sequence] Task"`.

### 2. Tasks have no checklist / SOP support

The `tasks` table has `title` and `description` (plain text) — but no structured **checklist** for SOP steps. Reps need Asana-style sub-tasks they can tick off.

### 3. Other broken things

| Problem | Impact |
|---------|--------|
| No step editing | Can only delete, not edit a step (but `updateStep()` hook exists) |
| No inline content display | Timeline shows "Task" or "Call" with no detail |
| No workflow rule editing | Rules can only be created or deleted, no edit dialog |
| `enroll_sequence` action type | Exists but has no config fields (which sequence?) |

---

## Design Reference: How Asana Does Subtasks

Study Asana's subtask model — this is the gold standard for task checklists:

- **Subtasks live inside a parent task**, listed vertically with checkboxes
- Each subtask has: **checkbox + title** (minimal viable), optionally assignee + due date
- **"+ Add subtask" button** at the bottom — pressing Enter creates the next one (rapid inline entry)
- Completing a subtask **checks it off with strikethrough** — parent shows progress ("3/5 done")
- **Completing the parent does NOT auto-complete subtasks** — they're independent
- Subtasks are visually indented under the parent task in the detail view

**For our CRM, use a lightweight "checklist" adaptation** (no assignee/due date per item — reps work solo). Each Task step gets a list of SOP items the rep ticks off.

---

## What Needs to Be Built

### 1. New Migration: Add `checklist` to `tasks` table

```sql
-- Migration: add_checklist_to_tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
```

Checklist format:
```json
[
  { "label": "Research company hiring trends", "done": false },
  { "label": "Check their LinkedIn for recent posts", "done": false },
  { "label": "Review notes from last call", "done": false }
]
```

### 2. Update TypeScript Types

In `lib/store.ts`, add to the Task interface:

```typescript
export interface ChecklistItem {
  label: string
  done: boolean
}

export interface Task {
  // ... existing fields ...
  checklist?: ChecklistItem[]  // ← ADD THIS
}
```

### 3. Add Content Fields to "Add Step" Dialog

**File: `components/sequence-editor.tsx`**

New component: `StepConfigFields` (same pattern as `TriggerConfigFields` in `workflow-editor.tsx`).

**Step types visible in dropdown:** Only **Call, Task, Wait**. Email/SMS hidden from dropdown but kept in TypeScript union for backward compatibility.

**Config shape per step type:**

| Step Type | Fields | Config Shape |
|-----------|--------|-------------|
| **task** | Title, Description, **Checklist builder (Asana-style)** | `{ title, description, checklist: "[{label,done},...]" }` |
| **call** | Objective, Talking points | `{ objective, talkingPoints }` |
| **wait** | (none — delay field already exists) | `{}` |

#### ChecklistBuilder component (Asana-style inline add):

```typescript
function ChecklistBuilder({
  items,
  onChange
}: {
  items: string[]
  onChange: (items: string[]) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Checklist (SOP steps)</Label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
          <Input
            value={item}
            onChange={(e) => {
              const next = [...items]
              next[i] = e.target.value
              onChange(next)
            }}
            placeholder="e.g. Research company on LinkedIn"
            className="h-8 flex-1"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full"
        onClick={() => onChange([...items, ""])}>
        <Plus className="h-3 w-3 mr-1" /> Add step
      </Button>
    </div>
  )
}
```

#### Task case in StepConfigFields:

```typescript
case "task":
  const checklistItems: string[] = (() => {
    try { return JSON.parse(config.checklist || "[]").map((c: any) => c.label) }
    catch { return [] }
  })()

  return (
    <>
      <div>
        <Label className="text-xs">Title</Label>
        <Input value={config.title || ""} onChange={(e) => onChange({ ...config, title: e.target.value })}
          placeholder="Pre-call prep" className="h-8" />
      </div>
      <div>
        <Label className="text-xs">Description (optional)</Label>
        <Textarea value={config.description || ""} onChange={(e) => onChange({ ...config, description: e.target.value })}
          placeholder="Brief context..." rows={2} />
      </div>
      <ChecklistBuilder
        items={checklistItems}
        onChange={(labels) => onChange({
          ...config,
          checklist: JSON.stringify(labels.map(l => ({ label: l, done: false })))
        })}
      />
    </>
  )
```

#### Call case in StepConfigFields:

```typescript
case "call":
  return (
    <>
      <div>
        <Label className="text-xs">Objective</Label>
        <Input value={config.objective || ""} onChange={(e) => onChange({ ...config, objective: e.target.value })}
          placeholder="Book a discovery call" className="h-8" />
      </div>
      <div>
        <Label className="text-xs">Talking Points</Label>
        <Textarea value={config.talkingPoints || ""} onChange={(e) => onChange({ ...config, talkingPoints: e.target.value })}
          placeholder="Key points to cover..." rows={3} />
      </div>
    </>
  )
```

### 4. Show Step Content in Timeline

Below each step's type label in the detail view, add a muted summary:

- **task:** Show `config.title` + checklist count ("Pre-call prep · 3 items")
- **call:** Show `config.objective`
- **wait:** Nothing

### 5. Add Edit Step Dialog

- State: `const [editingStep, setEditingStep] = useState<SequenceStep | null>(null)`
- Make step rows clickable: `onClick={() => setEditingStep(step)}`
- Reuse `StepConfigFields` pre-filled from `editingStep.config`
- Save with existing `updateStep(editingStep.id, { stepType, delayDays, config })`

### 6. Update Sequence Runner to Pass Checklist

**File: `hooks/use-sequence-runner.ts`**

```typescript
case "task": {
  const stepLabel = (currentStep.config?.title as string) || "Task"
  const description = (currentStep.config?.description as string) || null

  let checklist: Array<{label: string, done: boolean}> = []
  try { checklist = JSON.parse((currentStep.config?.checklist as string) || "[]") }
  catch { /* ignore */ }

  await supabase.from("tasks").insert([{
    lead_id: enrollment.lead_id,
    type: "custom",
    title: `[Sequence] ${stepLabel}`,
    description,
    checklist,   // ← new JSONB column
    due_at: new Date().toISOString(),
    priority: "normal",
    project_id: projectId,
  }])
  break
}

case "call": {
  const stepLabel = (currentStep.config?.objective as string) || "Call"
  const description = (currentStep.config?.talkingPoints as string) || null
  // ... create task with description
  break
}
```

### 7. Update Pending Tasks Widget with Checkboxes (Asana-style)

**File: `components/widgets/pending-tasks.tsx`**

Below each task's title, render interactive checkboxes:

```typescript
{task.checklist && task.checklist.length > 0 && (
  <div className="mt-1.5 space-y-1 ml-1">
    {task.checklist.map((item, i) => (
      <label key={i} className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => toggleChecklistItem(task.id, i)}
          className="rounded border-gray-300 h-3.5 w-3.5"
        />
        <span className={`text-xs ${item.done ? "line-through text-muted-foreground" : ""}`}>
          {item.label}
        </span>
      </label>
    ))}
    <span className="text-xs text-muted-foreground">
      {task.checklist.filter(c => c.done).length}/{task.checklist.length} done
    </span>
  </div>
)}
```

### 8. Add `toggleChecklistItem` to `use-tasks.ts`

```typescript
const toggleChecklistItem = useCallback(async (taskId: string, itemIndex: number) => {
  const task = tasks.find(t => t.id === taskId)
  if (!task || !task.checklist) return

  const updated = task.checklist.map((item, i) =>
    i === itemIndex ? { ...item, done: !item.done } : item
  )

  const supabase = getSupabase()
  await supabase.from("tasks").update({ checklist: updated }).eq("id", taskId)
  setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: updated } : t))
}, [tasks])
```

### 9. Add `enroll_sequence` Action Config

**File: `components/workflow-editor.tsx`**

Add case in `ActionConfigFields`:
```typescript
case "enroll_sequence":
  return (
    <div>
      <Label className="text-xs">Sequence</Label>
      <Select value={config.sequence_id || ""} onValueChange={(v) => onChange({ ...config, sequence_id: v })}>
        <SelectTrigger className="h-8"><SelectValue placeholder="Select sequence..." /></SelectTrigger>
        <SelectContent>
          {sequences.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
```

Pass `sequences` from `useSequences()` called inside `WorkflowEditor`.

### 10. Add Workflow Editing

- State: `const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)`
- Make workflow rows clickable → opens edit dialog pre-filled
- Reuse `TriggerConfigFields` + `ActionConfigFields` — no duplication
- Save with existing `updateWorkflow(id, { ... })`

---

## Complete File Change List

| # | File | Change |
|---|------|--------|
| **NEW** | `supabase/migrations/..._add_checklist.sql` | `ALTER TABLE tasks ADD COLUMN checklist JSONB DEFAULT '[]'` |
| MOD | `lib/store.ts` | Add `ChecklistItem` interface + `checklist?` to `Task` |
| MOD | `components/sequence-editor.tsx` | `StepConfigFields` + `ChecklistBuilder` + edit dialog + timeline content |
| MOD | `hooks/use-sequence-runner.ts` | Config-aware task titles + pass `checklist` to inserts |
| MOD | `components/widgets/pending-tasks.tsx` | Render Asana-style checkboxes + "2/3 done" progress |
| MOD | `hooks/use-tasks.ts` | Add `toggleChecklistItem`, read `checklist` from DB |
| MOD | `components/workflow-editor.tsx` | `enroll_sequence` config + edit dialog |

**No other files changed.** Hooks `use-sequences.ts` already support `config` in `addStep()` and `updateStep()`.

---

## How the Sequence Runner Works

`hooks/use-sequence-runner.ts` runs on an interval. For each active enrollment:
1. Gets the current step based on `current_step` index
2. Checks if `delay_days` has elapsed since `last_step_completed_at`
3. If yes → executes the step:
   - `wait` → just advances the counter
   - `task/call/email/sms` → creates a task in the `tasks` table, then advances
4. Past last step → marks enrollment as `completed`

**Existing hook APIs (no changes needed):**
```typescript
addStep({ stepType: "task", delayDays: 0, config: { title: "...", checklist: "[...]" } })
updateStep(stepId, { config: { title: "Updated" } })
removeStep(stepId)
```

---

## End-to-End Flow for the Rep

1. **Admin builds a sequence** → adds a "Task" step with title "Pre-call prep" and checklist:
   - ☐ Research company hiring trends
   - ☐ Check their LinkedIn for recent posts
   - ☐ Review notes from last call
2. **Lead gets enrolled** → runner fires → creates a task with the checklist attached
3. **Rep opens the lead drawer** → sees "Pending Tasks (1)" with the task
4. **Rep sees Asana-style checkboxes** → ticks items off → "2/3 done"
5. **Rep clicks ✓** to complete the whole task when ready

---

## Testing Checklist

- [ ] Create a sequence with a Task step that has a title + 3 checklist items
- [ ] Create a sequence with a Call step that has an objective + talking points
- [ ] Steps display their content in the timeline (not just "Task" or "Call")
- [ ] Steps can be edited after creation (click → edit dialog)
- [ ] Enroll a lead in the sequence → verify a task is created with the checklist
- [ ] Open the lead drawer → pending task shows checkboxes
- [ ] Tick checkboxes → verify they save (reload page, checkboxes stay)
- [ ] Create an "enroll_sequence" workflow rule → verify sequence picker works
- [ ] Click an existing workflow to edit it → verify pre-fill and save

---

## URLs
- **Local dev:** http://localhost:3000
- **Work Center:** http://localhost:3000/work-center
- **Supabase Dashboard:** https://supabase.com/dashboard/project/syyrrgxqiqdsmaiiapnw
- **GitHub:** https://github.com/Aziateur/CRM (branch: sandbox)

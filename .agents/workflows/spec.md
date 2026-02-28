---
description: Mandatory pre-build feature specification — run before writing ANY code. Produces a complete blueprint covering user flows, visuals, data, migrations, and component plans.
---

# /spec — Feature Specification Workflow

> **This workflow is MANDATORY before any feature build.** No code is written until this spec is complete and approved by the user.

## Phase 1: User Flow Mapping

For every feature, walk through it **as the user would experience it**, step by step. For each step:

1. **Where am I?** — Which page/route am I on? Screenshot the current state of that page.
2. **What do I see?** — Describe every UI element: buttons, cards, inputs, badges, empty states.
3. **What do I click/do?** — The exact interaction (click button, fill form, drag item, toggle switch).
4. **What happens?** — The result: modal opens, data saves, toast appears, page navigates, etc.
5. **What data moves?** — Which tables are read/written? What's the payload shape?

Format each step as:

```
### Step N: [Action Name]
- **Page:** /route-name
- **UI Elements:** [list every button, input, badge, card visible]
- **User Action:** [what they click/type/drag]
- **System Response:** [what happens — API call, DB write, UI update]
- **Data Flow:** [table.column → component.prop → rendered as X]
- **Screenshot/Mockup:** [generate or capture a visual]
```

If the feature has **multiple user flows** (e.g., create vs. edit vs. delete), map ALL of them separately.

## Phase 2: Visual Inventory

For every screen touched by the feature, produce:

1. **Mockup image** — Use `generate_image` to create a UI mockup of the new/changed screen.
2. **Button & interaction inventory** — A table listing every interactive element:

```
| Element | Type | Label | Action | Location |
|---------|------|-------|--------|----------|
| + New Template | Button (primary) | "New Template" | Opens TemplateBuilder dialog | Top-right of Prep Templates tab |
| Template card | Clickable card | "{template.name}" | Opens edit dialog | Template grid |
| Delete icon | IconButton (destructive) | trash icon | Shows confirmation AlertDialog | Template card top-right |
```

3. **State inventory** — What states can this UI be in?
   - Empty state (no data)
   - Loading state
   - Populated state
   - Error state
   - Disabled/readonly state

## Phase 3: Data Layer Audit

For every feature, answer:

### 3a. Database Schema
- **Existing tables used:** List every table this feature reads from or writes to.
- **New tables needed:** Full CREATE TABLE statement with columns, types, defaults, constraints.
- **Schema changes to existing tables:** ALTER TABLE statements.
- **RLS policies:** What access control rules are needed?
- **Indexes:** Any new indexes for query performance?

### 3b. Migration Check
- **Does this need a Supabase migration?** YES / NO
- If YES, write the full migration SQL and include it in the spec.
- **Is the migration destructive?** (drops columns, changes types, deletes data)
- **Can it be applied without downtime?** (additive changes = yes, destructive = no)

### 3c. Data Shape
For every API response or data structure, show the TypeScript interface:

```typescript
interface Example {
  id: string
  name: string
  // ... every field with its type
}
```

### 3d. Data Flow Diagram
Use a Mermaid diagram to show how data flows:

```mermaid
graph LR
  A[User clicks "Enroll"] --> B[API: POST /enrollments]
  B --> C[DB: sequence_enrollments INSERT]
  C --> D[Hook: useEnrollmentSummary refetch]
  D --> E[UI: Progress badge updates]
```

## Phase 4: Component Plan

For every component created or modified:

```
### [ComponentName] — [NEW | MODIFY | DELETE]
- **File:** components/example.tsx
- **Props:** { prop1: Type, prop2: Type }
- **Hooks used:** useExample, useState, useEffect
- **Children rendered:** ChildA, ChildB
- **What changes:** [exact description of modifications]
- **Why:** [rationale — not just "because we need it"]
```

Group by dependency order — build leaves first, then composites.

## Phase 5: Verification Checklist

Before the spec is approved, confirm:

- [ ] Every user flow has been walked through step-by-step
- [ ] Every screen has a mockup or screenshot
- [ ] Every button/input/interaction is inventoried
- [ ] Every database table is identified (existing and new)
- [ ] Migration SQL is written if needed
- [ ] Data flow diagram exists
- [ ] Component modification list is complete
- [ ] Empty/loading/error states are accounted for
- [ ] No assumptions — every question is answered or flagged

## Output

Save the complete spec as an artifact at:
```
<appDataDir>/brain/<conversation-id>/feature_spec.md
```

Present it to the user for review via `notify_user` with `BlockedOnUser: true`. **Do not proceed to code until approved.**

## After Approval

Once the user approves:
1. Create `implementation_plan.md` with the exact file-by-file changes
2. Create `task.md` with the build checklist
3. Begin execution in batches, verifying each batch in the browser before proceeding

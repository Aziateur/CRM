# Codebase Coherence Cleanup — Implementation Plan

> Created: 2026-02-19  
> Status: **Phases 1–5.1 COMPLETE ✅** (build verified)
> All claims re-verified with fresh grep searches on 2026-02-19T23:30

---

## Phase 1 — Bug Fixes ✅ DONE

### 1.1 KPI Card shows icon name as value
- **File:** `components/kb-metrics-tab.tsx:417`
- **Bug:** `value={metric.icon}` passes the icon name string (e.g. `"bar-chart"`) as the KPI card display value (the big number)
- **Fix:** Change to `value="—"` (placeholder since no real computation exists yet)
- **Risk:** Low — cosmetic only, no data change

### 1.2 Friction tab emoji fallback
- **File:** `components/kb-friction-tab.tsx:475`
- **Bug:** `categoryIcon={cat?.icon ?? log.categoryIcon ?? "⚡"}` — the `"⚡"` emoji is not a valid Lucide icon name for `<CategoryIcon>`
- **Fix:** Change `"⚡"` → `"zap"` (the Lucide equivalent)
- **Risk:** Low — cosmetic only

---

## Phase 2 — Dead Code Removal ✅ DONE

### 2.1 Delete dead hooks (superseded by queries/)

| File to delete | Replaced by | Verification |
|---|---|---|
| `hooks/use-call-reviews.ts` | `queries/review-commands.ts` | ✅ `useCallReviews` only appears in its own file |
| `hooks/use-ranked-calls.ts` | `queries/ranked-calls.ts` | ✅ `useRankedCalls` only appears in its own file. Also contains a duplicate `calculateScore` that shadows `lib/scoring.ts` |

### 2.2 Delete dead components

| File to delete | Verification |
|---|---|
| `components/experiment-progress-panel.tsx` | ✅ `ExperimentProgressPanel` only appears in its own file — never imported |
| `components/top-bottom-calls.tsx` | ✅ `TopBottomCalls` only appears in its own file — never imported |

### 2.3 NOT dead (corrected from initial audit)

| File | Initially thought dead | Actually used by |
|---|---|---|
| `components/page-skeletons.tsx` | ❌ | ✅ `app/playbook/page.tsx` imports `PlaybookSkeleton` |
| `components/mission-control.tsx` | ❌ | ✅ `app/dial-session/page.tsx` imports and renders `<MissionControl>` |
| `components/CallsPanel.tsx` | ❌ | ✅ `components/lead-drawer.tsx` imports it |
| `components/interactions-timeline.tsx` | ❌ | ✅ `components/lead-drawer.tsx` imports it |

### 2.4 Remove dead constants from lib/store.ts

| Constant | Status | Action |
|---|---|---|
| `segmentOptions` (line 401) | ✅ **Dead** — replaced by `useCategories("segment")`, no imports remain | **DELETE** |
| `constraintOptions` (line 168) | ✅ **Dead** — never imported in any `.tsx` file | **DELETE** |
| `nextActionOptions` (line 382) | ✅ **Dead** — never imported directly (only `getDefaultNextAction` is used, which references the type, not this array) | **DELETE** |
| `whatMatteredMostOptions` (line 389) | ✅ **Dead** — never imported in any `.tsx` file | **DELETE** |
| `attemptOutcomeOptions` | ❌ **Actively used** in 4 files | **KEEP** |
| `whyReasonOptions` | ❌ **Actively used** in 2 files | **KEEP** |
| `repMistakeOptions` | ❌ **Actively used** in 2 files | **KEEP** |
| `contactRoleOptions` | ❌ **Actively used** in lead-drawer | **KEEP** |

Also delete the associated **type definitions** if they're only used by the dead constants:
- `ConstraintOption` type — check if used elsewhere
- `WhatMatteredMost` type — check if used elsewhere

---

## Phase 3 — Unify Split Implementations ✅ DONE

### 3.1 Migrate dial-session from old experiments hook to new queries hook

**Current (two separate implementations):**
- `app/dial-session/page.tsx` → imports `useExperiments` from `hooks/use-experiments.ts`
- `components/dial-session/dial-setup-screen.tsx` → imports `type Experiment` from `hooks/use-experiments.ts`
- `app/batch-review/page.tsx` → imports `useExperimentsQuery` from `queries/experiments.ts`

**Type compatibility check:**
- Old `Experiment` interface: 14 fields
- New `Experiment` interface: 16 fields (adds `winnerVariantId`, `promotedRuleId`)
- ✅ **New is a superset** — safe to swap

**Steps:**
1. In `app/dial-session/page.tsx`:
   - Change `import { useExperiments, type Experiment as ExperimentObj } from "@/hooks/use-experiments"` 
   - To: `import { useExperimentsQuery, type Experiment as ExperimentObj } from "@/queries/experiments"`
   - Change `const { activeExperiments } = useExperiments()` to `const { activeExperiments } = useExperimentsQuery()`
2. In `components/dial-session/dial-setup-screen.tsx`:
   - Change `import type { Experiment as ExperimentObj } from "@/hooks/use-experiments"`
   - To: `import type { Experiment as ExperimentObj } from "@/queries/experiments"`
3. Verify no other files import from `hooks/use-experiments.ts`
4. Delete `hooks/use-experiments.ts`

### 3.2 Scoring duplicate cleanup
- The duplicate `calculateScore` in `hooks/use-ranked-calls.ts` is handled by Phase 2.1 (deleting the file)
- After deletion, only `lib/scoring.ts` remains as the single source of truth — already used by `queries/ranked-calls.ts` ✅

---

## Phase 4 — Fix Missing Navigation ✅ DONE

### 4.1 Add Review Analytics link to sidebar
- **Current:** `/review-analytics` page exists, renders full analytics. **ZERO links** to it from anywhere in the app.
- **Fix:** Add to `secondaryItems` in `components/app-sidebar.tsx`:
  ```ts
  { title: "Analytics", url: "/review-analytics", icon: BarChart3 }
  ```
- **Placement decision:** Under "Tools" group (alongside Dashboard, Settings)

### 4.2 Debug page (intentionally hidden — NO ACTION)
- `/debug` is a developer tool route. Keep it unlisted — devs know the URL.

### 4.3 Mission Control — already wired ✅
- Initial audit was wrong. `MissionControl` IS rendered in `app/dial-session/page.tsx:617`
- **No action needed**

---

## Phase 5 — Fix Disconnected Features (5.1 ✅ DONE, 5.2-5.3 DEFERRED)

### 5.1 Add segment editing to lead drawer
- **Current:** Segment can ONLY be set during lead creation (`add-lead-dialog.tsx`). The lead drawer has **no segment selector**.
- **Fix:** Add segment dropdown to lead drawer's header area (near the stage selector):
  1. Import `useCategories("segment")` and `CategoryIcon`
  2. Add `<Select>` with dynamic options from categories
  3. Wire `autoSave("segment", value)` on change
- **Risk:** Low — purely additive

### 5.2 Dashboard custom widgets: compute actual values (DEFER)
- Custom widgets show `value="—"` — they read metric definitions but don't compute values
- This is complex (each metric needs a formula evaluation engine)
- **Recommend deferring** until the metrics system is mature

### 5.3 Workflow engine timer-based triggers (DEFER)
- `lead_idle` and `task_overdue` triggers are defined but have no timer evaluation
- **Recommend deferring** — needs background job architecture

---

## Phase 6 — Hardcoded String Fragility (Low priority) ⏱ ~1-2 hours

### 6.1 Outcome strings used as logic constants
**15+ files** hardcode strings like `"Meeting set"`, `"Gatekeeper only"`:
- `dashboard-widgets.tsx` — meeting counts
- `batch-review/page.tsx` — scope filter
- `leads-table.tsx` — color mapping
- `outcome-logger.tsx` — color mapping
- `review-call-card.tsx` — badge styling
- `experiment-dashboard.tsx` — badge variant
- `mission-control.tsx` — win counting

**Ideal fix:** Create an `OUTCOMES` config object in `store.ts`:
```ts
export const OUTCOMES = {
  "No connect": { color: "gray", isWin: false },
  "Gatekeeper only": { color: "orange", isWin: false },
  "DM reached → No interest": { color: "red", isWin: false },
  "DM reached → Some interest": { color: "blue", isWin: false },
  "Meeting set": { color: "green", isWin: true },
} as const
```
Then import `OUTCOMES` everywhere instead of raw strings.

**Pragmatic decision:** DEFER — outcomes are enum-like, not user-configurable. This is a refactor for consistency rather than a bug.

### 6.2 Stage fallback "New" hardcoded in 7 places
- `leads-table.tsx:141`, `lead-drawer.tsx:293,294`, `kanban-board.tsx:35,72`, `dashboard-widgets.tsx:59`, `page.tsx:111`
- All use `lead.stage || "New"`
- **Fix:** Could use first stage from `usePipelineStages()` or a `DEFAULT_STAGE` constant
- **DEFER** — only breaks if "New" is never a valid stage name

### 6.3 Decorative emoji → Lucide icons (cosmetic)
| File | Emoji | Replacement |
|---|---|---|
| `review-call-card.tsx:101` | 🧪 | `<FlaskConical className="h-3 w-3 mr-1">` |
| `reviewed-calls-table.tsx:129` | 🔼🔽 | `<ArrowUp>` / `<ArrowDown>` |
| `batch-review/page.tsx:368` | 🧪 | `<FlaskConical>` |
| `batch-review/page.tsx:484` | 🧪 | Remove emoji from string label |
| `review-analytics/page.tsx:131-134` | 📝🧪🎯⏭️ | Lucide equivalents |

---

## Execution Order

```
Phase 1 (Bug fixes)        → ~15 min  → zero risk        → build & commit
Phase 2 (Dead code)        → ~20 min  → zero risk        → build & commit
Phase 3 (Unify splits)     → ~30 min  → medium risk      → build & test dial-session → commit
Phase 4 (Navigation)       → ~15 min  → low risk         → build & commit
Phase 5.1 (Segment edit)   → ~30 min  → low risk         → build & commit
Phase 5.2-5.3              → DEFERRED
Phase 6                    → DEFERRED
```

**Total estimated time: ~2 hours for Phases 1-5.1**

---

## Pre-Execution Checklist

- [x] All dead code claims verified with fresh grep searches
- [x] All "actually used" claims verified (corrected page-skeletons, mission-control)
- [x] Type compatibility verified for experiments hook migration
- [ ] Run `next build` after each phase to catch regressions
- [ ] Git commit after each phase with descriptive message

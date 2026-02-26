# SOP: Dial Session

## Overview
The dialer is the core UX — optimized for 100+ calls/day with 2-click outcome logging.

## Flow

```
1. Rep selects dial mode (New / Follow-ups / Interested / Nurture)
2. Queue builds automatically (hooks/use-dial-queue.ts)
3. Rep sees current lead card + phone number
4. Rep dials (via OpenPhone integration)
5. Call ends → OutcomeLogger appears
6. Rep selects outcome (1 of 5) → Why? (if DM No Interest) → optional note
7. Save → attempt written to DB → auto-tasks created → stage auto-promoted
8. Next lead in queue
```

## Outcome Flow (OUTCOMES config)

```
Outcome selected
  → isDmReached() computed from OUTCOMES config
  → getDefaultNextAction(outcome, why) → nextAction
  → getDefaultTaskForOutcome(outcome, why, company) → auto-creates task
  → Stage auto-promotion:
      "Meeting set" → "Meeting Booked"
      "DM reached → Some interest" → "Interested"
      "DM reached → No interest" + (Targeting|Value|Trust) → "Lost"
```

## Queue Priority (use-dial-queue.ts)

| Priority | Source | Score |
|----------|--------|-------|
| Overdue tasks | task.dueAt < today | 100 + daysOverdue |
| Due today | task.dueAt = today | 90 |
| Follow-ups | nextAction = Call again | 70 |
| Fresh leads | 0 attempts | 50 |
| Stale leads | No pending action | 30 |

## Experiments

When an experiment is active, the dial session:
1. Assigns random variant to each call
2. Tags the attempt with `experiment_id` and `variant_id`
3. Experiment dashboard shows per-variant stats

## VM Drop

Quick action: auto-logs "No connect" + note "VM Drop" + advances queue.

## Files
- `app/dial-session/page.tsx` — Main page
- `components/dial-session/` — OutcomeLogger, DialSetupScreen, etc.
- `hooks/use-dial-queue.ts` — Queue building
- `hooks/use-dial-modes.ts` — Mode counting
- `hooks/use-dial-session.ts` — Session state management

# SOP: Review System

## Overview
The batch review system lets managers review recorded calls, tag patterns, and create experiments.

## Two Review Modes

### Quick Batch (fast triage)
```
Manager sees call card (lead, outcome, recording)
  → Fills quick template fields (tags, bucket)
  → Optionally flags for playbook promotion
  → Saves → moves to next call
```

### Deep Dive (analysis)
```
Manager sees call card + evidence panel (transcript + recording)
  → Fills deep template (structured fields)
  → Highlights evidence snippets from transcript
  → Makes decision:
      - Rule Draft → creates playbook rule
      - Experiment → creates A/B experiment
      - Drill → marks for focused practice
      - No Decision → logs insight for later
  → Saves → moves to next call
```

## Templates

Templates are versioned and DB-driven:
- `review_templates` table: name, mode, fields[], version
- Templates support field types: text, rating, multi_select, boolean, etc.
- Version tracked per review for historical consistency

## Experiments

Created from deep review decisions:
```
Deep review → "Experiment" decision
  → Create experiment with hypothesis
    → Add variants (A, B, C...)
      → Variants randomly assigned during dial sessions
        → Stats tracked via experiment_dashboard
          → Conclude → promote winner to playbook rule
```

## Call Ranking (Ranked Calls)

`queries/ranked-calls.ts` ranks calls by a composite score for review priority:
- DM reached calls ranked higher
- Interest calls ranked highest
- Calls with experiments tagged for comparison

## Files
- `app/batch-review/page.tsx` — Main review page
- `app/review-analytics/page.tsx` — Review statistics
- `components/batch-review/` — ReviewCallCard, DeepDivePanel, ReviewedCallsTable
- `queries/review-commands.ts` — Create quick/deep reviews
- `queries/ranked-calls.ts` — Call ranking
- `queries/experiments.ts` — Experiment CRUD + stats
- `queries/templates.ts` — Template management

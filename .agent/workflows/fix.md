---
description: How to debug and fix issues — mandatory protocol for all bug reports
---

# /fix — Debugging Protocol

> **This protocol is mandatory for ALL bug reports.** Do not skip steps. Do not merge branches, refactor code, or do "helpful" side tasks until the bug is resolved.

## Step 1: Classify Severity (30 seconds)

Before touching anything, classify the issue:

| Level | Description | Example | Action |
|:------|:-----------|:--------|:-------|
| **5** | Core UX broken — user can't do their job | Audio not playing, data missing, page crashes | Fix NOW. Everything else stops. |
| **4** | Feature degraded but workaround exists | Slow load, wrong sort order | Fix next. |
| **3** | Tooling/DevOps issue | Git conflicts, deploy failures | Defer unless it blocks Level 4–5. |
| **2** | Polish/cosmetic | Spacing, color, wording | Defer always. |
| **1** | Config/housekeeping | .gitignore, linting, merge branches | Never do during an active bug. |

> **RULE: If you are working on Level 1–3 while a Level 4–5 is open, STOP IMMEDIATELY.**

## Step 2: Trace the Data Path (5 minutes max)

For "X doesn't show in the UI" bugs, trace the FULL path:

```
DB Table → View/Join → RLS Policy → API Query → React Hook → Component Render
```

Run diagnostic queries at each layer. Find the **exact link** that breaks.

**Example diagnostic for "audio not showing":**
```sql
-- Does the data exist?
SELECT recording_url FROM call_sessions WHERE recording_url IS NOT NULL;

-- Is it linked to the right record?
SELECT a.id, cs.recording_url, cs.attempt_id
FROM attempts a
LEFT JOIN call_sessions cs ON cs.attempt_id = a.id
WHERE a.lead_id = '<lead_id>';

-- Does the view return it?
SELECT call_recording_url FROM v_attempts_enriched WHERE lead_id = '<lead_id>';
```

## Step 3: Form a Hypothesis (1 minute)

State it clearly:
- ❌ "The data might be missing" (vague)
- ✅ "call_sessions with recordings have NULL attempt_id, so the JOIN in v_attempts_enriched produces NULL" (specific, testable)

## Step 4: Prove the Hypothesis with a Query

Run ONE query that confirms or denies your hypothesis. If denied, go back to Step 2.

**CRITICAL: Do NOT write a fix until the hypothesis is proven.**

## Step 5: Fix

Write the minimum code/SQL to fix the proven root cause. Nothing more.

## Step 6: Verify

Run the same diagnostic query from Step 2. The broken link should now work.

Ask the user to refresh and confirm in the UI.

**If the fix doesn't solve the stated problem, the hypothesis was wrong. Go back to Step 2. Do NOT move on.**

## Anti-Patterns (FORBIDDEN during debugging)

- ❌ Merging branches proactively
- ❌ Fixing "related" issues before confirming the main fix
- ❌ Creating documentation, handoff files, or workflows mid-debug
- ❌ Investigating git/SSH/deploy problems unless they block the fix
- ❌ Running a backfill/migration without first proving it addresses the root cause
- ❌ Saying "the fix should work, refresh the page" without running a verification query

## Supabase-Specific Debugging

This project uses RLS. When data is "missing" in the UI:

1. **Check with `postgres` user first** (bypasses RLS) — does the data exist at all?
2. **Check `project_id`** — if NULL, RLS hides the record. Fix with backfill.
3. **Check JOINs** — `v_attempts_enriched` joins on `cs.attempt_id = a.id`. If `attempt_id` is NULL, the join produces NULL fields.
4. **Check the hook** — `useAttempts` filters by `project_id`. If the hook queries the wrong project, data is invisible.

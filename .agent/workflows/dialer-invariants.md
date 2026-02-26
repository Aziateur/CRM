---
description: Protected invariants for the OpenPhone dialer and audio/transcript pipeline. Review before any changes to these files.
---

# 🔒 LOCKED — Dialer & Audio/Transcript Pipeline

> **Status: WORKING & LOCKED as of commit `9f74cfd` (2026-02-15)**
> **DO NOT MODIFY any file listed below without explicit user approval.**

## ⛔ Protected Files — DO NOT TOUCH

Any change to these files risks breaking call recordings and transcripts.
**If you need to edit any of these, STOP and ask the user first.**

| # | File | What it does |
|---|---|---|
| 1 | `app/dial-session/page.tsx` | `initiateCall()` — E.164 phone format, creates call_session. `logAttempt()` — links attempt_id back. |
| 2 | `app/api/webhooks/openphone/route.ts` | Webhook receiver — writes to call_sessions + webhook_events |
| 3 | `hooks/useCallSync.ts` | Polls `v_calls_with_artifacts` for evidence (recording/transcript) |
| 4 | `hooks/use-attempts.ts` | Reads `v_attempts_enriched` — maps `call_recording_url` + `call_transcript_text` |
| 5 | `components/CallsPanel.tsx` | Call History card in lead drawer — audio player + transcript display |
| 6 | `components/lead-drawer.tsx` | Renders CallsPanel — do not remove or reorder |
| 7 | `supabase/migrations/20260215000000_robust_calls_views.sql` | `v_calls_with_artifacts` + `v_attempts_enriched` view definitions (COALESCE logic) |
| 8 | `supabase/migrations/20260215100000_auto_stitch_webhook_trigger.sql` | `auto_stitch_webhook_event()` trigger + `normalize_phone_e164()` — auto-matches webhooks to sessions |
| 9 | `supabase/migrations/20260213000011_call_activity_trigger.sql` | Trigger populating `lead_activities` for the interactions timeline |
| 10 | `supabase/migrations/20260214300000_merge_call_session_trigger.sql` | Merge trigger for duplicate call_sessions |

## Critical Chain (DO NOT BREAK)

```
initiateCall() → call_session (phone in E.164: +1XXXXXXXXXX)
       ↓
logAttempt()   → attempt → UPDATE call_session.attempt_id  ← CRITICAL LINK
       ↓
OpenPhone webhook → webhook_events INSERT
       ↓
DB trigger auto_stitch_webhook_event() → matches by openphone_call_id or phone+time
       → writes recording_url + transcript_text to call_sessions
       ↓
v_calls_with_artifacts → COALESCE(call_sessions, webhook_events)
v_attempts_enriched    → JOIN on attempt_id
       ↓
UI: CallsPanel, InteractionsTimeline, batch-review, useCallSync
```

## Invariants That Must Never Change

1. **Phone format**: `initiateCall()` MUST produce E.164 (`+1XXXXXXXXXX`) — this is how matching works
2. **Attempt linking**: `logAttempt()` MUST write `attempt_id` back to `call_sessions`
3. **DB trigger**: `auto_stitch_webhook_event()` fires on `webhook_events` INSERT — do not drop or disable
4. **View COALESCE**: Both views must pull from call_sessions columns AND webhook_events JSONB
5. **CallsPanel in drawer**: Must remain rendered in `lead-drawer.tsx`

## If Something Breaks

Roll back to commit `9f74cfd`:
```bash
git checkout 9f74cfd -- app/dial-session/page.tsx hooks/useCallSync.ts hooks/use-attempts.ts components/CallsPanel.tsx components/lead-drawer.tsx
git push origin sandbox
```

For database triggers/views, re-run:
```bash
# Update the files array in scripts/apply-migrations.ts, then:
npx tsx scripts/apply-migrations.ts
```

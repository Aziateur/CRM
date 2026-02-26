# SOP: Data Flow

## Overview
Dalio CRM is a **static export SPA**. All data flows client-side.

## The Data Path

```
User Action → React Component → Custom Hook → Supabase JS SDK → PostgreSQL (RLS enforced)
```

### Read Path
```
Component renders
  → useLeads() / useAttempts() / useTasks() hook
    → supabase.from("table").select().eq("project_id", projectId)
      → RLS checks is_member_of(project_id)
        → Data returned to hook
          → Component re-renders with data
```

### Write Path
```
User clicks Save
  → Component calls supabase.from("table").insert/update/upsert
    → RLS checks membership
      → DB trigger fires (e.g., activity log, call-session auto-stitch)
        → Realtime subscription notifies other components
          → React Query invalidates cache → UI updates
```

## Key Data Relationships

```
projects (1) ──→ (N) leads
leads    (1) ──→ (N) attempts
leads    (1) ──→ (N) tasks
leads    (1) ──→ (N) contacts
attempts (1) ──→ (0..1) call_sessions  (via attempt_id)
attempts (1) ──→ (N) call_reviews
experiments (1) ──→ (N) experiment_variants
experiments (1) ──→ (N) attempts (via experiment_id)
```

## External Data Ingestion

```
OpenPhone call ends
  → Webhook hits N8N
    → N8N writes to call_sessions table (recording_url, transcript)
      → DB trigger auto-stitches to recent attempt (by lead_id + 30min window)
```

## Cache Invalidation

- React Query for data caching with `queryKey` system (see `lib/query-keys.ts`)
- Realtime subscriptions via `queries/realtime.ts` for cross-tab sync
- `useProjectId()` is a dependency of all data queries — switching project invalidates everything

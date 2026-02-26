# SOP: Multi-Tenancy

## Invariant
**Every data table has a `project_id` column.** No exceptions.

## How It Works

```
User logs in
  → user_projects table maps user → project(s)
    → useProjectId() hook returns active project
      → Every data hook filters by project_id
        → RLS policy checks is_member_of(project_id)
```

## RLS Pattern

All tables use this policy pattern:
```sql
CREATE POLICY "Users can access own project data"
  ON table_name
  FOR ALL
  USING (is_member_of(project_id));
```

The `is_member_of()` function checks:
```sql
EXISTS (
  SELECT 1 FROM user_projects
  WHERE user_id = get_session_user()
  AND project_id = $1
)
```

## Critical Rules

1. **Never insert data without `project_id`** — RLS will hide it (NULL project_id matches nothing).
2. **Always pass `project_id` in hooks** — `useProjectId()` provides it.
3. **Preventive triggers exist** — Migration `20260214000000_preventive_project_id_triggers.sql` auto-rejects inserts with NULL project_id.
4. **Switching projects** invalidates all React Query caches.

## Files
- `hooks/use-project-id.ts` — Provides active project_id
- `lib/auth-context.tsx` — Stores active project in state
- Migrations: `20260213000000`, `20260213001`, `20260213002`

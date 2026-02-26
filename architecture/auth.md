# SOP: Authentication

## Overview
Custom auth system. **NOT Supabase Auth.**

## Flow

```
Login Page
  → User enters email + password
    → RPC: authenticate(email, password)
      → bcrypt.verify against users.password_hash
        → Creates session in sessions table (UUID token, 30-day expiry)
          → Returns { session_token, user }
            → Client stores token in localStorage as "dalio_session_token"
              → Supabase client configured with x-session-token header
```

## Session Management

| Action | Implementation |
|--------|---------------|
| **Store token** | `localStorage.setItem("dalio_session_token", token)` |
| **Send token** | Supabase client sets `x-session-token` global header |
| **Validate** | RPC `validate_session()` on page load — extends expiry |
| **Extract user** | PL/pgSQL `get_session_user()` reads from `current_setting('request.headers')` |
| **Logout** | Delete session row + clear localStorage + `resetSupabaseClient()` |

## Critical Gotchas

1. **Supabase client is a singleton.** After login/logout, call `resetSupabaseClient()` to pick up the new header.
2. **Session expiry is sliding** — 30 days from last `validate_session()` call.
3. **RLS depends on this.** The `get_session_user()` function is used in all RLS policies. If the header is missing, no data is returned.

## User Roles

- `system_role = 'admin'` — Can see admin page, manage users, see all projects
- `system_role = 'user'` — Standard access, project-scoped

## Files

- `lib/auth-context.tsx` — AuthProvider, login/logout/register functions
- `lib/supabase.ts` — Singleton client with header injection
- Migration: `20260213000000_users_projects_auth.sql`

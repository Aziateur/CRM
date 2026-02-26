# findings.md — Research, Discoveries & Constraints

> Append-only log. Store discoveries here as they emerge.

---

## 2026-02-20 — Codebase Coherence Audit

### Findings

1. **Outcome strings were hardcoded in 15+ files.** If anyone renamed "Meeting set" → "Meeting Booked", dashboards would silently break. **Fixed:** Centralized `OUTCOMES` config in `lib/store.ts`.

2. **Stage fallback `"New"` was hardcoded in 7 places.** The `stage` column was nullable, so every consumer needed `lead.stage || "New"`. **Fixed:** DB migration to make `stage NOT NULL DEFAULT 'New'` + `DEFAULT_STAGE` constant.

3. **5 dead files existed** — hooks and components that were superseded but never deleted. Caused confusion about which implementation to use. **Fixed:** Deleted.

4. **4 dead constants** in `lib/store.ts` — `segmentOptions`, `constraintOptions`, `nextActionOptions`, `whatMatteredMostOptions`. Replaced by dynamic DB queries. **Fixed:** Removed.

5. **Decorative emojis** (🧪, 🔼, 🔽, etc.) used as UI icons in 5 files. Inconsistent with the Lucide icon system used everywhere else. **Fixed:** Replaced with Lucide components.

6. **Review Analytics page** had no sidebar link. **Fixed:** Added to AppSidebar.

7. **Segment field** was not editable after lead creation in the lead drawer. **Fixed:** Added segment selector dropdown.

### Constraints Discovered

- **Static export** — No server-side rendering. All data fetching is client-side via Supabase JS SDK. This means no SSR-based auth, no API routes (except the webhook).
- **Custom auth, not Supabase Auth** — Can't use Supabase's built-in auth hooks or `supabase.auth.getUser()`.
- **RLS depends on `x-session-token` header** — The Supabase client singleton must be reset after login/logout.
- **Multi-tenancy via `project_id`** — Every query must filter by project_id or RLS will hide the data.
- **N8N is external** — No programmatic API access without paid plan. Webhooks only.

---

## 2026-02-19 — Cascade Delete Audit

### Finding
Foreign key relationships across 12+ tables were missing `ON DELETE CASCADE`. Deleting a project or lead would fail with FK constraint errors. **Fixed:** Migration `20260219000001_fix_all_missing_cascades.sql`.

---

## Template for Future Entries

```markdown
## YYYY-MM-DD — Title

### Finding
What was discovered.

### Impact
What breaks or could break.

### Resolution
What was done. Reference migration or commit.
```

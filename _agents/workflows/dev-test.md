---
description: How to test CRM features in-browser without creating new accounts or wasting time
---

# Dev Testing Protocol

## RULE #1: ONE SERVER, ONE PORT
// turbo
Before ANYTHING, kill all existing dev servers and start fresh on port 3000:
```bash
lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null; cd "/Users/alielhallaoui/Desktop/Projects & Tech/CRM" && rm -rf .next && npm run dev
```
Wait for "Ready" in the output. The port will be **3000** (guaranteed since we killed everything).

## RULE #2: NO LOGIN REQUIRED
This app has **no auth middleware, no login page, no sign-in**. It uses a Supabase anon key.
- **NEVER** type credentials, never look for a login form
- If you see a login screen, you are on the **WRONG PORT** or a **STALE PAGE**
- Always navigate to a fresh URL on port 3000

## RULE #3: NEVER REUSE BROWSER CONTEXT
- **NEVER** pass `ReusedSubagentId` — always start a fresh subagent
- Old page IDs point to dead ports — they will 500

## URLs (always port 3000)
- Settings/KB Config: `http://localhost:3000/settings` → then click "KB Config" tab
- Main leads page: `http://localhost:3000/`
- Playbook: `http://localhost:3000/playbook`
- Dashboard: `http://localhost:3000/dashboard`

## Testing Sequence
1. **Build check first** (// turbo):
```bash
cd "/Users/alielhallaoui/Desktop/Projects & Tech/CRM" && npx next build 2>&1 | tail -5
```
2. **Kill + restart dev server** (see Rule #1)
3. **Browser test** — fresh subagent, port 3000, NO login
4. **If test fails** — check terminal output for errors, fix code, repeat from step 1

## DB Quick-Check
```bash
cd "/Users/alielhallaoui/Desktop/Projects & Tech/CRM" && node -e '
const { Client } = require("pg");
const c = new Client({ connectionString: "postgresql://postgres:Aztere395733%40@db.syyrrgxqiqdsmaiiapnw.supabase.co:5432/postgres", ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  // YOUR QUERY HERE
  await c.end();
}).catch(e => { console.error(e.message); process.exit(1); });
'
```

## Common Gotchas
- `next build` invalidates `.next` → dev server crashes → MUST restart
- Port occupied = old process still alive → kill first
- `confirm()` dialogs don't work in browser subagent → use React `<AlertDialog>`
- Project ID: `6983c3d7-faa0-40f4-a662-383d645667a7`

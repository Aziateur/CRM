---
description: Pushes the current state of the workspace to the GitHub sandbox branch with safety checks
---

This workflow ensures the code is production-ready before pushing to the `sandbox` branch for testing. It includes checks for build failures, sub-agent hallucinations (missing links), and file corruption (markdown backticks).

// turbo
1. Run local build check
   `npm run build`
   *If this fails, do NOT push. Fix the errors first.*

2. Sanity Check: Inspect `components/app-sidebar.tsx`
   - Ensure the file does NOT start or end with markdown backticks (```).
   - Verify that core links (Leads, Dashboard, Playbook, Dial Session, Batch Review) are present.

// turbo
3. Stage all changes
   `git add .`

4. Commit changes
   `git commit -m "chore: optimized build and verified navigation integrity"`

// turbo
5. Push to remote sandbox
   `git push origin sandbox`

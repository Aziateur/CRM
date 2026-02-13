---
description: Pushes the current state of the workspace to the GitHub sandbox branch
---

This workflow automates the process of staging, committing, and pushing changes to the `sandbox` branch for testing.

// turbo
1. Stage all changes
   `git add .`

2. Commit changes with a descriptive message
   `git commit -m "feat: production standard updates, admin panel, and profile management"`

// turbo
3. Ensure we are on the sandbox branch
   `git checkout sandbox || git checkout -b sandbox`

// turbo
4. Push to remote sandbox
   `git push origin sandbox`

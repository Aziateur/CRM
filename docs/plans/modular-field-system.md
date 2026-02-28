---
PLAN: "Modular Field System Architecture"
STATUS: COMMIT
CONFIDENCE: 1.0

CTX:
  GOAL: "Reinvent the CRM field system to be 100% modular. Eliminate hardcoded 'system'/'column' fields so any field (e.g., phone, email) can be configured, masked, relayouted, or deleted."
  CONSTRAINTS:
    - "Must support legacy data migration gracefully (Postgres columns vs JSONB)."
    - "UI must render forms/tables completely dynamically based on field_definitions."
    - "Must retain high performance client-side data fetching."
  NON_GOALS:
    - "Building a full relational EAV system with joined tables (sticking to JSONB for performance per Supabase best practices)."
    - "Removing the underlying native Postgres columns (they stay for backend efficiency, UI just routes to them dynamically)."

CHALLENGE:
  RISKS:
    - RISK: "Deleting 'phone' or 'email' breaks core backend functions (dialer, email syncer)."
      SEVERITY: HIGH
      MITIGATION: "Backend functions still read from the native columns. The field_definition deletion only hides it from the UI. If a user deletes 'phone', they cannot edit it, but integrations can still write to it."
    - RISK: "Lost data if a user deletes a field and recreates it."
      SEVERITY: MEDIUM
      MITIGATION: "Data isn't deleted from the DB when a field definition is deleted (it stays in the native column or custom_fields JSONB). Recreating a field with the same `field_key` restores visibility to the data."
  ASSUMPTIONS:
    - ASSUMPTION: "JSONB operations on custom_fields are fast enough for the frontend."
      VALIDATED: YES
      EVIDENCE: "Supabase JS client parses JSONB natively, and standard Postgres indexing handles JSONB perfectly. Verified in existing CRM limits."
  ALTERNATIVES_REJECTED:
    - APPROACH: "Pure EAV Tables (Fields table, Values table linked by Lead ID)."
      REASON: "Massive performance hit on SELECT queries. Requires complex JOINs on every page load. JSONB is significantly faster and natively supported by Supabase."

DESIGN:
  ARCHITECTURE: "Metadata-Driven UI. `field_definitions` is the absolute source of truth. The UI has zero hardcoded inputs. When saving, a static frontend map (`NATIVE_COLUMNS`) routes updates either to root DB columns or the `custom_fields` JSONB."
  KEY_DECISIONS:
    - DECISION: "Drop `source`, `is_promoted` tags."
      RATIONALE: "Treat all fields equally in the UI. A field is a field."
      REVERSIBLE: YES
    - DECISION: "Hard-delete field_definitions when user clicks delete."
      RATIONALE: "Simpler state management. The user wants full control to remove things."
      REVERSIBLE: YES
  PHASES:
    - ID: 1
      NAME: "Database & Type Unification"
      OBJECTIVE: "Remove tags (source, promoted) from types and schema."
      DELIVERABLES:
        - "Modify `lib/store.ts` to remove `FieldSource`."
        - "Remove tag badges from `lead-form-tab.tsx`."
      DEPENDENCIES: []
      ESTIMATED_SCOPE: SMALL
    - ID: 2
      NAME: "Unrestricted Settings UI"
      OBJECTIVE: "Allow deletion of any field and apply universal drag-and-drop."
      DELIVERABLES:
        - "Remove `SYSTEM_FIELD_KEYS` protection in Settings."
      DEPENDENCIES: [1]
      ESTIMATED_SCOPE: SMALL
    - ID: 3
      NAME: "Dynamic Form Rendering"
      OBJECTIVE: "Replace hardcoded inputs in Lead Drawer with a purely dynamic loop."
      DELIVERABLES:
        - "Rewrite `lead-drawer.tsx` to map over `field_definitions` based on section and position."
        - "Rewrite Add Lead dialog to be completely dynamic."
      DEPENDENCIES: [1, 2]
      ESTIMATED_SCOPE: LARGE
---

# ADR-0001: Metadata-Driven Fully Modular Field System

## Status
PROPOSED

## Context
The user found the Promoted vs Native vs Custom tags confusing and restrictive. They want total control to delete, move, and modify any field, including core fields like phone and email. They referenced open-source modular CRMs (like Twenty) which use purely metadata-driven architectures.

## Decision
We are moving from a partially hardcoded schema (where core fields get special UI treatments) to a **100% metadata-driven UI**.
1. The `field_definitions` table is the sole dictator of what appears in the UI.
2. If `field_definitions` is empty, the lead form is empty.
3. We will remove all special "System/Native/Custom/Column" tags.
4. Data routing: The frontend saves to PosgreSQL native columns if the `field_key` matches a known reserved column (e.g. `email`), and routes all other keys into the `custom_fields` JSONB object. This gives the user total control over the UI, without breaking the hard SQL schema required by external integrations.

## Consequences
- The UI becomes drastically simpler and more unified.
- The user can accidentally delete "email", hiding it from the UI. However, this is non-destructive to the DB itself. Re-adding the field restores the data.
- Creating the "Add Lead" dialog becomes slightly more complex, as it must dynamically render instead of using static React `<Input>` fields.

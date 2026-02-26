# Intelligence Architecture — Full Technical Handoff

> Written 2026-02-24. For a receiving AI to redesign the ICP/Segments and Industry Intel framework.

---

## Table of Contents
1. [What's Great: The Investigation System](#1-whats-great-the-investigation-system)
2. [What's Broken: ICP & Segments + Industry Intel](#2-whats-broken-icp--segments--industry-intel)
3. [Database Schema (Actual Tables)](#3-database-schema-actual-tables)
4. [The "3 Altitudes" Framework (Current State)](#4-the-3-altitudes-framework-current-state)
5. [Component Architecture](#5-component-architecture)
6. [Known Deficiencies & Design Smells](#6-known-deficiencies--design-smells)
7. [What Needs to Change](#7-what-needs-to-change)

---

## 1. What's Great: The Investigation System

The Intelligence Incubator is the signal → analysis → deployment pipeline. It works well.

### The Flow
```
Rep flags something during a call
       ↓
Signal lands in `script_inbox` (status: "pending")
       ↓
Manager sees it in the Signal Feed (Workspace 1)
       ↓
Three choices:
  ├── DISCARD   → status: "discarded" (noise)
  ├── QUICK DEPLOY → status: "quick_deployed" (obvious fix, inline 4-pillar form)
  └── INCUBATE  → status: "incubating", investigation_id set (needs deeper analysis)
       ↓
Investigation Detail (Workspace 2+3)
  ├── Evidence Board (pinned signals)
  ├── Scratchpad (hypothesis, deep notes, auto-saves)
  └── Deployment Matrix (Workspace 3)
       ↓
Execute Cascade → writes to multiple pillars simultaneously:
  • KB Entry (Offer or Market)
  • Script Section (Messaging)
  • Drill (Operator)
  • Stop Signal (if applicable)
       ↓
Investigation crystallized → deployment_receipt stored as JSONB
       ↓
Appears in Proven Concepts archive (Company Lore)
```

### Why It Works
- **Single Source of Truth**: One `investigations` table with clear status machine (open → crystallized, or open → archived)
- **Chain of Custody**: `deployment_receipt` JSONB records exactly what was deployed, when, and to which pillars
- **Natural separation**: Signals in the inbox are ephemeral inputs. Investigations are persistent analysis containers. Proven Concepts are the permanent record.
- **The "4 Pillars" are well-defined**: Offer, Market, Messaging, Operator — each has a distinct write target in the system.

### Data Model
```sql
-- investigations table
CREATE TABLE investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',        -- open | crystallized | archived
    hypothesis TEXT,
    scratchpad TEXT,
    priority TEXT DEFAULT 'medium',              -- low | medium | high | critical
    deployment_receipt JSONB,                    -- [{type, id, label}, ...]
    crystallized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- script_inbox links to investigations
ALTER TABLE script_inbox ADD COLUMN investigation_id UUID REFERENCES investigations(id);
-- Status values: pending | incubating | deployed | quick_deployed | discarded
```

### Key Files
- `lib/investigations.ts` — all config, types, statuses, pillar definitions
- `hooks/use-investigations.ts` — CRUD, crystallize, unpin mutations
- `hooks/use-playbook-engine.ts` — script_inbox queries + incubation mutations
- `components/incubator/` — 8 component files (hub, feed, cards, detail, deploy matrix, etc.)

---

## 2. What's Broken: ICP & Segments + Industry Intel

### The Theoretical Framework (What the Owner Wants)

The owner defined "3 Altitudes of Market Reality":

| Altitude | Name | What Belongs Here | Scope |
|----------|------|-------------------|-------|
| **1** | **Industry** (The Macro Arena) | Market trends, regulations, competitor landscapes, macro business models | Affects ALL segments. Segment-agnostic. |
| **2** | **Segment** (The Business Container) | Company size, revenue range, tech stack, value prop, how their business works, pricing, buying process | Per-segment. Firmographic + business intel. |
| **3** | **ICP** (The Human Persona) | Psychology: mindset notes, language bank, personal pains, fears, decision-making criteria | Per-segment. Pure human psychology. |

### What We Actually Built (The Problem)

We have **two separate storage systems** that don't know about each other, and neither one properly implements the altitude model.

#### Storage System A: `kb_entries` + `kb_categories` (Used by Industry Intel tab)
```
kb_categories table:
  id, name, icon, display_mode, sort_order, is_active, show_in_prep, project_id

kb_entries table:
  id, category_id (FK → kb_categories), title, content, tags[],
  segment_filter (nullable TEXT — just a segment ID string!),
  stage_filter, industry_filter,
  source_attempt_ids[], is_pinned, sort_order, project_id
```
**Problem**: `kb_entries` is a flat bucket. It has a `category_id` pointing to `kb_categories` AND an optional `segment_filter` text column. But the "categories" used to route entries are NOT `kb_categories` — they're actually rows in the `categories` table with type `intel_category`. The `category_id` on `kb_entries` points to `kb_categories.id`, but the UI uses `intel_category` categories for display/grouping. **There is a naming collision between `kb_categories` (the legacy table) and `categories` WHERE type = 'intel_category'.**

The **Industry Intel tab** (`kb-industry-tab.tsx`) renders entries from `kb_entries`. I patched it to only show Altitude-1 categories, but the underlying data model doesn't enforce this. A `kb_entry` tagged to "How Their Business Works" (altitude 2) and `segment_filter = null` will STILL show up everywhere because nothing gates altitude at the query level.

#### Storage System B: `segment_entries` + `icp_fields` + `icp_values` (Used by ICP & Segments tab)
```
segment_entries table:
  id, project_id, segment_id (FK → segment category), 
  section_type_id (FK → segment_section_type category),
  title, content, source, tags[], is_pinned, sort_order

icp_fields table:
  id, project_id, field_name, field_type, sort_order, is_active

icp_values table:
  id, project_id, segment_id, field_id (FK → icp_fields), value
```

**The ICP & Segments tab has THREE sub-zones:**

**Zone 1: Segment Shell (Firmographics)** — uses `icp_fields` + `icp_values`
- 4 hardcoded-ish field names: "Target Company Size", "Revenue Range", "Key Decision Makers", "Our Value Prop"
- These are per-segment key-value pairs
- Stored in their own two tables (`icp_fields` defines the field, `icp_values` stores the value per segment)
- `FORBIDDEN_FIELD_NAMES` blocklist prevents names like "objections" from appearing here

**Zone 1.5: Altitude 2 Intel (added recently)** — uses `kb_entries` (Storage System A!)
- I bolted this on to show Altitude-2 intel_categories per segment
- It queries ALL `kb_entries`, filters by `categoryId` matching altitude-2 categories, then further filters by `segmentFilter === segmentId`
- **Problem**: This is reading from Storage System A inside a UI built around Storage System B. Two different storage backends rendering side-by-side.

**Zone 2: Human ICP (Psychology)** — uses `segment_entries` (Storage System B)
- Section types from `categories WHERE type = 'segment_section_type'`: Language Bank, Mindset Notes, Pain Points
- Each section type is a collapsible with `segment_entries` filtered by `segment_id + section_type_id`

### The Segment Selector (Left Panel)

Segments are rows in `categories WHERE type = 'segment'`. Currently:
- Unknown, Trucking, Home Services, Construction, Other
- Tutoring — Med School, Tutoring — Music, Tutoring — Languages, Tutoring — Test Prep, Tutoring — General

Each segment has: id, name, slug, icon, color, description, metadata JSONB.

The left panel shows the list. Clicking a segment loads its `SegmentProfile` on the right.

You can also add custom firmographic fields via a "+ Field" button that creates a row in `icp_fields`.

---

## 3. Database Schema (Actual Tables)

### `categories` (the universal polymorphic category table)
```
id          UUID PK
project_id  UUID NOT NULL
type        TEXT NOT NULL       -- LEGACY COLUMN, same value as category_type
category_type TEXT NOT NULL     -- 'segment' | 'intel_category' | 'segment_section_type' | 'root_cause_type' | etc.
name        TEXT
slug        TEXT
icon        TEXT
color       TEXT
description TEXT
sort_order  INT
is_active   BOOLEAN
metadata    JSONB DEFAULT '{}'  -- We store { altitude: 1|2 } here for intel_categories
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```
**Category types used for Market/ICP:**
- `segment` — the actual segments (Trucking, Tutoring-Music, etc.)
- `intel_category` — the intelligence buckets (Competitor Landscape, How Their Business Works, etc.)
- `segment_section_type` — the ICP psychology sections (Language Bank, Mindset Notes, Pain Points)

### `icp_fields` — defines firmographic field names
```
id          UUID PK
project_id  UUID
field_name  TEXT    -- "Target Company Size", "Revenue Range", etc.
field_type  TEXT    -- always "text" currently
sort_order  INT
is_active   BOOLEAN
```

### `icp_values` — stores firmographic values per segment
```
id          UUID PK
project_id  UUID
segment_id  UUID    -- FK → categories (type=segment)
field_id    UUID    -- FK → icp_fields
value       TEXT
```
**Relationship**: One `icp_value` per (segment × field) pair. Click-to-edit UI.

### `kb_entries` — the flat intel entry bucket
```
id                UUID PK
category_id       UUID           -- FK → kb_categories (NOT categories table!)
title             TEXT NOT NULL
content           TEXT
tags              TEXT[]
segment_filter    TEXT           -- nullable, stores a segment category ID as string
stage_filter      TEXT
industry_filter   TEXT
source_attempt_ids UUID[]
is_pinned         BOOLEAN
sort_order        INT
project_id        UUID
```
**Critical flaw**: `category_id` references `kb_categories`, but the UI groups entries by `intel_category` categories. The mapping is implicit and fragile.

### `kb_categories` — legacy category table for KB
```
id                UUID PK
name              TEXT
icon              TEXT
display_mode      TEXT    -- 'bullets' | 'paragraphs'
sort_order        INT
is_active         BOOLEAN
show_in_prep      BOOLEAN
custom_fields_schema JSONB
project_id        UUID
```
**This table exists separately from `categories`**. It was the original knowledge base structure. The `kb_entries.category_id` FK points here. But the Industry Intel UI uses `categories WHERE type = 'intel_category'` for grouping and display. The two are NOT connected by a foreign key.

### `segment_entries` — psychology entries per segment
```
id              UUID PK
project_id      UUID
segment_id      UUID    -- FK → categories (type=segment)
section_type_id UUID    -- FK → categories (type=segment_section_type)
title           TEXT
content         TEXT NOT NULL
source          TEXT
tags            TEXT[]
is_pinned       BOOLEAN
sort_order      INT
```
**This is the clean table.** Proper FKs, proper scoping by segment + section type. This is what the Human ICP zone uses.

---

## 4. The "3 Altitudes" Framework (Current State)

### How It's Implemented (Poorly)

The altitude routing is done purely at the **component level** with hardcoded slug sets:

```typescript
// In kb-industry-tab.tsx (Altitude 1 only)
const ALTITUDE_1_SLUGS = new Set([
    "competitor-landscape",
    "market-trends-conditions", 
    "regulations-compliance",
])
const filteredIntelCategories = intelCategories.filter(c => {
    const alt = c.metadata?.altitude
    if (alt !== undefined) return Number(alt) === 1
    return ALTITUDE_1_SLUGS.has(c.slug)
})

// In kb-icp-tab.tsx (Altitude 2 only)
const ALTITUDE_2_SLUGS = new Set([
    "how-their-business-works",
    "pricing-deal-intelligence",
    "technology-tools-they-use",
    "technology-tools",
    "buying-process-decision-chain",
])
```

We tagged the `categories.metadata` with `{"altitude": 1}` or `{"altitude": 2}` in the database, but:
1. No migration enforces this — new categories default to `{}` 
2. There's a fallback to the hardcoded slug sets
3. There's no query-level enforcement — the DB will happily return entries from any altitude
4. If someone creates a new intel_category via the UI, it has no altitude tag and falls through

### The Segment Filter Problem (on kb_entries)

`kb_entries.segment_filter` is a TEXT column that optionally stores a segment category ID. When I render Altitude 2 intel on the ICP tab, I filter:

```typescript
const segmentEntries = entries.filter(e => {
    if (!e.categoryId || !catIds.has(e.categoryId)) return false
    return e.segmentFilter === segmentId || !e.segmentFilter
})
```

**Problem**: An entry with `segment_filter = null` shows up for ALL segments. There's no enforcement that Altitude-2 entries MUST have a segment_filter.

---

## 5. Component Architecture

### Tab: "ICP & Segments" (`components/kb-icp-tab.tsx`)
```
KbIcpTab (main)
  ├── Left Panel: Segment list (from categories type=segment)
  │     └── + Field button (creates icp_fields)
  ├── Right Panel: SegmentProfile
  │     ├── Zone 1: IcpProfileEditor (Segment Shell)
  │     │     └── Renders icp_fields × icp_values for this segment
  │     ├── Zone 1.5: Altitude2IntelZone (BOLTED ON)
  │     │     └── Queries kb_entries filtered by altitude-2 categories + segment_filter
  │     └── Zone 2: Human ICP
  │           └── SegmentSection × N (segment_entries by section_type)
  │                 └── Language Bank, Mindset Notes, Pain Points
```

### Tab: "Industry Intel" (`components/kb-industry-tab.tsx`)
```
KbIndustryTab (main)
  ├── Left Panel: Intel category sidebar (filtered to Altitude 1 only)
  │     └── CategoryListItem × N
  ├── Right Panel: Entries grouped by category
  │     └── CategoryGroup → IntelEntryCard × N
  └── Dialog: IntelDialog (add/edit entries)
```

### Tab: "Playbook" → Intelligence Incubator (`components/incubator/incubator-hub.tsx`)
```
IncubatorHub
  ├── Tab "Signal Feed": SignalFeed
  │     ├── SignalCard × N (with action buttons)
  │     ├── QuickDeployForm (inline 4-pillar)
  │     └── IncubatePopover (pick/create investigation)
  ├── Tab "Investigations": InvestigationList → InvestigationDetail
  │     ├── Evidence Board (pinned signals as SignalCards)
  │     ├── Scratchpad (auto-saving textarea + hypothesis)
  │     └── DeploymentMatrix (cascade deploy)
  └── Tab "Proven Concepts": ProvenConceptsArchive
        └── Read-only crystallized investigation cards with receipts
```

---

## 6. Known Deficiencies & Design Smells

### 🔴 Critical
1. **Two storage backends operating in the same UI**: `kb_entries` (flat bucket) and `segment_entries` (properly scoped) render side-by-side on the ICP tab. Different CRUD paths, different hooks, different assumptions.

2. **`kb_entries.category_id` → `kb_categories.id` but UI uses `categories.type='intel_category'`**: There is no FK between the two systems. The `IntelDialog` when saving a NEW entry does `addEntry.mutate({ categoryId: firstKbCat.id })` — it uses the FIRST `kb_categories` row, not the selected `intel_category`. The grouping in the sidebar is done via `intel_category` category slugs, but the actual data FK points elsewhere.

3. **Altitude routing is a frontend filter, not a data contract**: Nothing in the DB prevents an Altitude-1 entry from being displayed on the ICP tab, or an Altitude-2 entry showing on the Industry tab. It's all string matching in React.

4. **No "Industry" entity**: The framework says "Industry" is above Segment — but we have no `industry` category type. "Tutoring" is an industry. "Tutoring — Med School" is a segment within it. Currently, there's no industry-level container. The Industry Intel tab is just a flat list of entries with no concept of which industry they belong to.

### 🟡 Moderate
5. **`icp_fields` is a separate table from `categories`**: Firmographic field definitions live in `icp_fields` (their own table), while psychology sections live in `categories (type=segment_section_type)`. Two different meta-definition systems for what is conceptually the same thing: "a named bucket of data about a segment."

6. **`segment_filter` is a raw TEXT column**: On `kb_entries`, it stores a segment category ID as a plain string, not a proper FK. No referential integrity.

7. **Duplicate segment_section_types**: The DB has two rows for "Pain Points" with the same slug but different IDs.

8. **`kb_entries` has `stage_filter` and `industry_filter` columns that are never used in the UI**.

### 🟢 Minor
9. **"Objection Patterns" is still in the `intel_category` rows**: Tagged as altitude 0 and filtered out, but not deleted.

10. **The `+ Field` button on the ICP tab lets you create any field name**: Including ones that should be intel categories, not firmographic fields. There's a `FORBIDDEN_FIELD_NAMES` blocklist but it's a band-aid.

---

## 7. What Needs to Change

The receiving AI should redesign the theoretical framework to answer these questions:

### Architecture Questions
1. **Should `kb_entries` and `segment_entries` be unified into a single table?** They currently do similar things with different schemas. Or should they remain separate with clear ownership boundaries?

2. **Should we add an `industry` category type?** If "Tutoring" is the industry and "Tutoring — Med School" is the segment, do we need `categories WHERE type = 'industry'` with segments having a parent FK?

3. **Should altitude be a first-class column instead of JSONB metadata?** e.g. `ALTER TABLE categories ADD COLUMN altitude INT` for `intel_category` rows.

4. **Should the `kb_categories` table be deleted?** And `kb_entries.category_id` re-pointed to `categories.id` where `type = 'intel_category'`? Right now there are TWO category tables and it's confusing.

5. **Should `icp_fields` be merged into `categories`?** "Target Company Size" as a firmographic field and "Language Bank" as a psychology section are both "named data containers about a segment." Could they be unified under `categories WHERE type = 'segment_field'` with a sub-type distinguishing firmographic vs. psychology?

6. **Should `segment_filter` on `kb_entries` become a proper FK?** And should Altitude-2 entries be REQUIRED to have a segment FK?

### User Experience Questions
7. **When a rep discovers intel on a call, how does the system know which altitude to route it to?** Currently the Signal Feed's 4-pillar model has "Market" as one pillar, but Market can be Altitude 1 (industry-wide) or Altitude 2 (segment-specific). How does the triage form expose this choice?

8. **Should the Industry Intel tab show cascading warnings to segments?** The owner's example: "A new federal compliance law is passing → Route to Industry Intel → This should cascade down to warn all segments within that industry." We have no cascade mechanism.

9. **In the Deployment Matrix, how does the deploy-to-Market action decide altitude?** Currently it writes a `kb_entry` but doesn't distinguish between macro intel and segment-scoped intel.

---

## Summary for the Receiving AI

**Keep**: The investigation system, signal inbox pipeline, deployment matrix, proven concepts archive. These are solid.

**Redesign**: The entire Market & ICP data architecture. The core issue is that two storage systems (`kb_entries` and `segment_entries`) evolved independently and were duct-taped together with frontend filters. The "3 Altitudes" framework is a good theoretical model but it's enforced by hardcoded slug sets in React components, not by the database schema or API queries.

**The goal**: A unified data model where altitude routing is a database-level concern, not a UI filter. Where adding a new intel category automatically knows whether it's macro or segment-scoped. Where segment_entries and kb_entries don't compete for the same conceptual space.

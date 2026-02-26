# Intelligence Graph Redesign — Implementation Plan

> Principal Database Architect's blueprint for unifying the ICP/Segments + Industry Intel data model under the 3 Altitudes framework.

---

## 0. Executive Summary

### The Problem (One Sentence)
Two independent storage systems (`kb_entries` and `segment_entries + icp_fields + icp_values`) render side-by-side on the ICP tab, with "altitude routing" faked by hardcoded slug lists in React components instead of enforced by the database.

### The Solution (One Sentence)
Replace both systems with a single `intel_entries` table that enforces altitude routing via `CHECK` constraints, add a first-class `industry` category type with a `parent_id` column on `categories` for the Industry → Segment hierarchy, and unify all intel category definitions into the existing `categories` table.

### The Invariant (Never Break)
The Investigation System (signal inbox → investigation → deployment matrix → crystallize) stays untouched. Its state machine, JSONB receipts, and status flow are not modified. Only its **write targets** change: instead of `kb_entries`, the Market pillar writes to `intel_entries`.

---

## 1. The Unified Schema

### 1A. Add Industry → Segment Hierarchy to `categories`

**What changes:** One new column on `categories`, plus new seed rows.

```sql
-- Add self-referencing parent FK for hierarchy
ALTER TABLE categories
ADD COLUMN parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create Industry-level container categories
-- (Existing segments get parent_id set to their industry)
```

**New category type:** `industry`

| Slug | Name | Type |
|------|------|------|
| `tutoring` | Tutoring | industry |
| `blue-collar` | Blue-Collar Services | industry |

**Updated segment linkage:**

| Segment | parent_id → Industry |
|---------|---------------------|
| Tutoring — Med School | → `tutoring` |
| Tutoring — Music | → `tutoring` |
| Tutoring — General | → `tutoring` |
| Trucking | → `blue-collar` |
| Construction | → `blue-collar` |
| Home Services | → `blue-collar` |

**Why this matters:** Altitude 1 entries are scoped to an Industry. Without a parent relationship, we can't cascade industry-level intel down to all segments under it.

---

### 1B. Canonicalize Intel Categories

**What changes:** Elevate `altitude` from JSONB metadata to a first-class column on `categories`. Add `cardinality` for firmographic single-value fields.

```sql
ALTER TABLE categories
ADD COLUMN altitude SMALLINT,        -- 1, 2, or 3 (NULL for non-intel types)
ADD COLUMN cardinality TEXT;          -- 'single' | 'multi' (NULL for non-intel types)
```

**The Canonical Intel Category Registry:**

| Category | Altitude | Cardinality | Current Home |
|----------|----------|-------------|-------------|
| **Competitor Landscape** | 1 | multi | `categories (intel_category)` ✅ |
| **Market Trends & Conditions** | 1 | multi | `categories (intel_category)` ✅ |
| **Regulations & Compliance** | 1 | multi | `categories (intel_category)` ✅ |
| **How Their Business Works** | 2 | multi | `categories (intel_category)` ✅ |
| **Pricing & Deal Intelligence** | 2 | multi | `categories (intel_category)` ✅ |
| **Technology & Tools They Use** | 2 | multi | `categories (intel_category)` ✅ |
| **Buying Process & Decision Chain** | 2 | multi | `categories (intel_category)` ✅ |
| **Target Company Size** | 2 | **single** | `icp_fields` ❌ (separate table) |
| **Revenue Range** | 2 | **single** | `icp_fields` ❌ (separate table) |
| **Key Decision Makers** | 2 | **single** | `icp_fields` ❌ (separate table) |
| **Our Value Prop** | 2 | **single** | `icp_fields` ❌ (separate table) |
| **Language Bank** | 3 | multi | `categories (segment_section_type)` ✅ |
| **Mindset Notes** | 3 | multi | `categories (segment_section_type)` ✅ |
| **Pain Points** | 3 | multi | `categories (segment_section_type)` ✅ |

**Key decisions:**
- Firmographic fields (`icp_fields` rows) become `categories WHERE type = 'intel_category' AND altitude = 2 AND cardinality = 'single'`.
- Psychology sections (`segment_section_type`) become `categories WHERE type = 'intel_category' AND altitude = 3`.
- All intel categories share a single type: `intel_category`. The `altitude` column is the discriminator.
- The old `segment_section_type` category type is deprecated (existing rows migrated to `intel_category` with `altitude = 3`).

**The Execution Ban:** "Objection Patterns" (currently `altitude = 0`) is either deleted or moved to a `messaging_category` type. It does NOT get an altitude. It is not market intelligence.

---

### 1C. The Unified `intel_entries` Table

**This replaces:** `kb_entries` (for market intel), `segment_entries`, and `icp_values`.

```sql
CREATE TABLE intel_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),

    -- ═══ THE ROUTING CONTRACT ═══
    altitude        SMALLINT NOT NULL CHECK (altitude IN (1, 2, 3)),
    industry_id     UUID REFERENCES categories(id),  -- required for Alt 1
    segment_id      UUID REFERENCES categories(id),  -- required for Alt 2 & 3

    -- What kind of intel
    intel_category_id UUID NOT NULL REFERENCES categories(id),

    -- Content
    title           TEXT,                              -- nullable for single-value fields
    content         TEXT NOT NULL DEFAULT '',
    tags            TEXT[] DEFAULT '{}',
    source          TEXT,                              -- "call_123", "manual", etc.
    source_attempt_ids UUID[] DEFAULT '{}',

    -- Display & Prep
    is_pinned       BOOLEAN DEFAULT false,
    sort_order      INT DEFAULT 0,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- ═══ ALTITUDE ENFORCEMENT (Database-level) ═══
    
    -- Alt 1 MUST have industry, MUST NOT have segment
    CONSTRAINT alt1_needs_industry 
        CHECK (altitude != 1 OR industry_id IS NOT NULL),
    CONSTRAINT alt1_no_segment 
        CHECK (altitude != 1 OR segment_id IS NULL),

    -- Alt 2 & 3 MUST have segment
    CONSTRAINT alt23_needs_segment 
        CHECK (altitude NOT IN (2, 3) OR segment_id IS NOT NULL),

    -- Single-value entries: one per (segment × category)
    -- Enforced by a UNIQUE partial index (below)
);

-- ═══ INDEXES ═══

-- Fast lookup by project + altitude (the primary query pattern)
CREATE INDEX idx_intel_entries_altitude 
    ON intel_entries (project_id, altitude);

-- Fast lookup by segment (ICP tab loads all entries for a segment)
CREATE INDEX idx_intel_entries_segment 
    ON intel_entries (project_id, segment_id) 
    WHERE segment_id IS NOT NULL;

-- Fast lookup by industry (Industry Intel tab loads all entries for an industry)
CREATE INDEX idx_intel_entries_industry 
    ON intel_entries (project_id, industry_id) 
    WHERE industry_id IS NOT NULL;

-- UNIQUE constraint for single-value fields:
-- Only ONE entry per (project × segment × category) for cardinality='single' categories
-- This replaces the old icp_values uniqueness guarantee
CREATE UNIQUE INDEX idx_intel_entries_single_value
    ON intel_entries (project_id, segment_id, intel_category_id)
    WHERE title IS NULL;  -- single-value entries have NULL title
```

**The Routing Contract in English:**

| Altitude | industry_id | segment_id | Enforced By |
|----------|-------------|------------|-------------|
| 1 (Macro) | **REQUIRED** | **MUST BE NULL** | CHECK constraint |
| 2 (Segment Shell) | derived from parent | **REQUIRED** | CHECK constraint |
| 3 (Human ICP) | derived from parent | **REQUIRED** | CHECK constraint |

**How single-value fields work:**
- Firmographic fields ("Target Company Size" = "50-200 employees") are `intel_entries` where `title IS NULL`.
- The `content` column holds the value.
- The UNIQUE partial index on `(project_id, segment_id, intel_category_id) WHERE title IS NULL` ensures exactly one value per segment per field.
- Multi-entry categories ("Language Bank") have `title IS NOT NULL` — each entry has its own title.

---

## 2. Data Migration Plan

### Phase 1: Schema Changes (Non-destructive)

```
Migration 001: Add parent_id, altitude, cardinality to categories
Migration 002: Create intel_entries table with constraints + indexes
Migration 003: Insert industry category rows, link segments via parent_id
Migration 004: Migrate intel_category altitude from metadata JSONB → altitude column
Migration 005: Migrate segment_section_type rows to intel_category with altitude=3
Migration 006: Migrate icp_fields rows to intel_category with altitude=2, cardinality='single'
```

### Phase 2: Data Migration (Copy, don't delete)

```
Migration 007: Copy segment_entries → intel_entries (altitude=3)
Migration 008: Copy icp_values → intel_entries (altitude=2, cardinality=single, title=NULL)
Migration 009: Copy kb_entries WHERE intel-category is altitude=1 → intel_entries (altitude=1)
Migration 010: Copy kb_entries WHERE intel-category is altitude=2 → intel_entries (altitude=2)
```

### Phase 3: Verification Checkpoint

Before dropping any tables:
- Run counts: `SELECT altitude, count(*) FROM intel_entries GROUP BY altitude`
- Compare to source table counts
- Run the app with dual-read (read from `intel_entries`, fall back to old tables)

### Phase 4: Cut Over (Drop old tables — LAST)

```
Migration 011: Drop icp_fields, icp_values (replaced by intel_entries + intel_category)
Migration 012: Drop segment_entries (replaced by intel_entries altitude=3)
Migration 013: Drop kb_categories (replaced by categories WHERE type='intel_category')
Migration 014: Drop amplitude/segment_filter/stage_filter/industry_filter from kb_entries
Migration 015: kb_entries remains ONLY for Offer-pillar knowledge (non-market intel)
```

**NOTE:** `kb_entries` is NOT fully deleted. It continues to serve the **Offer pillar** (product knowledge, feature notes, competitive positioning). Only <u>market intelligence</u> entries are migrated out. The Offer pillar deploy path (`addEntry.mutateAsync` in `investigation-detail.tsx` line 491-497) keeps writing to `kb_entries`.

---

## 3. Hook / API Layer Changes

### New Hooks

#### `hooks/use-intel.ts` — The single intelligence query hook

```typescript
// Query all intel_entries for a given altitude + scope
function useIntelEntries(altitude: 1 | 2 | 3, scopeId: string) → {
    // altitude=1: scopeId is industry_id
    // altitude=2 or 3: scopeId is segment_id
    entries, isLoading, addEntry, editEntry, removeEntry
}

// Query all intel categories for a given altitude
function useIntelCategories(altitude: 1 | 2 | 3) → {
    categories, singleValueCategories, multiEntryCategories
}
```

#### `hooks/use-industries.ts` — Industry hierarchy

```typescript
function useIndustries() → {
    industries,                       // categories WHERE type='industry'
    segmentsForIndustry(industryId),  // categories WHERE type='segment' AND parent_id=industryId
    addIndustry, editIndustry, removeIndustry
}
```

### Deprecated Hooks (Keep working during transition, then remove)

| Old Hook | Replaced By |
|----------|------------|
| `use-kb.ts` → `useKbEntries()` | `use-intel.ts` → `useIntelEntries(1\|2, ...)` (for Market) |
| `use-kb.ts` → `useKbCategories()` | Stays for Offer pillar only |
| `use-segment-entries.ts` | `use-intel.ts` → `useIntelEntries(3, segmentId)` |
| `use-icp.ts` → `useIcpFields()` | `use-intel.ts` → `useIntelCategories(2).singleValueCategories` |
| `use-icp.ts` → `useIcpValues()` | `use-intel.ts` → `useIntelEntries(2, segmentId)` filtered to single-cardinality |

---

## 4. Component Layer Changes

### Tab: "Industry Intel" (`kb-industry-tab.tsx`) → Altitude 1

**Before:** Queries `kb_entries`, filters by hardcoded `ALTITUDE_1_SLUGS`.
**After:** 
- Adds an **Industry selector** (left panel top) — pick which industry to view.
- Queries `useIntelEntries(1, selectedIndustryId)`.
- Category sidebar now comes from `useIntelCategories(1)`.
- **NO segment filter** (correct — already removed).
- When adding a new entry, the form automatically sets `altitude=1, industry_id=selectedIndustryId`.

### Tab: "ICP & Segments" (`kb-icp-tab.tsx`) → Altitudes 2 + 3

**Before:** Three bolted-together systems (icp_fields, kb_entries, segment_entries).
**After:**
- Left panel: Segment list stays the same, but segments are now grouped under their parent Industry.
- Right panel `SegmentProfile`:
  - **Zone 1 (Firmographics):** `useIntelEntries(2, segmentId)` filtered to `cardinality='single'` categories. Rendered as click-to-edit key-value pairs (same UX as current `IcpProfileEditor`).  
  - **Zone 2 (Segment Intel):** `useIntelEntries(2, segmentId)` filtered to `cardinality='multi'` categories. Same collapsible sections as current `Altitude2IntelZone`.
  - **Zone 3 (Human ICP):** `useIntelEntries(3, segmentId)`. Replaces `segment_entries` with identical UI.
- All three zones read from the SAME table. One hook, one cache key, one source of truth.

### Deployment Matrix → Altitude-Aware Market Deploy

**Before (lines 500-508 of investigation-detail.tsx):**
```typescript
// Market pillar writes to kb_entries via addEntry
const entry = await addEntry.mutateAsync({
    categoryId: marketCategory,
    title: marketTitle.trim(),
    content: marketContent.trim(),
})
```

**After:**
```typescript
// Market pillar asks: "Is this Altitude 1 (industry-wide) or Altitude 2 (segment-specific)?"
// The form now has an altitude radio + industry/segment picker
const entry = await addIntelEntry.mutateAsync({
    altitude: marketAltitude,               // 1 or 2
    industryId: marketAltitude === 1 ? selectedIndustry : undefined,
    segmentId: marketAltitude === 2 ? selectedSegment : undefined,
    intelCategoryId: marketCategory,
    title: marketTitle.trim(),
    content: marketContent.trim(),
})
receipt.push({ type: "intel_entry", id: entry.id, label: marketTitle.trim() })
```

**Offer pillar** continues writing to `kb_entries` unchanged. **Messaging** and **Operator** are untouched.

### Quick-Deploy Form → Same Altitude-Aware Change

The Quick-Deploy form's Market pillar gets the same treatment: an altitude picker before the category/title/content fields.

---

## 5. Task Breakdown (Execution Order)

### Wave 1: Foundation (Schema + Data) — No UI changes

| # | Task | Files | Risk |
|---|------|-------|------|
| 1.1 | Migration: `ALTER TABLE categories ADD COLUMN parent_id, altitude, cardinality` | `supabase/migrations/` | Low — additive only |
| 1.2 | Migration: `CREATE TABLE intel_entries` with all constraints + indexes | `supabase/migrations/` | Low — new table |
| 1.3 | Migration: Insert industry categories, link existing segments via `parent_id` | `supabase/migrations/` | Medium — data decision (which segments belong to which industry) |
| 1.4 | Migration: Populate `altitude` + `cardinality` on existing `categories` rows | `supabase/migrations/` | Low — we already tagged metadata |
| 1.5 | Migration: Convert `segment_section_type` → `intel_category` with altitude=3 | `supabase/migrations/` | Medium — changes category types |
| 1.6 | Migration: Convert `icp_fields` → `intel_category` with altitude=2, cardinality=single | `supabase/migrations/` | Medium — new paradigm |
| 1.7 | Migration: Copy all existing data into `intel_entries` | `supabase/migrations/` | High — biggest migration, needs verification |
| 1.8 | Update `lib/categories.ts` DEFAULT_SEEDS with altitude + cardinality | `lib/categories.ts` | Low |

### Wave 2: Data Layer (Hooks + Lib)

| # | Task | Files | Risk |
|---|------|-------|------|
| 2.1 | Create `lib/intel.ts` — CRUD functions for `intel_entries` | `lib/intel.ts` | Low |
| 2.2 | Create `hooks/use-intel.ts` — `useIntelEntries()`, `useIntelCategories()` | `hooks/use-intel.ts` | Low |
| 2.3 | Create `hooks/use-industries.ts` — Industry + Segment hierarchy | `hooks/use-industries.ts` | Low |
| 2.4 | Update `lib/query-keys.ts` — add intel + industry cache keys | `lib/query-keys.ts` | Low |
| 2.5 | Update `lib/investigations.ts` — add `intel_entry` to `DeploymentReceiptEntry` type | `lib/investigations.ts` | Low |

### Wave 3: UI — ICP & Segments Tab Rewrite

| # | Task | Files | Risk |
|---|------|-------|------|
| 3.1 | Rewrite `IcpProfileEditor` → reads from `useIntelEntries(2, segmentId)` single-cardinality | `kb-icp-tab.tsx` | Medium |
| 3.2 | Rewrite `Altitude2IntelZone` → reads from `useIntelEntries(2, segmentId)` multi-cardinality | `kb-icp-tab.tsx` | Medium |
| 3.3 | Rewrite `SegmentSection` → reads from `useIntelEntries(3, segmentId)` | `kb-icp-tab.tsx` | Medium |
| 3.4 | Add industry grouping to segment list (left panel) | `kb-icp-tab.tsx` | Low |
| 3.5 | Remove old hook imports (`use-icp`, `use-segment-entries`, `use-kb`) from ICP tab | `kb-icp-tab.tsx` | Low — cleanup |

### Wave 4: UI — Industry Intel Tab Rewrite

| # | Task | Files | Risk |
|---|------|-------|------|
| 4.1 | Add Industry selector to left panel | `kb-industry-tab.tsx` | Medium |
| 4.2 | Rewrite entries query → `useIntelEntries(1, selectedIndustryId)` | `kb-industry-tab.tsx` | Medium |
| 4.3 | Rewrite category sidebar → `useIntelCategories(1)` | `kb-industry-tab.tsx` | Low |
| 4.4 | Update add/edit dialog → writes to `intel_entries` with `altitude=1` | `kb-industry-tab.tsx` | Medium |

### Wave 5: Investigation System Integration (Minimal Touch)

| # | Task | Files | Risk |
|---|------|-------|------|
| 5.1 | Update Deployment Matrix Market form: add altitude picker + industry/segment selector | `investigation-detail.tsx` | Medium |
| 5.2 | Update Deployment Matrix Market write: `addIntelEntry` instead of `addEntry` | `investigation-detail.tsx` | Medium |
| 5.3 | Update Quick-Deploy Market form: same altitude-aware changes | `quick-deploy-form.tsx` | Medium |
| 5.4 | Update `DeploymentReceiptEntry` type: `"intel_entry"` alongside `"kb_entry"` | `lib/investigations.ts` | Low |
| 5.5 | Update Proven Concepts receipt display for new `intel_entry` type | `proven-concepts.tsx` | Low |

### Wave 6: Cleanup

| # | Task | Files | Risk |
|---|------|-------|------|
| 6.1 | Verification: compare old vs new table counts | Script | Medium |
| 6.2 | Drop `icp_fields`, `icp_values` tables | Migration | High — irreversible |
| 6.3 | Drop `segment_entries` table | Migration | High — irreversible |
| 6.4 | Clean `kb_entries`: remove market intel rows (now in `intel_entries`) | Migration | Medium |
| 6.5 | Deprecate old hooks: `use-icp.ts`, `use-segment-entries.ts` | Hooks | Low |
| 6.6 | Remove `ALTITUDE_1_SLUGS`, `ALTITUDE_2_SLUGS` hardcoded constants from components | Components | Low — satisfying cleanup |

---

## 6. What Remains Untouched

| Component | Why |
|-----------|-----|
| `investigations` table | State machine is perfect |
| `script_inbox` table | Signal flow is perfect |
| Investigation hooks (`use-investigations.ts`) | No schema changes |
| Signal Feed (`signal-feed.tsx`) | No changes needed |
| Investigation Detail (scratchpad, evidence board) | No changes needed |
| Proven Concepts Archive | Only display label changes (5.5) |
| `kb_entries` + `kb_categories` | **Still used for Offer pillar** (non-market KB) |
| `kb_scripts` + `kb_script_sections` | Messaging pillar — not market intel |
| `drills` | Operator pillar — not market intel |

---

## 7. The Final State (After All Waves)

### Data Flow Diagram
```
                    ┌─────────────────────────┐
                    │       categories         │
                    │  type = 'industry'        │
                    │  (Tutoring, Blue-Collar)  │
                    └──────────┬──────────────┘
                               │ parent_id
                    ┌──────────▼──────────────┐
                    │       categories         │
                    │  type = 'segment'         │
                    │  (Trucking, Tutoring-Med) │
                    └──────────┬──────────────┘
                               │ 
           ┌───────────────────┼───────────────────┐
           │                   │                    │
    ┌──────▼──────┐    ┌──────▼──────┐     ┌──────▼──────┐
    │ ALTITUDE 1  │    │ ALTITUDE 2  │     │ ALTITUDE 3  │
    │ (Macro)     │    │ (Segment)   │     │ (Human ICP) │
    │ intel_entries│    │ intel_entries│     │ intel_entries│
    │ industry_id │    │ segment_id  │     │ segment_id  │
    │ required    │    │ required    │     │ required    │
    │ segment_id  │    │             │     │             │
    │ IS NULL     │    │ single +    │     │ Language     │
    │             │    │ multi       │     │ Bank,        │
    │ Competitors │    │ cardinality │     │ Mindset,     │
    │ Regulations │    │             │     │ Pain Points  │
    │ Trends      │    │ Firmographics│     │             │
    └─────────────┘    │ + Biz Intel │     └─────────────┘
                       └─────────────┘

    ┌─────────────────────────────────────────────┐
    │           categories                         │
    │  type = 'intel_category'                     │
    │  altitude = 1, 2, or 3                       │
    │  cardinality = 'single' or 'multi'           │
    │  (ALL intel bucket definitions live here)     │
    └─────────────────────────────────────────────┘
```

### The Query Contract

```sql
-- Industry Intel tab: ALL Altitude 1 entries for a given industry
SELECT * FROM intel_entries
WHERE altitude = 1 AND industry_id = :industry_id;

-- ICP tab firmographics: single-value Altitude 2 entries for a segment
SELECT ie.*, c.name as field_name
FROM intel_entries ie
JOIN categories c ON c.id = ie.intel_category_id
WHERE ie.altitude = 2 
  AND ie.segment_id = :segment_id
  AND c.cardinality = 'single';

-- ICP tab segment intel: multi-value Altitude 2 entries for a segment
SELECT ie.*, c.name as category_name
FROM intel_entries ie
JOIN categories c ON c.id = ie.intel_category_id
WHERE ie.altitude = 2 
  AND ie.segment_id = :segment_id
  AND c.cardinality = 'multi';

-- ICP tab psychology: ALL Altitude 3 entries for a segment
SELECT ie.*, c.name as section_name
FROM intel_entries ie
JOIN categories c ON c.id = ie.intel_category_id
WHERE ie.altitude = 3 
  AND ie.segment_id = :segment_id;
```

No slug matching. No JSONB metadata parsing. No frontend filtering by hardcoded sets. Pure relational queries against a proper schema.

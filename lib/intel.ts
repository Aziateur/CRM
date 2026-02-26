import { getSupabase } from "@/lib/supabase"
import type { Category } from "@/lib/categories"

// ─── Types ───

export type Altitude = 1 | 2 | 3

export interface IntelEntry {
    id: string
    projectId: string
    altitude: Altitude
    industryId: string | null
    segmentId: string | null
    intelCategoryId: string
    title: string | null
    content: string
    tags: string[]
    source: string | null
    sourceAttemptIds: string[]
    isPinned: boolean
    sortOrder: number
    createdAt: string
    updatedAt: string
}

// ─── Row Mapper ───

function rowToIntelEntry(row: Record<string, unknown>): IntelEntry {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        altitude: row.altitude as Altitude,
        industryId: (row.industry_id as string) ?? null,
        segmentId: (row.segment_id as string) ?? null,
        intelCategoryId: row.intel_category_id as string,
        title: (row.title as string) ?? null,
        content: (row.content as string) ?? "",
        tags: (row.tags as string[]) ?? [],
        source: (row.source as string) ?? null,
        sourceAttemptIds: (row.source_attempt_ids as string[]) ?? [],
        isPinned: (row.is_pinned as boolean) ?? false,
        sortOrder: (row.sort_order as number) ?? 0,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }
}

// ─── Queries ───

/**
 * Fetch intel entries for a given altitude + scope.
 * - altitude 1: scopeId = industry_id
 * - altitude 2 or 3: scopeId = segment_id
 */
export async function fetchIntelEntries(
    projectId: string,
    altitude: Altitude,
    scopeId: string,
): Promise<IntelEntry[]> {
    const supabase = getSupabase()
    const scopeCol = altitude === 1 ? "industry_id" : "segment_id"

    const { data, error } = await supabase
        .from("intel_entries")
        .select("*")
        .eq("project_id", projectId)
        .eq("altitude", altitude)
        .eq(scopeCol, scopeId)
        .order("sort_order", { ascending: true })

    if (error) throw error
    return (data ?? []).map(rowToIntelEntry)
}

/**
 * Fetch ALL intel entries for a segment (both altitude 2 and 3).
 * Used by the unified ICP tab.
 */
export async function fetchSegmentIntel(
    projectId: string,
    segmentId: string,
): Promise<IntelEntry[]> {
    const supabase = getSupabase()

    const { data, error } = await supabase
        .from("intel_entries")
        .select("*")
        .eq("project_id", projectId)
        .eq("segment_id", segmentId)
        .in("altitude", [2, 3])
        .order("altitude", { ascending: true })
        .order("sort_order", { ascending: true })

    if (error) throw error
    return (data ?? []).map(rowToIntelEntry)
}

/**
 * Fetch intel categories for a given altitude.
 */
export function filterIntelCategories(
    allCategories: Category[],
    altitude: Altitude,
): { categories: Category[]; singleValue: Category[]; multiEntry: Category[] } {
    const cats = allCategories.filter(
        c => c.categoryType === "intel_category" && (c as unknown as Record<string, unknown>).altitude === altitude,
    )
    const singleValue = cats.filter(c => (c as unknown as Record<string, unknown>).cardinality === "single")
    const multiEntry = cats.filter(c => (c as unknown as Record<string, unknown>).cardinality !== "single")
    return { categories: cats, singleValue, multiEntry }
}

// ─── Mutations ───

export async function createIntelEntry(
    projectId: string,
    input: {
        altitude: Altitude
        industryId?: string
        segmentId?: string
        intelCategoryId: string
        title?: string | null
        content: string
        tags?: string[]
        source?: string
        sourceAttemptIds?: string[]
    },
): Promise<IntelEntry> {
    const supabase = getSupabase()

    const { data, error } = await supabase
        .from("intel_entries")
        .insert({
            project_id: projectId,
            altitude: input.altitude,
            industry_id: input.industryId ?? null,
            segment_id: input.segmentId ?? null,
            intel_category_id: input.intelCategoryId,
            title: input.title ?? null,
            content: input.content,
            tags: input.tags ?? [],
            source: input.source ?? null,
            source_attempt_ids: input.sourceAttemptIds ?? [],
        })
        .select("*")
        .single()

    if (error) throw error
    return rowToIntelEntry(data)
}

export async function updateIntelEntry(
    id: string,
    updates: Partial<Pick<IntelEntry, "title" | "content" | "tags" | "source" | "isPinned" | "sortOrder">>,
): Promise<IntelEntry> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (updates.title !== undefined) row.title = updates.title
    if (updates.content !== undefined) row.content = updates.content
    if (updates.tags !== undefined) row.tags = updates.tags
    if (updates.source !== undefined) row.source = updates.source
    if (updates.isPinned !== undefined) row.is_pinned = updates.isPinned
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder

    const { data, error } = await supabase
        .from("intel_entries")
        .update(row)
        .eq("id", id)
        .select("*")
        .single()

    if (error) throw error
    return rowToIntelEntry(data)
}

/**
 * Upsert a single-value entry (firmographic field).
 * Uses the UNIQUE constraint on (project_id, segment_id, intel_category_id) WHERE title IS NULL.
 */
export async function upsertSingleValue(
    projectId: string,
    segmentId: string,
    intelCategoryId: string,
    value: string,
): Promise<IntelEntry> {
    const supabase = getSupabase()

    // Try to find existing
    const { data: existing } = await supabase
        .from("intel_entries")
        .select("id")
        .eq("project_id", projectId)
        .eq("segment_id", segmentId)
        .eq("intel_category_id", intelCategoryId)
        .is("title", null)
        .single()

    if (existing) {
        return updateIntelEntry(existing.id, { content: value })
    }

    return createIntelEntry(projectId, {
        altitude: 2,
        segmentId,
        intelCategoryId,
        title: null,
        content: value,
    })
}

export async function deleteIntelEntry(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from("intel_entries").delete().eq("id", id)
    if (error) throw error
}

/**
 * Fetch all offer intel entries for a project.
 * These are global entries linked to offer_category categories.
 * Optionally filtered by offer level (stored in industry_id).
 */
export async function fetchOfferEntries(
    projectId: string,
    categoryIds: string[],
    offerLevelId?: string,
): Promise<IntelEntry[]> {
    if (categoryIds.length === 0) return []
    const supabase = getSupabase()

    let query = supabase
        .from("intel_entries")
        .select("*")
        .eq("project_id", projectId)
        .in("intel_category_id", categoryIds)
        .order("is_pinned", { ascending: false })
        .order("sort_order", { ascending: true })

    if (offerLevelId) {
        query = query.eq("industry_id", offerLevelId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(rowToIntelEntry)
}

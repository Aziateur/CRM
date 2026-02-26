import { getSupabase } from "@/lib/supabase"

// ─── Types ───

export interface SegmentEntry {
    id: string
    projectId: string
    segmentId: string
    sectionTypeId: string
    title: string | null
    content: string
    source: string | null
    tags: string[]
    isPinned: boolean
    sortOrder: number
    createdAt: string
    updatedAt: string
}

// ─── Row mapper ───

function rowToEntry(row: Record<string, unknown>): SegmentEntry {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        segmentId: row.segment_id as string,
        sectionTypeId: row.section_type_id as string,
        title: (row.title as string) ?? null,
        content: (row.content as string) ?? "",
        source: (row.source as string) ?? null,
        tags: (row.tags as string[]) ?? [],
        isPinned: (row.is_pinned as boolean) ?? false,
        sortOrder: (row.sort_order as number) ?? 0,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }
}

// ─── CRUD ───

export async function fetchSegmentEntries(
    projectId: string,
    segmentId: string,
    sectionTypeId?: string
): Promise<SegmentEntry[]> {
    const supabase = getSupabase()
    let query = supabase
        .from("segment_entries")
        .select("*")
        .eq("project_id", projectId)
        .eq("segment_id", segmentId)

    if (sectionTypeId) {
        query = query.eq("section_type_id", sectionTypeId)
    }

    const { data, error } = await query.order("sort_order", { ascending: true })
    if (error) throw error
    return (data ?? []).map(rowToEntry)
}

export async function createSegmentEntry(
    projectId: string,
    input: {
        segmentId: string
        sectionTypeId: string
        title?: string
        content: string
        source?: string
        tags?: string[]
        isPinned?: boolean
    }
): Promise<SegmentEntry> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("segment_entries")
        .insert({
            project_id: projectId,
            segment_id: input.segmentId,
            section_type_id: input.sectionTypeId,
            title: input.title ?? null,
            content: input.content,
            source: input.source ?? null,
            tags: input.tags ?? [],
            is_pinned: input.isPinned ?? false,
        })
        .select("*")
        .single()
    if (error) throw error
    return rowToEntry(data)
}

export async function updateSegmentEntry(
    id: string,
    updates: Partial<Pick<SegmentEntry, "title" | "content" | "source" | "tags" | "isPinned" | "sortOrder">>
): Promise<SegmentEntry> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) row.title = updates.title
    if (updates.content !== undefined) row.content = updates.content
    if (updates.source !== undefined) row.source = updates.source
    if (updates.tags !== undefined) row.tags = updates.tags
    if (updates.isPinned !== undefined) row.is_pinned = updates.isPinned
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder

    const { data, error } = await supabase
        .from("segment_entries")
        .update(row)
        .eq("id", id)
        .select("*")
        .single()
    if (error) throw error
    return rowToEntry(data)
}

export async function deleteSegmentEntry(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from("segment_entries").delete().eq("id", id)
    if (error) throw error
}

// ─── Convenience: fetch all pinned entries for a project (pre-call briefing) ───

export async function fetchPinnedSegmentEntries(projectId: string): Promise<SegmentEntry[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("segment_entries")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_pinned", true)
        .order("updated_at", { ascending: false })
    if (error) throw error
    return (data ?? []).map(rowToEntry)
}

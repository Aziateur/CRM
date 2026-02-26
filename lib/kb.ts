/**
 * Knowledge Base — Supabase operations.
 * Fully configurable: categories, entries, and entry parts.
 */

import { getSupabase } from "@/lib/supabase"

// ─── Types ───

export type DisplayMode = "bullets" | "full_text" | "sections"

export interface KbCategory {
    id: string
    name: string
    icon: string
    displayMode: DisplayMode
    sortOrder: number
    isActive: boolean
    showInPrep: boolean
    customFieldsSchema: Record<string, unknown>
    projectId: string
    createdAt: string
    updatedAt: string
}

export interface KbEntry {
    id: string
    categoryId: string
    title: string
    content: string
    tags: string[]
    segmentFilter: string | null
    stageFilter: string | null
    industryFilter: string | null
    sourceAttemptIds: string[]
    isPinned: boolean
    sortOrder: number
    projectId: string
    createdAt: string
    updatedAt: string
    // Joined
    parts?: KbEntryPart[]
    categoryName?: string
    categoryIcon?: string
    categoryDisplayMode?: DisplayMode
}

export interface KbEntryPart {
    id: string
    entryId: string
    title: string
    content: string
    sortOrder: number
    createdAt: string
    updatedAt: string
}

// ─── Fetchers ───

export async function fetchKbCategories(projectId: string): Promise<KbCategory[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("kb_categories")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []).map(mapCategory)
}

export async function fetchKbEntries(projectId: string): Promise<KbEntry[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("kb_entries")
        .select(`
            *,
            kb_categories ( name, icon, display_mode ),
            kb_entry_parts ( id, entry_id, title, content, sort_order, created_at, updated_at )
        `)
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []).map(mapEntry)
}

export async function fetchKbEntryParts(entryId: string): Promise<KbEntryPart[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("kb_entry_parts")
        .select("*")
        .eq("entry_id", entryId)
        .order("sort_order", { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []).map(mapPart)
}

// ─── Category Mutations ───

export async function createKbCategory(
    projectId: string,
    input: { name: string; icon?: string; displayMode?: DisplayMode },
): Promise<KbCategory> {
    const supabase = getSupabase()

    const { data: existing } = await supabase
        .from("kb_categories")
        .select("sort_order")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: false })
        .limit(1)

    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order as number) + 1 : 0

    const { data, error } = await supabase
        .from("kb_categories")
        .insert([{
            name: input.name,
            icon: input.icon ?? "file-text",
            display_mode: input.displayMode ?? "bullets",
            sort_order: nextOrder,
            is_active: true,
            show_in_prep: true,
            project_id: projectId,
        }])
        .select()
        .single()

    if (error) throw new Error(error.message)
    return mapCategory(data)
}

export async function updateKbCategory(
    id: string,
    updates: Partial<Pick<KbCategory, "name" | "icon" | "displayMode" | "isActive" | "showInPrep" | "sortOrder">>,
): Promise<void> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.name !== undefined) row.name = updates.name
    if (updates.icon !== undefined) row.icon = updates.icon
    if (updates.displayMode !== undefined) row.display_mode = updates.displayMode
    if (updates.isActive !== undefined) row.is_active = updates.isActive
    if (updates.showInPrep !== undefined) row.show_in_prep = updates.showInPrep
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder

    const { error } = await supabase.from("kb_categories").update(row).eq("id", id)
    if (error) throw new Error(error.message)
}

export async function deleteKbCategory(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from("kb_categories").delete().eq("id", id)
    if (error) throw new Error(error.message)
}

// ─── Entry Mutations ───

export async function createKbEntry(
    projectId: string,
    input: {
        categoryId: string
        title: string
        content?: string
        tags?: string[]
        segmentFilter?: string | null
        stageFilter?: string | null
        industryFilter?: string | null
        sourceAttemptIds?: string[]
    },
): Promise<KbEntry> {
    const supabase = getSupabase()

    const { data: existing } = await supabase
        .from("kb_entries")
        .select("sort_order")
        .eq("category_id", input.categoryId)
        .order("sort_order", { ascending: false })
        .limit(1)

    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order as number) + 1 : 0

    const { data, error } = await supabase
        .from("kb_entries")
        .insert([{
            category_id: input.categoryId,
            title: input.title,
            content: input.content ?? "",
            tags: input.tags ?? [],
            segment_filter: input.segmentFilter ?? null,
            stage_filter: input.stageFilter ?? null,
            industry_filter: input.industryFilter ?? null,
            source_attempt_ids: input.sourceAttemptIds ?? [],
            sort_order: nextOrder,
            project_id: projectId,
        }])
        .select(`
            *,
            kb_categories ( name, icon, display_mode ),
            kb_entry_parts ( id, entry_id, title, content, sort_order, created_at, updated_at )
        `)
        .single()

    if (error) throw new Error(error.message)
    return mapEntry(data)
}

export async function updateKbEntry(
    id: string,
    updates: Partial<Pick<KbEntry, "title" | "content" | "tags" | "segmentFilter" | "stageFilter" | "industryFilter" | "sourceAttemptIds" | "isPinned" | "sortOrder" | "categoryId">>,
): Promise<void> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) row.title = updates.title
    if (updates.content !== undefined) row.content = updates.content
    if (updates.tags !== undefined) row.tags = updates.tags
    if (updates.segmentFilter !== undefined) row.segment_filter = updates.segmentFilter
    if (updates.stageFilter !== undefined) row.stage_filter = updates.stageFilter
    if (updates.industryFilter !== undefined) row.industry_filter = updates.industryFilter
    if (updates.sourceAttemptIds !== undefined) row.source_attempt_ids = updates.sourceAttemptIds
    if (updates.isPinned !== undefined) row.is_pinned = updates.isPinned
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder
    if (updates.categoryId !== undefined) row.category_id = updates.categoryId

    const { error } = await supabase.from("kb_entries").update(row).eq("id", id)
    if (error) throw new Error(error.message)
}

export async function deleteKbEntry(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from("kb_entries").delete().eq("id", id)
    if (error) throw new Error(error.message)
}

// ─── Entry Part Mutations ───

export async function createKbEntryPart(
    entryId: string,
    input: { title: string; content?: string },
): Promise<KbEntryPart> {
    const supabase = getSupabase()

    const { data: existing } = await supabase
        .from("kb_entry_parts")
        .select("sort_order")
        .eq("entry_id", entryId)
        .order("sort_order", { ascending: false })
        .limit(1)

    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order as number) + 1 : 0

    const { data, error } = await supabase
        .from("kb_entry_parts")
        .insert([{
            entry_id: entryId,
            title: input.title,
            content: input.content ?? "",
            sort_order: nextOrder,
        }])
        .select()
        .single()

    if (error) throw new Error(error.message)
    return mapPart(data)
}

export async function updateKbEntryPart(
    id: string,
    updates: Partial<Pick<KbEntryPart, "title" | "content" | "sortOrder">>,
): Promise<void> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) row.title = updates.title
    if (updates.content !== undefined) row.content = updates.content
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder

    const { error } = await supabase.from("kb_entry_parts").update(row).eq("id", id)
    if (error) throw new Error(error.message)
}

export async function deleteKbEntryPart(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from("kb_entry_parts").delete().eq("id", id)
    if (error) throw new Error(error.message)
}

// ─── Mappers ───

function mapCategory(row: Record<string, unknown>): KbCategory {
    return {
        id: row.id as string,
        name: row.name as string,
        icon: row.icon as string,
        displayMode: row.display_mode as DisplayMode,
        sortOrder: row.sort_order as number,
        isActive: row.is_active as boolean,
        showInPrep: row.show_in_prep as boolean,
        customFieldsSchema: (row.custom_fields_schema ?? {}) as Record<string, unknown>,
        projectId: row.project_id as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }
}

function mapEntry(row: Record<string, unknown>): KbEntry {
    const cat = row.kb_categories as Record<string, unknown> | null
    const rawParts = row.kb_entry_parts as Record<string, unknown>[] | null
    return {
        id: row.id as string,
        categoryId: row.category_id as string,
        title: row.title as string,
        content: row.content as string,
        tags: (row.tags ?? []) as string[],
        segmentFilter: row.segment_filter as string | null,
        stageFilter: row.stage_filter as string | null,
        industryFilter: row.industry_filter as string | null,
        sourceAttemptIds: (row.source_attempt_ids ?? []) as string[],
        isPinned: row.is_pinned as boolean,
        sortOrder: row.sort_order as number,
        projectId: row.project_id as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        parts: rawParts
            ? rawParts.map(mapPart).sort((a, b) => a.sortOrder - b.sortOrder)
            : undefined,
        categoryName: cat?.name as string | undefined,
        categoryIcon: cat?.icon as string | undefined,
        categoryDisplayMode: cat?.display_mode as DisplayMode | undefined,
    }
}

function mapPart(row: Record<string, unknown>): KbEntryPart {
    return {
        id: row.id as string,
        entryId: row.entry_id as string,
        title: row.title as string,
        content: row.content as string,
        sortOrder: row.sort_order as number,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }
}

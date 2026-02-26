import { getSupabase } from "@/lib/supabase"

// ─── Types ───

export interface KbScript {
    id: string
    projectId: string
    title: string
    description: string
    summary: string
    segmentId: string | null
    stageId: string | null
    isPinned: boolean
    tags: string[]
    timesUsed: number
    sortOrder: number
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface KbScriptSection {
    id: string
    projectId: string
    scriptId: string
    sectionTypeId: string
    title: string | null
    content: string
    sortOrder: number
    isActive: boolean
    metadata: Record<string, unknown>
    createdAt: string
    updatedAt: string
}

// ─── Row mappers ───

function rowToScript(row: Record<string, unknown>): KbScript {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        title: row.title as string,
        description: (row.description as string) ?? "",
        summary: (row.summary as string) ?? "",
        segmentId: (row.segment_id as string) ?? null,
        stageId: (row.stage_id as string) ?? null,
        isPinned: (row.is_pinned as boolean) ?? false,
        tags: (row.tags as string[]) ?? [],
        timesUsed: (row.times_used as number) ?? 0,
        sortOrder: (row.sort_order as number) ?? 0,
        isActive: (row.is_active as boolean) ?? true,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }
}

function rowToSection(row: Record<string, unknown>): KbScriptSection {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        scriptId: row.script_id as string,
        sectionTypeId: row.section_type_id as string,
        title: (row.title as string) ?? null,
        content: (row.content as string) ?? "",
        sortOrder: (row.sort_order as number) ?? 0,
        isActive: (row.is_active as boolean) ?? true,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }
}

// ─── Scripts CRUD ───

export async function fetchScripts(projectId: string): Promise<KbScript[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("kb_scripts")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
    if (error) throw error
    return (data ?? []).map(rowToScript)
}

export async function createScript(
    projectId: string,
    input: {
        title: string
        description?: string
        segmentId?: string | null
        stageId?: string | null
        isPinned?: boolean
        tags?: string[]
    }
): Promise<KbScript> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("kb_scripts")
        .insert({
            project_id: projectId,
            title: input.title,
            description: input.description ?? "",
            segment_id: input.segmentId ?? null,
            stage_id: input.stageId ?? null,
            is_pinned: input.isPinned ?? false,
            tags: input.tags ?? [],
        })
        .select("*")
        .single()
    if (error) throw error
    return rowToScript(data)
}

export async function updateScript(
    id: string,
    updates: Partial<Pick<KbScript, "title" | "description" | "summary" | "segmentId" | "stageId" | "isPinned" | "tags" | "sortOrder" | "isActive" | "timesUsed">>
): Promise<KbScript> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) row.title = updates.title
    if (updates.description !== undefined) row.description = updates.description
    if (updates.summary !== undefined) row.summary = updates.summary
    if (updates.segmentId !== undefined) row.segment_id = updates.segmentId
    if (updates.stageId !== undefined) row.stage_id = updates.stageId
    if (updates.isPinned !== undefined) row.is_pinned = updates.isPinned
    if (updates.tags !== undefined) row.tags = updates.tags
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder
    if (updates.isActive !== undefined) row.is_active = updates.isActive
    if (updates.timesUsed !== undefined) row.times_used = updates.timesUsed

    const { data, error } = await supabase
        .from("kb_scripts")
        .update(row)
        .eq("id", id)
        .select("*")
        .single()
    if (error) throw error
    return rowToScript(data)
}

export async function deleteScript(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from("kb_scripts").delete().eq("id", id)
    if (error) throw error
}

// ─── Script Sections CRUD ───

export async function fetchScriptSections(scriptId: string): Promise<KbScriptSection[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("kb_script_sections")
        .select("*")
        .eq("script_id", scriptId)
        .order("sort_order", { ascending: true })
    if (error) throw error
    return (data ?? []).map(rowToSection)
}

export async function createScriptSection(
    projectId: string,
    scriptId: string,
    input: {
        sectionTypeId: string
        title?: string
        content?: string
        sortOrder?: number
        metadata?: Record<string, unknown>
    }
): Promise<KbScriptSection> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("kb_script_sections")
        .insert({
            project_id: projectId,
            script_id: scriptId,
            section_type_id: input.sectionTypeId,
            title: input.title ?? null,
            content: input.content ?? "",
            sort_order: input.sortOrder ?? 0,
            metadata: input.metadata ?? {},
        })
        .select("*")
        .single()
    if (error) throw error
    return rowToSection(data)
}

export async function updateScriptSection(
    id: string,
    updates: Partial<Pick<KbScriptSection, "title" | "content" | "sortOrder" | "isActive" | "sectionTypeId" | "metadata">>
): Promise<KbScriptSection> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) row.title = updates.title
    if (updates.content !== undefined) row.content = updates.content
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder
    if (updates.isActive !== undefined) row.is_active = updates.isActive
    if (updates.sectionTypeId !== undefined) row.section_type_id = updates.sectionTypeId
    if (updates.metadata !== undefined) row.metadata = updates.metadata

    const { data, error } = await supabase
        .from("kb_script_sections")
        .update(row)
        .eq("id", id)
        .select("*")
        .single()
    if (error) throw error
    return rowToSection(data)
}

export async function deleteScriptSection(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from("kb_script_sections").delete().eq("id", id)
    if (error) throw error
}

export async function reorderScriptSections(
    sectionIds: string[]
): Promise<void> {
    const supabase = getSupabase()
    const updates = sectionIds.map((id, index) => ({
        id,
        sort_order: index,
        updated_at: new Date().toISOString(),
    }))
    // Batch update sort_order for each section
    for (const update of updates) {
        const { error } = await supabase
            .from("kb_script_sections")
            .update({ sort_order: update.sort_order, updated_at: update.updated_at })
            .eq("id", update.id)
        if (error) throw error
    }
}

/**
 * Friction logging — Supabase operations.
 * Categories come from the unified 'categories' table (type='friction_type').
 * Logs are individual friction events, optionally tied to attempts.
 */

import { getSupabase } from "@/lib/supabase"

// ─── Types ───

export interface FrictionCategory {
    id: string
    name: string
    icon: string
    color: string | null
    sortOrder: number
    isActive: boolean
    projectId: string
    createdAt: string
}

export interface FrictionLog {
    id: string
    attemptId: string | null
    categoryId: string
    categoryName?: string
    categoryIcon?: string
    note: string | null
    rootCauseId: string | null
    affectedComponent: string | null
    resolutionAction: string | null
    resolvedAt: string | null
    projectId: string
    createdAt: string
}

export interface CreateFrictionLogInput {
    attemptId?: string | null
    categoryId: string
    rootCauseId?: string | null
    note?: string | null
    projectId: string
}

// ─── Fetchers ───

export async function fetchFrictionCategories(projectId: string): Promise<FrictionCategory[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("project_id", projectId)
        .eq("category_type", "friction_type")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []).map(mapCategory)
}

export async function fetchFrictionLogs(projectId: string): Promise<FrictionLog[]> {
    const supabase = getSupabase()

    // Fetch logs — category_id now points to categories table
    const { data, error } = await supabase
        .from("friction_logs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(500)

    if (error) throw new Error(error.message)

    // Fetch friction categories to enrich log data
    const categories = await fetchFrictionCategories(projectId)
    const catMap = new Map(categories.map(c => [c.id, c]))

    return (data ?? []).map(row => {
        const cat = catMap.get(row.category_id as string)
        return {
            id: row.id as string,
            attemptId: row.attempt_id as string | null,
            categoryId: row.category_id as string,
            categoryName: cat?.name,
            categoryIcon: cat?.icon,
            note: row.note as string | null,
            rootCauseId: (row.root_cause_id as string) ?? null,
            affectedComponent: (row.affected_component as string) ?? null,
            resolutionAction: (row.resolution_action as string) ?? null,
            resolvedAt: (row.resolved_at as string) ?? null,
            projectId: row.project_id as string,
            createdAt: row.created_at as string,
        }
    })
}

// ─── Mutations ───

export async function createFrictionLog(input: CreateFrictionLogInput): Promise<FrictionLog> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("friction_logs")
        .insert([{
            attempt_id: input.attemptId || null,
            category_id: input.categoryId,
            root_cause_id: input.rootCauseId || null,
            note: input.note || null,
            project_id: input.projectId,
        }])
        .select("*")
        .single()

    if (error) throw new Error(error.message)
    return {
        id: data.id,
        attemptId: data.attempt_id,
        categoryId: data.category_id,
        note: data.note,
        rootCauseId: data.root_cause_id ?? null,
        affectedComponent: data.affected_component ?? null,
        resolutionAction: data.resolution_action ?? null,
        resolvedAt: data.resolved_at ?? null,
        projectId: data.project_id,
        createdAt: data.created_at,
    }
}

// These CRUD ops are no longer needed — categories are managed via
// the unified CategoryManager component. Keeping stubs for backward compat.

export async function createFrictionCategory(
    projectId: string,
    name: string,
    icon: string = "zap",
): Promise<FrictionCategory> {
    const supabase = getSupabase()
    const { data: existing } = await supabase
        .from("categories")
        .select("sort_order")
        .eq("project_id", projectId)
        .eq("category_type", "friction_type")
        .order("sort_order", { ascending: false })
        .limit(1)

    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order as number) + 1 : 0

    const { data, error } = await supabase
        .from("categories")
        .insert([{
            project_id: projectId,
            type: "friction_type",
            category_type: "friction_type",
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
            icon,
            sort_order: nextOrder,
            is_active: true,
        }])
        .select()
        .single()

    if (error) throw new Error(error.message)
    return mapCategory(data)
}

export async function updateFrictionCategory(
    id: string,
    updates: { name?: string; icon?: string; isActive?: boolean; sortOrder?: number },
): Promise<void> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = {}
    if (updates.name !== undefined) row.name = updates.name
    if (updates.icon !== undefined) row.icon = updates.icon
    if (updates.isActive !== undefined) row.is_active = updates.isActive
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder

    const { error } = await supabase
        .from("categories")
        .update(row)
        .eq("id", id)

    if (error) throw new Error(error.message)
}

export async function deleteFrictionCategory(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)

    if (error) throw new Error(error.message)
}

// ─── Mappers ───

function mapCategory(row: Record<string, unknown>): FrictionCategory {
    return {
        id: row.id as string,
        name: row.name as string,
        icon: (row.icon as string) ?? "zap",
        color: (row.color as string) ?? null,
        sortOrder: row.sort_order as number,
        isActive: (row.is_active as boolean) ?? true,
        projectId: row.project_id as string,
        createdAt: row.created_at as string,
    }
}

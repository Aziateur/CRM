"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"

// Re-export types from the original hook (source of truth for field/template shapes)
export type {
    ReviewField,
    ReviewFieldConfig,
    ReviewTemplate,
} from "@/hooks/use-review-templates"

import type { ReviewField, ReviewTemplate } from "@/hooks/use-review-templates"

// ─── Helpers ───

function mapField(row: Record<string, unknown>): ReviewField {
    return {
        id: row.id as string,
        key: row.key as string,
        label: row.label as string,
        fieldType: row.field_type as ReviewField["fieldType"],
        section: (row.section ?? null) as string | null,
        config: (row.config ?? {}) as ReviewField["config"],
        sortOrder: (row.sort_order ?? 0) as number,
        isRequired: (row.is_required ?? false) as boolean,
    }
}

// ─── Fetcher ───

async function fetchTemplates(projectId: string): Promise<ReviewTemplate[]> {
    const supabase = getSupabase()

    const { data: tData } = await supabase
        .from("review_templates")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

    if (!tData || tData.length === 0) return []

    const templateIds = tData.map((t: Record<string, unknown>) => t.id as string)
    const { data: fData } = await supabase
        .from("review_fields")
        .select("*")
        .in("template_id", templateIds)
        .order("sort_order", { ascending: true })

    const fieldsByTemplate = new Map<string, ReviewField[]>()
    for (const row of (fData ?? []) as Record<string, unknown>[]) {
        const tid = row.template_id as string
        if (!fieldsByTemplate.has(tid)) fieldsByTemplate.set(tid, [])
        fieldsByTemplate.get(tid)!.push(mapField(row))
    }

    return (tData as Record<string, unknown>[]).map((t) => ({
        id: t.id as string,
        name: t.name as string,
        description: (t.description ?? null) as string | null,
        version: (t.version ?? 1) as number,
        isActive: (t.is_active ?? true) as boolean,
        isLocked: (t.is_locked ?? false) as boolean,
        appliesTo: (t.applies_to ?? "deep") as ReviewTemplate["appliesTo"],
        fields: fieldsByTemplate.get(t.id as string) ?? [],
    }))
}

// ─── Query Hook (shared across all components) ───

export function useTemplatesQuery() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.templates(projectId ?? "__none__"),
        queryFn: () => fetchTemplates(projectId!),
        enabled: !!projectId,
    })

    const templates = query.data ?? []

    const activeDeepTemplate = templates.find(
        (t) => (t.appliesTo === "deep" || t.appliesTo === "both") && t.isActive,
    ) ?? null

    const activeQuickTemplate = templates.find(
        (t) => (t.appliesTo === "quick" || t.appliesTo === "both") && t.isActive,
    ) ?? null

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.templates(projectId ?? "") })

    return {
        templates,
        activeDeepTemplate,
        activeQuickTemplate,
        loading: query.isLoading,
        refetch: query.refetch,
        invalidate,
    }
}

// ─── Template field lookup for version-aware scoring ───

/**
 * Fetch field definitions for a specific template version.
 * Used by the scoring engine to score historical reviews with the template
 * version they were created against (prevents score drift).
 */
export async function fetchFieldsForTemplateVersion(
    templateId: string,
    _version?: number,
): Promise<ReviewField[]> {
    const supabase = getSupabase()
    // For now, fetch fields for the given template ID directly
    // In the future when we have full version tracking, filter by version
    const { data } = await supabase
        .from("review_fields")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order", { ascending: true })

    if (!data) return []
    return (data as Record<string, unknown>[]).map(mapField)
}

// ─── Mutations (for settings/admin page) ───

export function useSaveTemplate() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: {
            template: Omit<ReviewTemplate, "id" | "fields"> & { id?: string }
            fields: Omit<ReviewField, "id">[]
            currentTemplates: ReviewTemplate[]
        }): Promise<string | null> => {
            if (!projectId) return null
            const { template, fields, currentTemplates } = params
            const supabase = getSupabase()

            if (template.id) {
                const existing = currentTemplates.find((t) => t.id === template.id)
                if (existing?.isLocked) {
                    // Version bump: create new version, deactivate old
                    const newVersion = existing.version + 1

                    await supabase
                        .from("review_templates")
                        .update({ is_active: false, updated_at: new Date().toISOString() })
                        .eq("id", template.id)

                    const { data } = await supabase
                        .from("review_templates")
                        .insert({
                            name: template.name,
                            description: template.description,
                            version: newVersion,
                            is_active: true,
                            applies_to: template.appliesTo,
                            project_id: projectId,
                        })
                        .select("id")
                        .single()

                    if (!data) return null
                    const newId = (data as Record<string, unknown>).id as string

                    if (fields.length > 0) {
                        await supabase.from("review_fields").insert(
                            fields.map((f, i) => ({
                                template_id: newId,
                                key: f.key,
                                label: f.label,
                                field_type: f.fieldType,
                                section: f.section,
                                config: f.config,
                                sort_order: i,
                                is_required: f.isRequired,
                                project_id: projectId,
                            })),
                        )
                    }
                    return newId
                }

                // Unlocked: in-place edit
                await supabase
                    .from("review_templates")
                    .update({
                        name: template.name,
                        description: template.description,
                        is_active: template.isActive,
                        applies_to: template.appliesTo,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", template.id)

                await supabase.from("review_fields").delete().eq("template_id", template.id)

                if (fields.length > 0) {
                    await supabase.from("review_fields").insert(
                        fields.map((f, i) => ({
                            template_id: template.id,
                            key: f.key,
                            label: f.label,
                            field_type: f.fieldType,
                            section: f.section,
                            config: f.config,
                            sort_order: i,
                            is_required: f.isRequired,
                            project_id: projectId,
                        })),
                    )
                }

                return template.id
            } else {
                // Create new
                const { data } = await supabase
                    .from("review_templates")
                    .insert({
                        name: template.name,
                        description: template.description,
                        version: template.version,
                        is_active: template.isActive,
                        applies_to: template.appliesTo,
                        project_id: projectId,
                    })
                    .select("id")
                    .single()

                if (!data) return null
                const newId = (data as Record<string, unknown>).id as string

                if (fields.length > 0) {
                    await supabase.from("review_fields").insert(
                        fields.map((f, i) => ({
                            template_id: newId,
                            key: f.key,
                            label: f.label,
                            field_type: f.fieldType,
                            section: f.section,
                            config: f.config,
                            sort_order: i,
                            is_required: f.isRequired,
                            project_id: projectId,
                        })),
                    )
                }

                return newId
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.templates(projectId ?? "") })
            // Also invalidate ranked calls since scoring depends on templates
            queryClient.invalidateQueries({ queryKey: queryKeys.rankedCalls(projectId ?? "") })
        },
    })
}

export function useDeleteTemplate() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const supabase = getSupabase()
            await supabase
                .from("review_templates")
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq("id", id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.templates(projectId ?? "") })
        },
    })
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"

// ─── Types ───

export interface ReviewFieldConfig {
    min?: number
    max?: number
    anchors?: Record<string, string>  // e.g. { "1": "No hook...", "5": "Pattern interrupt..." }
    options?: { value: string; label: string; color?: string }[]
    placeholder?: string
    prompt?: string
    rows?: number
}

export interface ReviewField {
    id: string
    key: string
    label: string
    fieldType: "score" | "text" | "multi_select" | "checkbox" | "evidence_quote"
    section: string | null
    config: ReviewFieldConfig
    sortOrder: number
    isRequired: boolean
}

export interface ReviewTemplate {
    id: string
    name: string
    description: string | null
    version: number
    isActive: boolean
    isLocked: boolean
    appliesTo: "quick" | "deep" | "both"
    fields: ReviewField[]
}

// ─── Helpers ───

function mapField(row: Record<string, unknown>): ReviewField {
    return {
        id: row.id as string,
        key: row.key as string,
        label: row.label as string,
        fieldType: row.field_type as ReviewField["fieldType"],
        section: (row.section ?? null) as string | null,
        config: (row.config ?? {}) as ReviewFieldConfig,
        sortOrder: (row.sort_order ?? 0) as number,
        isRequired: (row.is_required ?? false) as boolean,
    }
}

// ─── Hook ───

export function useReviewTemplates() {
    const projectId = useProjectId()
    const [templates, setTemplates] = useState<ReviewTemplate[]>([])
    const [loading, setLoading] = useState(true)

    const fetchTemplates = useCallback(async () => {
        if (!projectId) return
        setLoading(true)
        const supabase = getSupabase()

        // Fetch active templates
        const { data: tData } = await supabase
            .from("review_templates")
            .select("*")
            .eq("project_id", projectId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })

        if (!tData || tData.length === 0) {
            setTemplates([])
            setLoading(false)
            return
        }

        // Fetch fields for all templates
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

        setTemplates(
            (tData as Record<string, unknown>[]).map((t) => ({
                id: t.id as string,
                name: t.name as string,
                description: (t.description ?? null) as string | null,
                version: (t.version ?? 1) as number,
                isActive: (t.is_active ?? true) as boolean,
                isLocked: (t.is_locked ?? false) as boolean,
                appliesTo: (t.applies_to ?? "deep") as ReviewTemplate["appliesTo"],
                fields: fieldsByTemplate.get(t.id as string) ?? [],
            })),
        )
        setLoading(false)
    }, [projectId])

    useEffect(() => {
        fetchTemplates()
    }, [fetchTemplates])

    // Save a new template or update existing
    const saveTemplate = useCallback(
        async (
            template: Omit<ReviewTemplate, "id" | "fields"> & { id?: string },
            fields: Omit<ReviewField, "id">[],
        ): Promise<string | null> => {
            if (!projectId) return null
            const supabase = getSupabase()

            if (template.id) {
                // Check if this template is locked (used in at least one review)
                const existing = templates.find((t) => t.id === template.id)
                if (existing?.isLocked) {
                    // ─── VERSION BUMP: create new version, deactivate old ───
                    const newVersion = existing.version + 1

                    // Deactivate old version
                    await supabase
                        .from("review_templates")
                        .update({ is_active: false, updated_at: new Date().toISOString() })
                        .eq("id", template.id)

                    // Create new version
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

                // ─── UNLOCKED: in-place edit (current behavior) ───
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

                // Delete old fields and re-insert
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
        [projectId, templates],
    )

    // Soft-delete a template (deactivate)
    const deleteTemplate = useCallback(
        async (id: string) => {
            if (!projectId) return
            const supabase = getSupabase()
            await supabase
                .from("review_templates")
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq("id", id)
            await fetchTemplates()
        },
        [projectId, fetchTemplates],
    )

    // Get the active deep template (first one)
    const activeDeepTemplate = templates.find(
        (t) => (t.appliesTo === "deep" || t.appliesTo === "both") && t.isActive,
    ) ?? null

    return { templates, activeDeepTemplate, loading, saveTemplate, deleteTemplate, refetch: fetchTemplates }
}

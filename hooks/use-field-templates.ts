"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useProjectId } from "@/hooks/use-project-id"
import type { FieldTemplate } from "@/lib/store"

function mapRow(row: Record<string, unknown>): FieldTemplate {
    return {
        id: row.id as string,
        projectId: (row.project_id ?? row.projectId) as string,
        name: row.name as string,
        description: (row.description ?? undefined) as string | undefined,
        icon: (row.icon ?? "clipboard-list") as string,
        fieldKeys: (row.field_keys ?? row.fieldKeys ?? []) as string[],
        createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
        updatedAt: (row.updated_at ?? row.updatedAt ?? new Date().toISOString()) as string,
    }
}

export function useFieldTemplates() {
    const { toast } = useToast()
    const projectId = useProjectId()
    const [templates, setTemplates] = useState<FieldTemplate[]>([])
    const [loading, setLoading] = useState(true)

    const fetchTemplates = useCallback(async () => {
        if (!projectId) { setTemplates([]); setLoading(false); return }
        setLoading(true)
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("field_templates")
                .select("*")
                .eq("project_id", projectId)
                .order("created_at", { ascending: true })

            if (error) {
                if (!error.message?.includes("does not exist")) {
                    console.warn("[useFieldTemplates]", error.message)
                }
                setTemplates([])
                return
            }
            if (data) {
                setTemplates(data.map((row: Record<string, unknown>) => mapRow(row)))
            }
        } catch {
            setTemplates([])
        } finally {
            setLoading(false)
        }
    }, [projectId])

    useEffect(() => {
        fetchTemplates()
    }, [fetchTemplates])

    const createTemplate = useCallback(async (input: {
        name: string
        description?: string
        icon?: string
        fieldKeys: string[]
    }) => {
        if (!projectId) return null
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("field_templates")
                .insert([{
                    project_id: projectId,
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    icon: input.icon || "clipboard-list",
                    field_keys: input.fieldKeys,
                }])
                .select()
                .single()

            if (error) {
                toast({ variant: "destructive", title: "Failed to create template", description: error.message })
                return null
            }
            if (data) {
                const template = mapRow(data as Record<string, unknown>)
                setTemplates((prev) => [...prev, template])
                return template
            }
            return null
        } catch {
            return null
        }
    }, [projectId, toast])

    const updateTemplate = useCallback(async (id: string, input: Partial<{
        name: string
        description: string
        icon: string
        fieldKeys: string[]
    }>) => {
        try {
            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
            if (input.name !== undefined) updates.name = input.name.trim()
            if (input.description !== undefined) updates.description = input.description.trim() || null
            if (input.icon !== undefined) updates.icon = input.icon
            if (input.fieldKeys !== undefined) updates.field_keys = input.fieldKeys

            const supabase = getSupabase()
            const { error } = await supabase.from("field_templates").update(updates).eq("id", id)

            if (error) {
                toast({ variant: "destructive", title: "Failed to update template", description: error.message })
                return false
            }
            setTemplates((prev) => prev.map((t) =>
                t.id === id ? { ...t, ...input, updatedAt: new Date().toISOString() } : t
            ))
            return true
        } catch {
            return false
        }
    }, [toast])

    const deleteTemplate = useCallback(async (id: string) => {
        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("field_templates").delete().eq("id", id)
            if (error) {
                toast({ variant: "destructive", title: "Failed to delete template", description: error.message })
                return false
            }
            setTemplates((prev) => prev.filter((t) => t.id !== id))
            return true
        } catch {
            return false
        }
    }, [toast])

    return { templates, loading, createTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates }
}

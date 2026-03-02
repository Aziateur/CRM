"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import type { ViewSchema, ViewType, ViewSchemaData, FieldDefinition } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"

function generateDefaultSchema(viewType: ViewType, fields: FieldDefinition[]): ViewSchemaData {
    if (viewType === "lead_drawer") {
        return {
            columns: [
                {
                    id: "col-1",
                    width: 1,
                    sections: [
                        {
                            id: "sec-prep",
                            name: "Prep",
                            items: [
                                { id: "widget-prep-templates", type: "widget", widgetId: "prep_templates" }
                            ]
                        },
                        {
                            id: "sec-strategy",
                            name: "Strategy & Reality",
                            items: [
                                { id: "widget-account-reality", type: "widget", widgetId: "account_reality" }
                            ]
                        }
                    ]
                },
                {
                    id: "col-2",
                    width: 1,
                    sections: [
                        {
                            id: "sec-execution",
                            name: "Execution",
                            items: [
                                { id: "widget-pending-tasks", type: "widget", widgetId: "pending_tasks" },
                                { id: "widget-task-templates", type: "widget", widgetId: "task_templates" }
                            ]
                        },
                        {
                            id: "sec-contact-info",
                            name: "Contact Info",
                            items: fields
                                .filter(f => f.section === "core")
                                .sort((a, b) => a.position - b.position)
                                .map(f => ({ id: `field-${f.fieldKey}`, type: "field", fieldKey: f.fieldKey }))
                        },
                        {
                            id: "sec-details",
                            name: "Details",
                            items: fields
                                .filter(f => f.section === "detail")
                                .sort((a, b) => a.position - b.position)
                                .map(f => ({ id: `field-${f.fieldKey}`, type: "field", fieldKey: f.fieldKey }))
                        },
                        {
                            id: "sec-contacts",
                            name: "Contacts",
                            items: [
                                { id: "widget-contacts-list", type: "widget", widgetId: "contacts_list" }
                            ]
                        }
                    ]
                },
                {
                    id: "col-3",
                    width: 1,
                    sections: [
                        {
                            id: "sec-history",
                            name: "History",
                            items: [
                                { id: "widget-last-attempt", type: "widget", widgetId: "last_attempt" },
                                { id: "widget-timeline", type: "widget", widgetId: "interactions_timeline" },
                                { id: "widget-calls-panel", type: "widget", widgetId: "calls_panel" }
                            ]
                        }
                    ]
                }
            ]
        }
    }

    if (viewType === "leads_table") {
        return {
            fields: fields.slice(0, 3).map(f => f.fieldKey),
            tableColumns: ["company", "phone", "stage", "segment", "last_outcome", "next_action", "sequence_progress"]
        }
    }

    if (viewType === "add_lead") {
        return {
            fields: fields.slice(0, 3).map(f => f.fieldKey)
        }
    }

    return {}
}

export function useViewSchema(viewType: ViewType) {
    const projectId = useProjectId()
    const { fields: fieldDefinitions, loading: loadingFields } = useFieldDefinitions()
    const { toast } = useToast()

    const [schema, setSchema] = useState<ViewSchema | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const fetchSchema = useCallback(async () => {
        if (!projectId || loadingFields) return

        try {
            setLoading(true)
            const supabase = getSupabase()

            const { data, error: fetchError } = await supabase
                .from("view_schemas")
                .select("*")
                .eq("project_id", projectId)
                .eq("view_type", viewType)
                .single()

            if (fetchError && fetchError.code !== "PGRST116") {
                // PGRST116 is "Rows not found", which is expected for new projects
                throw fetchError
            }

            if (data) {
                setSchema({
                    id: data.id,
                    projectId: data.project_id,
                    viewType: data.view_type as ViewType,
                    schema: data.schema as ViewSchemaData,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                })
            } else {
                // --- JUST-IN-TIME (JIT) MIGRATION ---
                // Project doesn't have a schema yet. Let's create a default one based on current fields.
                console.log(`[useViewSchema] No schema found for ${viewType}, creating JIT default...`)

                const defaultData = generateDefaultSchema(viewType, fieldDefinitions)

                const { data: newSchema, error: insertError } = await supabase
                    .from("view_schemas")
                    .insert([{
                        project_id: projectId,
                        view_type: viewType,
                        schema: defaultData
                    }])
                    .select()
                    .single()

                if (insertError) {
                    throw insertError
                }

                if (newSchema) {
                    setSchema({
                        id: newSchema.id,
                        projectId: newSchema.project_id,
                        viewType: newSchema.view_type as ViewType,
                        schema: newSchema.schema as ViewSchemaData,
                        createdAt: newSchema.created_at,
                        updatedAt: newSchema.updated_at,
                    })
                }
            }
        } catch (err: any) {
            console.error("[useViewSchema] Error:", err)
            setError(err)
            toast({
                title: "Error loading layout",
                description: err.message || "Failed to load view schema",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [projectId, viewType, fieldDefinitions, loadingFields, toast])

    useEffect(() => {
        fetchSchema()
    }, [fetchSchema])

    const saveSchema = async (newSchemaData: ViewSchemaData) => {
        if (!projectId || !schema?.id) return

        try {
            const supabase = getSupabase()

            // Optimistic update
            const oldSchema = { ...schema }
            setSchema({ ...schema, schema: newSchemaData })

            const { error: updateError } = await supabase
                .from("view_schemas")
                .update({ schema: newSchemaData })
                .eq("id", schema.id)

            if (updateError) {
                setSchema(oldSchema) // Revert on failure
                throw updateError
            }
        } catch (err: any) {
            console.error("[useViewSchema] Failed to save schema:", err)
            toast({
                title: "Failed to save layout",
                description: err.message || "Could not save your changes.",
                variant: "destructive"
            })
            throw err // Re-throw for component to handle (e.g. stop saving spinner)
        }
    }

    return {
        schema,
        loading: loading || loadingFields,
        error,
        refresh: fetchSchema,
        saveSchema
    }
}

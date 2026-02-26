"use client"

import { useEffect, useRef, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useWorkflows } from "@/hooks/use-workflows"
import { useProjectId } from "@/hooks/use-project-id"
import { useToast } from "@/hooks/use-toast"
import {
    onWorkflowEvent,
    evaluateTrigger,
    describeWorkflow,
    type WorkflowEvent,
} from "@/lib/workflow-engine"
import type { Workflow } from "@/lib/store"

/**
 * Workflow runner — subscribes to the in-memory event bus, evaluates all
 * active workflows against every incoming event, and executes matching
 * actions via Supabase.
 *
 * Mount once in layout.tsx:
 *   <WorkflowRunnerProvider />
 */

// ─── Action Executors ─────────────────────────────────────────────────

async function executeAction(workflow: Workflow, event: WorkflowEvent, projectId: string): Promise<boolean> {
    const supabase = getSupabase()
    const config = workflow.actionConfig
    const leadId = event.leadId

    try {
        switch (workflow.actionType) {
            // ── change_stage ──
            case "change_stage": {
                const stageName = config.stage_name as string | undefined
                if (!stageName) return false
                const { error } = await supabase
                    .from("leads")
                    .update({ stage: stageName, stage_changed_at: new Date().toISOString() })
                    .eq("id", leadId)
                return !error
            }

            // ── add_tag ──
            case "add_tag": {
                const tagName = config.tag_name as string | undefined
                if (!tagName) return false

                // Find or create the tag
                let tagId: string | null = null
                const { data: existingTags } = await supabase
                    .from("tags")
                    .select("id")
                    .eq("name", tagName)
                    .eq("project_id", projectId)
                    .limit(1)

                if (existingTags && existingTags.length > 0) {
                    tagId = existingTags[0].id
                } else {
                    const { data: newTag, error: tagErr } = await supabase
                        .from("tags")
                        .insert([{ name: tagName, color: "#6b7280", project_id: projectId }])
                        .select("id")
                        .single()
                    if (tagErr || !newTag) return false
                    tagId = newTag.id
                }

                const { error } = await supabase
                    .from("lead_tags")
                    .insert([{ lead_id: leadId, tag_id: tagId }])
                // Ignore duplicate key errors (tag already on lead)
                if (error && !error.message?.includes("duplicate")) return false
                return true
            }

            // ── remove_tag ──
            case "remove_tag": {
                const tagName = config.tag_name as string | undefined
                if (!tagName) return false

                const { data: tag } = await supabase
                    .from("tags")
                    .select("id")
                    .eq("name", tagName)
                    .eq("project_id", projectId)
                    .limit(1)
                    .single()

                if (!tag) return true // tag doesn't exist, nothing to remove
                const { error } = await supabase
                    .from("lead_tags")
                    .delete()
                    .eq("lead_id", leadId)
                    .eq("tag_id", tag.id)
                return !error
            }

            // ── create_task ──
            case "create_task": {
                const title = (config.title as string) || "Auto-created task"
                const dueDays = parseInt((config.due_days as string) || "1", 10)
                const dueAt = new Date()
                dueAt.setDate(dueAt.getDate() + dueDays)

                const { error } = await supabase
                    .from("tasks")
                    .insert([{
                        lead_id: leadId,
                        type: "custom",
                        title,
                        due_at: dueAt.toISOString(),
                        priority: "normal",
                        project_id: projectId,
                    }])
                return !error
            }

            // ── update_field ──
            case "update_field": {
                const fieldKey = config.field_key as string | undefined
                const value = config.value as string | undefined
                if (!fieldKey) return false

                // Check if it's a built-in field or custom field
                const builtInFields = ["company", "phone", "email", "website", "address", "segment", "lead_source"]
                if (builtInFields.includes(fieldKey)) {
                    const { error } = await supabase
                        .from("leads")
                        .update({ [fieldKey]: value ?? null })
                        .eq("id", leadId)
                    return !error
                }

                // Custom field — merge into custom_fields JSONB
                const { data: lead } = await supabase
                    .from("leads")
                    .select("custom_fields")
                    .eq("id", leadId)
                    .single()

                const currentFields = (lead?.custom_fields || {}) as Record<string, unknown>
                currentFields[fieldKey] = value
                const { error } = await supabase
                    .from("leads")
                    .update({ custom_fields: currentFields })
                    .eq("id", leadId)
                return !error
            }

            // ── send_notification ──
            case "send_notification": {
                const message = (config.message as string) || describeWorkflow(workflow)
                if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                    new Notification("CRM Workflow", { body: message })
                }
                return true
            }

            // ── enroll_sequence ──
            case "enroll_sequence": {
                const sequenceId = config.sequence_id as string | undefined
                if (!sequenceId) return false

                const { error } = await supabase
                    .from("sequence_enrollments")
                    .insert([{
                        lead_id: leadId,
                        sequence_id: sequenceId,
                        status: "active",
                        current_step: 0,
                        enrolled_at: new Date().toISOString(),
                    }])
                // Ignore duplicate enrollments
                if (error && !error.message?.includes("duplicate")) return false
                return true
            }

            default:
                console.warn(`[WorkflowRunner] Unknown action type: ${workflow.actionType}`)
                return false
        }
    } catch (err) {
        console.error(`[WorkflowRunner] Action execution error:`, err)
        return false
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useWorkflowRunner() {
    const { workflows, incrementExecution } = useWorkflows()
    const projectId = useProjectId()
    const { toast } = useToast()
    const workflowsRef = useRef(workflows)

    // Keep ref in sync so the event handler always sees the latest workflows
    useEffect(() => {
        workflowsRef.current = workflows
    }, [workflows])

    const handleEvent = useCallback(async (event: WorkflowEvent) => {
        if (!projectId) return

        const activeWorkflows = workflowsRef.current.filter((w) => w.isActive)
        if (activeWorkflows.length === 0) return

        for (const workflow of activeWorkflows) {
            if (!evaluateTrigger(event, workflow)) continue

            // Guard: prevent infinite loops (e.g. stage_change action triggering another stage_change event)
            const eventSourceKey = `wf_${workflow.id}_${event.type}_${event.leadId}`
            const recentKey = `__wf_guard_${eventSourceKey}`
            if (typeof sessionStorage !== "undefined") {
                const last = sessionStorage.getItem(recentKey)
                if (last && Date.now() - parseInt(last) < 5000) {
                    continue // Skip — already fired within 5s
                }
                sessionStorage.setItem(recentKey, Date.now().toString())
            }

            const success = await executeAction(workflow, event, projectId)

            if (success) {
                incrementExecution(workflow.id)
                toast({
                    title: `⚡ Workflow: ${workflow.name}`,
                    description: describeWorkflow(workflow),
                })
            }
        }
    }, [projectId, incrementExecution, toast])

    // Subscribe to the event bus
    useEffect(() => {
        const unsubscribe = onWorkflowEvent(handleEvent)
        return unsubscribe
    }, [handleEvent])
}

// ─── Provider Component (mount in layout.tsx) ─────────────────────────

export function WorkflowRunnerProvider() {
    useWorkflowRunner()

    // Request notification permission on first mount
    useEffect(() => {
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
            Notification.requestPermission()
        }
    }, [])

    return null // invisible provider
}

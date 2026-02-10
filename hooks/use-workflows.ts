"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Workflow, WorkflowTriggerType, WorkflowActionType } from "@/lib/store"

function mapWorkflowRow(row: Record<string, unknown>): Workflow {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    isActive: (row.is_active ?? row.isActive ?? true) as boolean,
    triggerType: (row.trigger_type ?? row.triggerType) as WorkflowTriggerType,
    triggerConfig: (row.trigger_config ?? row.triggerConfig ?? {}) as Record<string, unknown>,
    actionType: (row.action_type ?? row.actionType) as WorkflowActionType,
    actionConfig: (row.action_config ?? row.actionConfig ?? {}) as Record<string, unknown>,
    executionCount: (row.execution_count ?? row.executionCount ?? 0) as number,
    lastExecutedAt: (row.last_executed_at ?? row.lastExecutedAt) as string | undefined,
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

export function useWorkflows() {
  const { toast } = useToast()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWorkflows = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        if (!error.message?.includes("does not exist")) {
          console.warn("[useWorkflows]", error.message)
        }
        setWorkflows([])
        return
      }
      if (data) {
        setWorkflows(data.map((row: Record<string, unknown>) => mapWorkflowRow(row)))
      }
    } catch {
      setWorkflows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  const createWorkflow = useCallback(async (input: {
    name: string
    description?: string
    triggerType: WorkflowTriggerType
    triggerConfig: Record<string, unknown>
    actionType: WorkflowActionType
    actionConfig: Record<string, unknown>
  }) => {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("workflows")
        .insert([{
          name: input.name.trim(),
          description: input.description?.trim() || null,
          trigger_type: input.triggerType,
          trigger_config: input.triggerConfig,
          action_type: input.actionType,
          action_config: input.actionConfig,
        }])
        .select()
        .single()

      if (error) {
        toast({ variant: "destructive", title: "Failed to create workflow", description: error.message })
        return null
      }
      if (data) {
        const workflow = mapWorkflowRow(data as Record<string, unknown>)
        setWorkflows((prev) => [workflow, ...prev])
        return workflow
      }
      return null
    } catch {
      return null
    }
  }, [toast])

  const updateWorkflow = useCallback(async (id: string, input: Partial<{
    name: string
    description: string
    isActive: boolean
    triggerType: WorkflowTriggerType
    triggerConfig: Record<string, unknown>
    actionType: WorkflowActionType
    actionConfig: Record<string, unknown>
  }>) => {
    try {
      const updates: Record<string, unknown> = {}
      if (input.name !== undefined) updates.name = input.name.trim()
      if (input.description !== undefined) updates.description = input.description.trim() || null
      if (input.isActive !== undefined) updates.is_active = input.isActive
      if (input.triggerType !== undefined) updates.trigger_type = input.triggerType
      if (input.triggerConfig !== undefined) updates.trigger_config = input.triggerConfig
      if (input.actionType !== undefined) updates.action_type = input.actionType
      if (input.actionConfig !== undefined) updates.action_config = input.actionConfig

      const supabase = getSupabase()
      const { error } = await supabase.from("workflows").update(updates).eq("id", id)

      if (error) {
        toast({ variant: "destructive", title: "Failed to update workflow", description: error.message })
        return false
      }

      setWorkflows((prev) =>
        prev.map((w) => {
          if (w.id !== id) return w
          return { ...w, ...input }
        })
      )
      return true
    } catch {
      return false
    }
  }, [toast])

  const deleteWorkflow = useCallback(async (id: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("workflows").delete().eq("id", id)
      if (error) {
        toast({ variant: "destructive", title: "Failed to delete workflow", description: error.message })
        return false
      }
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      return true
    } catch {
      return false
    }
  }, [toast])

  const incrementExecution = useCallback(async (id: string) => {
    try {
      const supabase = getSupabase()
      const workflow = workflows.find((w) => w.id === id)
      if (!workflow) return
      await supabase
        .from("workflows")
        .update({
          execution_count: workflow.executionCount + 1,
          last_executed_at: new Date().toISOString(),
        })
        .eq("id", id)

      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === id
            ? { ...w, executionCount: w.executionCount + 1, lastExecutedAt: new Date().toISOString() }
            : w
        )
      )
    } catch {
      // silent
    }
  }, [workflows])

  return { workflows, loading, createWorkflow, updateWorkflow, deleteWorkflow, incrementExecution, refetch: fetchWorkflows }
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { useToast } from "@/hooks/use-toast"
import type {
  TaskTemplate,
  TemplateItem,
  TaskAssignment,
  TaskAssignmentItemData,
} from "@/lib/store"

// ─── Row Mappers ─────────────────────────────────────────────────────────────

function mapTemplateRow(row: Record<string, unknown>): TaskTemplate {
  return {
    id: row.id as string,
    projectId: (row.project_id ?? row.projectId) as string,
    name: row.name as string,
    description: (row.description ?? undefined) as string | undefined,
    items: (row.items ?? []) as TemplateItem[],
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

function mapAssignmentRow(row: Record<string, unknown>): TaskAssignment {
  return {
    id: row.id as string,
    projectId: (row.project_id ?? row.projectId) as string,
    leadId: (row.lead_id ?? row.leadId) as string,
    templateId: (row.template_id ?? row.templateId) as string,
    status: (row.status ?? "active") as TaskAssignment["status"],
    data: (row.data ?? {}) as Record<string, TaskAssignmentItemData>,
    completedAt: (row.completed_at ?? row.completedAt ?? undefined) as string | undefined,
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

// ─── Auto-complete helper ────────────────────────────────────────────────────

function allItemsDone(
  items: TemplateItem[],
  data: Record<string, TaskAssignmentItemData>
): boolean {
  for (const item of items) {
    if (item.type === "group" && item.children && item.children.length > 0) {
      if (!allItemsDone(item.children, data)) return false
    } else {
      if (!data[item.id]?.done) return false
    }
  }
  return items.length > 0
}

// ─── useTaskTemplates ────────────────────────────────────────────────────────

export function useTaskTemplates() {
  const { toast } = useToast()
  const projectId = useProjectId()
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    if (!projectId) { setTemplates([]); setLoading(false); return }
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("task_templates")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (error) {
        if (error.code === "42P01") { setTemplates([]); return }
        toast({ variant: "destructive", title: "Failed to load templates", description: error.message })
        setTemplates([])
        return
      }
      setTemplates((data ?? []).map((r: Record<string, unknown>) => mapTemplateRow(r)))
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const createTemplate = useCallback(async (input: { name: string; description?: string; items?: TemplateItem[] }): Promise<TaskTemplate | null> => {
    if (!projectId) return null
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("task_templates")
      .insert([{ project_id: projectId, name: input.name, description: input.description ?? null, items: input.items ?? [] }])
      .select()
      .single()
    if (error) {
      toast({ variant: "destructive", title: "Failed to create template", description: error.message })
      return null
    }
    const t = mapTemplateRow(data as Record<string, unknown>)
    setTemplates((prev) => [t, ...prev])
    return t
  }, [projectId, toast])

  const updateTemplate = useCallback(async (id: string, input: Partial<{ name: string; description: string; items: TemplateItem[] }>): Promise<boolean> => {
    const supabase = getSupabase()
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.description !== undefined) payload.description = input.description
    if (input.items !== undefined) payload.items = input.items
    const { error } = await supabase.from("task_templates").update(payload).eq("id", id)
    if (error) {
      toast({ variant: "destructive", title: "Failed to update template", description: error.message })
      return false
    }
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...input } : t)))
    return true
  }, [toast])

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    const supabase = getSupabase()
    const { error } = await supabase.from("task_templates").delete().eq("id", id)
    if (error) {
      toast({ variant: "destructive", title: "Failed to delete template", description: error.message })
      return false
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    return true
  }, [toast])

  return { templates, loading, refetch: fetchTemplates, createTemplate, updateTemplate, deleteTemplate }
}

// ─── useTaskAssignments ──────────────────────────────────────────────────────

export function useTaskAssignments(options?: { leadId?: string; templateId?: string }) {
  const { toast } = useToast()
  const projectId = useProjectId()
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    if (!projectId) { setAssignments([]); setLoading(false); return }
    setLoading(true)
    try {
      const supabase = getSupabase()
      let query = supabase
        .from("task_assignments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (options?.leadId) query = query.eq("lead_id", options.leadId)
      if (options?.templateId) query = query.eq("template_id", options.templateId)

      const { data, error } = await query
      if (error) {
        if (error.code === "42P01") { setAssignments([]); return }
        setAssignments([])
        return
      }
      setAssignments((data ?? []).map((r: Record<string, unknown>) => mapAssignmentRow(r)))
    } catch {
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [projectId, options?.leadId, options?.templateId])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  // Realtime sync
  useEffect(() => {
    if (!projectId) return
    const supabase = getSupabase()
    const channel = supabase
      .channel(`task_assignments_rt_${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignments", filter: `project_id=eq.${projectId}` },
        () => fetchAssignments()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [projectId, fetchAssignments])

  const assign = useCallback(async (leadId: string, templateId: string): Promise<TaskAssignment | null> => {
    if (!projectId) return null
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("task_assignments")
      .insert([{ project_id: projectId, lead_id: leadId, template_id: templateId }])
      .select()
      .single()
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already assigned", description: "This template is already assigned to this lead." })
      } else {
        toast({ variant: "destructive", title: "Failed to assign", description: error.message })
      }
      return null
    }
    const a = mapAssignmentRow(data as Record<string, unknown>)
    setAssignments((prev) => [a, ...prev])
    return a
  }, [projectId, toast])

  const batchAssign = useCallback(async (leadIds: string[], templateId: string): Promise<number> => {
    if (!projectId) return 0
    const supabase = getSupabase()
    const rows = leadIds.map((leadId) => ({ project_id: projectId, lead_id: leadId, template_id: templateId }))
    const { data, error } = await supabase
      .from("task_assignments")
      .upsert(rows, { onConflict: "lead_id,template_id", ignoreDuplicates: true })
      .select()
    if (error) {
      toast({ variant: "destructive", title: "Batch assign failed", description: error.message })
      return 0
    }
    const newAssignments = (data ?? []).map((r: Record<string, unknown>) => mapAssignmentRow(r))
    setAssignments((prev) => [...newAssignments, ...prev])
    return newAssignments.length
  }, [projectId, toast])

  const toggleItem = useCallback(async (
    assignmentId: string,
    itemId: string,
    templateItems: TemplateItem[]
  ) => {
    const assignment = assignments.find((a) => a.id === assignmentId)
    if (!assignment) return

    const current = assignment.data[itemId] ?? { done: false }
    const updatedData = { ...assignment.data, [itemId]: { ...current, done: !current.done } }

    // Check auto-complete
    const isComplete = allItemsDone(templateItems, updatedData)
    const updates: Record<string, unknown> = { data: updatedData }
    if (isComplete && assignment.status !== "completed") {
      updates.status = "completed"
      updates.completed_at = new Date().toISOString()
    } else if (!isComplete && assignment.status === "completed") {
      updates.status = "active"
      updates.completed_at = null
    }

    // Optimistic update
    setAssignments((prev) => prev.map((a) => a.id === assignmentId ? {
      ...a,
      data: updatedData,
      status: (updates.status as TaskAssignment["status"]) ?? a.status,
      completedAt: (updates.completed_at as string) ?? a.completedAt,
    } : a))

    const supabase = getSupabase()
    const { error } = await supabase.from("task_assignments").update(updates).eq("id", assignmentId)
    if (error) {
      setAssignments((prev) => prev.map((a) => a.id === assignmentId ? assignment : a))
    }
  }, [assignments])

  const updateItemValue = useCallback(async (
    assignmentId: string,
    itemId: string,
    value: string
  ) => {
    const assignment = assignments.find((a) => a.id === assignmentId)
    if (!assignment) return

    const current = assignment.data[itemId] ?? { done: false }
    const updatedData = { ...assignment.data, [itemId]: { ...current, value } }

    setAssignments((prev) => prev.map((a) => a.id === assignmentId ? { ...a, data: updatedData } : a))

    const supabase = getSupabase()
    await supabase.from("task_assignments").update({ data: updatedData }).eq("id", assignmentId)
  }, [assignments])

  const removeAssignment = useCallback(async (id: string): Promise<boolean> => {
    const supabase = getSupabase()
    const { error } = await supabase.from("task_assignments").delete().eq("id", id)
    if (error) {
      toast({ variant: "destructive", title: "Failed to remove", description: error.message })
      return false
    }
    setAssignments((prev) => prev.filter((a) => a.id !== id))
    return true
  }, [toast])

  return {
    assignments,
    loading,
    refetch: fetchAssignments,
    assign,
    batchAssign,
    toggleItem,
    updateItemValue,
    removeAssignment,
  }
}

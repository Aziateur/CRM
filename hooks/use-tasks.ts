"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useProjectId } from "@/hooks/use-project-id"
import type { Task, TaskType, TaskPriority } from "@/lib/store"

function mapTaskRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    leadId: (row.lead_id ?? row.leadId) as string,
    contactId: (row.contact_id ?? row.contactId) as string | undefined,
    attemptId: (row.attempt_id ?? row.attemptId) as string | undefined,
    type: (row.type ?? "custom") as TaskType,
    title: row.title as string,
    description: (row.description ?? undefined) as string | undefined,
    dueAt: (row.due_at ?? row.dueAt) as string,
    completedAt: (row.completed_at ?? row.completedAt) as string | undefined,
    priority: (row.priority ?? "normal") as TaskPriority,
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

interface CreateTaskInput {
  leadId: string
  contactId?: string
  attemptId?: string
  type: TaskType
  title: string
  description?: string
  dueAt: string
  priority?: TaskPriority
}

export function useTasks(options?: { leadId?: string }) {
  const { toast } = useToast()
  const projectId = useProjectId()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!projectId) { setTasks([]); setLoading(false); return }
    setLoading(true)
    try {
      const supabase = getSupabase()
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .is("completed_at", null)
        .order("due_at", { ascending: true })

      if (options?.leadId) {
        query = query.eq("lead_id", options.leadId)
      }

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          setTasks([])
          return
        }
        console.warn("[useTasks] Error:", error.message)
        setTasks([])
        return
      }

      if (data) {
        setTasks(data.map((row: Record<string, unknown>) => mapTaskRow(row)))
      }
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [options?.leadId, projectId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Realtime: auto-sync when tasks change
  useEffect(() => {
    if (!projectId) return
    const supabase = getSupabase()
    const channel = supabase
      .channel(`tasks_rt_${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        () => fetchTasks()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [projectId, fetchTasks])

  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task | null> => {
    if (!projectId) return null
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("tasks")
        .insert([{
          lead_id: input.leadId,
          contact_id: input.contactId ?? null,
          attempt_id: input.attemptId ?? null,
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          due_at: input.dueAt,
          priority: input.priority ?? "normal",
          project_id: projectId,
        }])
        .select()
        .single()

      if (error) {
        console.warn("[useTasks] Create failed:", error.message)
        return null
      }

      if (data) {
        const task = mapTaskRow(data as Record<string, unknown>)
        setTasks((prev) => [...prev, task].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()))
        return task
      }
      return null
    } catch {
      return null
    }
  }, [projectId])

  const completeTask = useCallback(async (taskId: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from("tasks")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", taskId)

      if (error) {
        toast({ variant: "destructive", title: "Failed to complete task", description: error.message })
        return
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    } catch {
      // silent
    }
  }, [toast])

  const rescheduleTask = useCallback(async (taskId: string, newDueAt: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from("tasks")
        .update({ due_at: newDueAt })
        .eq("id", taskId)

      if (error) {
        toast({ variant: "destructive", title: "Failed to reschedule", description: error.message })
        return
      }

      setTasks((prev) =>
        prev
          .map((t) => (t.id === taskId ? { ...t, dueAt: newDueAt } : t))
          .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
      )
    } catch {
      // silent
    }
  }, [toast])

  return { tasks, setTasks, loading, refetch: fetchTasks, createTask, completeTask, rescheduleTask }
}

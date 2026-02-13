"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export type ActivityType =
  | "call"
  | "email"
  | "sms"
  | "note"
  | "stage_change"
  | "tag_change"
  | "field_change"
  | "task_created"
  | "task_completed"

export interface LeadActivity {
  id: string
  leadId: string
  activityType: ActivityType
  title: string
  description?: string
  metadata: Record<string, unknown>
  createdAt: string
}

function mapActivityRow(row: Record<string, unknown>): LeadActivity {
  return {
    id: row.id as string,
    leadId: (row.lead_id ?? row.leadId) as string,
    activityType: (row.activity_type ?? row.activityType) as ActivityType,
    title: (row.title ?? "") as string,
    description: (row.description ?? undefined) as string | undefined,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

export function useLeadActivities(leadId: string | null) {
  const { toast } = useToast()
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [loading, setLoading] = useState(false)

  const fetchActivities = useCallback(async () => {
    if (!leadId) {
      setActivities([])
      return
    }
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) {
        if (!error.message?.includes("does not exist")) {
          console.warn("[useLeadActivities]", error.message)
        }
        setActivities([])
        return
      }

      if (data) {
        setActivities(data.map((row: Record<string, unknown>) => mapActivityRow(row)))
      }
    } catch {
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const addNote = useCallback(async (text: string) => {
    if (!leadId || !text.trim()) return null
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("lead_activities")
        .insert([{
          lead_id: leadId,
          activity_type: "note",
          title: "Note",
          description: text.trim(),
        }])
        .select()
        .single()

      if (error) {
        toast({ variant: "destructive", title: "Failed to save note", description: error.message })
        return null
      }

      if (data) {
        const activity = mapActivityRow(data as Record<string, unknown>)
        setActivities((prev) => [activity, ...prev])
        return activity
      }
      return null
    } catch {
      return null
    }
  }, [leadId, toast])

  const logActivity = useCallback(async (type: ActivityType, title: string, description?: string, metadata?: Record<string, unknown>) => {
    if (!leadId) return null
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("lead_activities")
        .insert([{
          lead_id: leadId,
          activity_type: type,
          title,
          description: description ?? null,
          metadata: metadata ?? {},
        }])
        .select()
        .single()

      if (error) return null

      if (data) {
        const activity = mapActivityRow(data as Record<string, unknown>)
        setActivities((prev) => [activity, ...prev])
        return activity
      }
      return null
    } catch {
      return null
    }
  }, [leadId])

  return { activities, loading, addNote, logActivity, refetch: fetchActivities }
}

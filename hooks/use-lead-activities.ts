"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export type ActivityType = "note" | "stage_change" | "field_edit" | "created" | "imported"

export interface LeadActivity {
  id: string
  leadId: string
  activityType: ActivityType
  description: string
  metadata: Record<string, unknown>
  createdAt: string
}

function mapActivityRow(row: Record<string, unknown>): LeadActivity {
  return {
    id: row.id as string,
    leadId: (row.lead_id ?? row.leadId) as string,
    activityType: (row.activity_type ?? row.activityType) as ActivityType,
    description: row.description as string,
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
        // Table may not exist yet — fail silently
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

  const logActivity = useCallback(async (type: ActivityType, description: string, metadata?: Record<string, unknown>) => {
    if (!leadId) return null
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("lead_activities")
        .insert([{
          lead_id: leadId,
          activity_type: type,
          description,
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

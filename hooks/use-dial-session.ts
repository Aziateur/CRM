"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { getClientId } from "@/lib/client-id"

export interface DialSession {
  id: string
  clientId: string
  startedAt: string
  endedAt?: string
  status: "active" | "completed" | "abandoned"
  target: number | null
  experiment: string | null
  currentLeadId: string | null
  createdAt: string
}

function mapSessionRow(row: Record<string, unknown>): DialSession {
  return {
    id: row.id as string,
    clientId: (row.client_id ?? row.clientId) as string,
    startedAt: (row.started_at ?? row.startedAt) as string,
    endedAt: (row.ended_at ?? row.endedAt) as string | undefined,
    status: (row.status ?? "active") as DialSession["status"],
    target: (row.target ?? null) as number | null,
    experiment: (row.experiment ?? null) as string | null,
    currentLeadId: (row.current_lead_id ?? row.currentLeadId ?? null) as string | null,
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

export function useDialSession() {
  const projectId = useProjectId()
  const [session, setSession] = useState<DialSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasActiveSession, setHasActiveSession] = useState(false)

  // Check for existing active session on mount
  useEffect(() => {
    const check = async () => {
      if (!projectId) { setLoading(false); return }
      setLoading(true)
      try {
        const supabase = getSupabase()
        const clientId = getClientId()
        const { data, error } = await supabase
          .from("dial_sessions")
          .select("*")
          .eq("client_id", clientId)
          .eq("project_id", projectId)
          .eq("status", "active")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          if (!error.message?.includes("does not exist")) {
            console.warn("[useDialSession]", error.message)
          }
          setHasActiveSession(false)
          return
        }

        if (data) {
          setSession(mapSessionRow(data as Record<string, unknown>))
          setHasActiveSession(true)
        } else {
          setHasActiveSession(false)
        }
      } catch {
        setHasActiveSession(false)
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [projectId])

  const startSession = useCallback(async (target: number, experiment?: string, mode?: string): Promise<DialSession | null> => {
    if (!projectId) return null
    try {
      const supabase = getSupabase()
      const clientId = getClientId()
      const { data, error } = await supabase
        .from("dial_sessions")
        .insert([{
          client_id: clientId,
          target,
          experiment: experiment || null,
          mode: mode || "all",
          status: "active",
          started_at: new Date().toISOString(),
          project_id: projectId,
        }])
        .select()
        .single()

      if (error) {
        console.warn("[useDialSession] Start failed:", error.message)
        return null
      }

      if (data) {
        const s = mapSessionRow(data as Record<string, unknown>)
        setSession(s)
        setHasActiveSession(true)
        return s
      }
      return null
    } catch {
      return null
    }
  }, [projectId])

  const resumeSession = useCallback(async (): Promise<DialSession | null> => {
    return session
  }, [session])

  const updateCurrentLead = useCallback(async (leadId: string) => {
    if (!session) return
    try {
      const supabase = getSupabase()
      await supabase
        .from("dial_sessions")
        .update({ current_lead_id: leadId })
        .eq("id", session.id)

      setSession((prev) => prev ? { ...prev, currentLeadId: leadId } : null)
    } catch {
      // non-critical
    }
  }, [session])

  const endSession = useCallback(async () => {
    if (!session) return
    try {
      const supabase = getSupabase()
      await supabase
        .from("dial_sessions")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", session.id)

      setSession(null)
      setHasActiveSession(false)
    } catch {
      // non-critical
    }
  }, [session])

  const abandonSession = useCallback(async () => {
    if (!session) return
    try {
      const supabase = getSupabase()
      await supabase
        .from("dial_sessions")
        .update({
          status: "abandoned",
          ended_at: new Date().toISOString(),
        })
        .eq("id", session.id)

      setSession(null)
      setHasActiveSession(false)
    } catch {
      // non-critical
    }
  }, [session])

  return {
    session,
    loading,
    hasActiveSession,
    startSession,
    resumeSession,
    updateCurrentLead,
    endSession,
    abandonSession,
  }
}

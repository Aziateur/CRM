"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Attempt } from "@/lib/store"

export function mapAttemptRow(a: Record<string, unknown>): Attempt {
  return {
    id: a.id as string,
    leadId: (a.lead_id || a.leadId) as string,
    contactId: (a.contact_id || a.contactId) as string | undefined,
    timestamp: a.timestamp as string,
    outcome: a.outcome as Attempt["outcome"],
    why: (a.why || undefined) as Attempt["why"],
    repMistake: (a.rep_mistake || a.repMistake || undefined) as Attempt["repMistake"],
    dmReached: (a.dm_reached ?? a.dmReached ?? false) as boolean,
    nextAction: (a.next_action || a.nextAction) as Attempt["nextAction"],
    nextActionAt: (a.next_action_at || a.nextActionAt) as string | undefined,
    note: (a.note || undefined) as string | undefined,
    durationSec: ((a.duration_sec ?? a.durationSec ?? 0) as number),
    experimentTag: (a.experiment_tag || a.experimentTag) as string | undefined,
    sessionId: (a.session_id || a.sessionId) as string | undefined,
    createdAt: (a.created_at || a.createdAt || new Date().toISOString()) as string,
    recordingUrl: (a.recording_url || a.call_recording_url) as string | undefined,
    recordingDurationSec: a.call_duration_seconds as number | undefined,
    callTranscriptText: a.call_transcript_text as string | undefined,
    transcript: a.transcript as Attempt["transcript"],
  }
}

export function useAttempts() {
  const { toast } = useToast()
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAttempts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabase()
      const { data, error: fetchError } = await supabase
        .from("v_attempts_enriched")
        .select("*")
        .order("created_at", { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        toast({ variant: "destructive", title: "Failed to load attempts", description: fetchError.message })
        return
      }

      if (data) {
        setAttempts(data.map((row: Record<string, unknown>) => mapAttemptRow(row)))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAttempts()
  }, [fetchAttempts])

  return { attempts, setAttempts, loading, error, refetch: fetchAttempts }
}

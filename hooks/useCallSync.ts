"use client"

import { useState, useEffect, useRef } from "react"
import { getSupabase } from "@/lib/supabase"

export interface CallArtifacts {
  recording_url: string | null
  transcript_text: string | null
  status: string
}

interface UseCallSyncResult {
  loading: boolean
  artifacts: CallArtifacts | null
  error: string | null
  retry: () => void
  status: 'idle' | 'polling' | 'partial' | 'completed' | 'timeout'
  attemptId: string | null
}

export function useCallSync(attemptId: string | null, callSessionId: string | null): UseCallSyncResult {
  const [loading, setLoading] = useState(false)
  const [artifacts, setArtifacts] = useState<CallArtifacts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'polling' | 'partial' | 'completed' | 'timeout'>('idle')
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes
  const POLLING_INTERVAL_MS = 5000 // 5 seconds

  const stopPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    intervalRef.current = null
    timeoutRef.current = null
  }

  const checkSupabase = async () => {
    if (!attemptId && !callSessionId) return

    try {
      const supabase = getSupabase()
      
      console.log(`[CallSync] Polling view... attemptId=${attemptId} callSessionId=${callSessionId}`)

      // Preferred: Query view by attempt_id if available, otherwise call_session_id
      let query = supabase.from('v_calls_with_artifacts').select('*')
      
      if (attemptId) {
        query = query.eq('attempt_id', attemptId)
      } else if (callSessionId) {
        query = query.eq('call_session_id', callSessionId)
      }

      const { data, error: dbError } = await query.limit(1).single()

      if (dbError) {
        // Ignore "PGRST116" (no rows) as we are polling for creation/updates
        if (dbError.code !== 'PGRST116') {
          console.error("[CallSync] DB Error:", dbError)
        }
        return
      }

      if (data) {
        console.log("[CallSync] Found data:", { 
          rec: !!data.recording_url, 
          trans: !!data.transcript_text,
          status: data.status
        })

        const hasRec = !!data.recording_url
        const hasTrans = !!data.transcript_text
        const isComplete = hasRec && hasTrans

        // Update state if we have anything interesting
        if (hasRec || hasTrans) {
          setArtifacts({
            recording_url: data.recording_url,
            transcript_text: data.transcript_text,
            status: data.status
          })
          
          if (isComplete) {
            setStatus('completed')
            setLoading(false)
            stopPolling()
            console.log("[CallSync] Sync Complete: All artifacts found.")
          } else {
            setStatus('partial')
            // Don't stop polling if partial, we want both if possible
          }
        }
      }
    } catch (err) {
      console.error("[CallSync] Unexpected error:", err)
    }
  }

  const startPolling = () => {
    if (status === 'completed') return
    
    console.log(`[CallSync] Starting poll logic.`)
    setStatus('polling')
    setLoading(true)
    startTimeRef.current = Date.now()

    // Immediate check
    checkSupabase()

    // Interval
    intervalRef.current = setInterval(checkSupabase, POLLING_INTERVAL_MS)

    // Timeout
    timeoutRef.current = setTimeout(() => {
      if (status !== 'completed') {
        console.log("[CallSync] Timeout reached")
        setStatus('timeout')
        setLoading(false)
        stopPolling()
      }
    }, TIMEOUT_MS)
  }

  const retry = () => {
    stopPolling()
    setStatus('idle')
    setTimeout(() => startPolling(), 100)
  }

  useEffect(() => {
    // Only run if sandbox calls enabled and IDs are present
    if (process.env.NEXT_PUBLIC_SANDBOX_CALLS === 'true' && (attemptId || callSessionId)) {
      startPolling()
    }

    return () => stopPolling()
  }, [attemptId, callSessionId])

  return { loading, artifacts, error, retry, status, attemptId }
}

"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { Topbar } from "@/components/topbar"
import { DialContextPanel } from "@/components/dial-context-panel"
import { MissionControl } from "@/components/mission-control"
import { CallPrepPanel } from "@/components/call-prep-panel"
import {
  DialSetupScreen,
  SessionProgressBar,
  LeadCallCard,
  OutcomeLogger,
  RecentAttemptsList,
  FrictionButton,
} from "@/components/dial-session"
import { useExperimentsQuery, type Experiment as ExperimentObj } from "@/queries/experiments"
import { useLeads } from "@/hooks/use-leads"
import { useAttempts } from "@/hooks/use-attempts"
import { useTasks } from "@/hooks/use-tasks"
import { useDialQueue } from "@/hooks/use-dial-queue"
import { useDialSession } from "@/hooks/use-dial-session"
import { useDialModes, type DialMode } from "@/hooks/use-dial-modes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { XCircle } from "lucide-react"
import {
  getDefaultNextAction,
  getDefaultTaskForOutcome,
  isDmReached,
  calculateSessionMetrics,
  attemptOutcomeOptions,
  OUTCOMES,
  type Attempt,
  type AttemptOutcome,
  type WhyReason,
  type RepMistake,
} from "@/lib/store"
import { useFramework } from "@/hooks/use-framework"
import { useSignals } from "@/hooks/use-signals"
import { useFrictionCategories, useFrictionLogs } from "@/hooks/use-friction"
import { useCategories } from "@/hooks/use-categories"
import { useToast } from "@/hooks/use-toast"
import { useProjectId } from "@/hooks/use-project-id"
import { emitWorkflowEvent } from "@/lib/workflow-engine"

type SessionState = "setup" | "dialing" | "logging"

export default function DialSessionPage() {
  const router = useRouter()

  // Data hooks
  const { leads } = useLeads({ withContacts: true })
  const { attempts: allAttempts, setAttempts: setAllAttempts } = useAttempts()
  const [rulesShownIds, setRulesShownIds] = useState<string[]>([])
  const { tasks: allTasks, refetch: refetchTasks } = useTasks()

  // Friction logging (Phase 1 — Pain Button)
  const { activeCategories: frictionCategories } = useFrictionCategories()
  const { logFriction } = useFrictionLogs()
  const { activeCategories: rootCauseCategories } = useCategories("root_cause_type")
  const frictionRootCauses = rootCauseCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))

  // Dial modes
  const { modes } = useDialModes(leads, allAttempts, allTasks)
  const [selectedMode, setSelectedMode] = useState<DialMode | null>(null)

  // Dial queue (filtered by selected mode)
  const { queue } = useDialQueue(leads, allAttempts, allTasks, selectedMode)

  // Session persistence
  const {
    session: persistedSession,
    loading: sessionLoading,
    hasActiveSession,
    startSession: startPersistedSession,
    updateCurrentLead,
    endSession: endPersistedSession,
    abandonSession,
  } = useDialSession()

  // Local state
  const [pageState, setPageState] = useState<SessionState>("setup")
  const [sessionTarget, setSessionTarget] = useState(20)
  const [selectedExperiment, setSelectedExperiment] = useState<string>("none")
  const { activeExperiments } = useExperimentsQuery()
  const [selectedExperimentObj, setSelectedExperimentObj] = useState<ExperimentObj | null>(null)
  const [variantCursor, setVariantCursor] = useState(0)
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
  const [sessionAttempts, setSessionAttempts] = useState<Attempt[]>([])

  // Framework + signals
  const { activePhase, activeFocusLever, actionMarker, winMarker } = useFramework()
  const { setAttemptSignal } = useSignals()
  const { toast } = useToast()
  const projectId = useProjectId()
  const [actionSignal, setActionSignal] = useState<boolean | null>(null)
  const [winSignal, setWinSignal] = useState<boolean | null>(null)
  const [consecutiveSkips, setConsecutiveSkips] = useState(0)

  // Call state
  const [isOnCall, setIsOnCall] = useState(false)
  const [callStartTime, setCallStartTime] = useState<Date | null>(null)
  const currentCallSessionIdRef = useRef<string | null>(null)

  // Dial method
  const [dialMethod, setDialMethod] = useState<"app" | "web">("app")

  // Log state
  const [selectedOutcome, setSelectedOutcome] = useState<AttemptOutcome | null>(null)
  const [selectedWhy, setSelectedWhy] = useState<WhyReason | null>(null)
  const [selectedRepMistake, setSelectedRepMistake] = useState<RepMistake | null>(null)
  const [followUpDays, setFollowUpDays] = useState<number | null>(null)
  const [customFollowUpDays, setCustomFollowUpDays] = useState("")
  const [noteText, setNoteText] = useState("")
  const [showDetail, setShowDetail] = useState(false)

  // Session timing
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)

  // Evidence queue
  const ENABLE_EVIDENCE_QUEUE = true
  const [pendingEvidence, setPendingEvidence] = useState<Record<string, { addedAt: number; expiresAt: number }>>({})
  const [callSessionMap, setCallSessionMap] = useState<Record<string, { openphone_call_id: string | null }>>({})

  // Current queue item
  const currentItem = queue[currentQueueIndex] || null
  const currentLead = currentItem?.lead || null

  // Derived
  const showWhyField = selectedOutcome === "DM reached → No interest"
  const computedNextAction = selectedOutcome
    ? getDefaultNextAction(selectedOutcome, selectedWhy || undefined)
    : "Call again"
  const needsFollowUp = computedNextAction === "Call again" || computedNextAction === "Follow up"
  const canSave = selectedOutcome && (!showWhyField || selectedWhy)

  const defaultFollowUpDays = useMemo(() => {
    if (!selectedOutcome) return null
    const taskDef = getDefaultTaskForOutcome(selectedOutcome, selectedWhy || undefined, "")
    return taskDef?.dueDays ?? null
  }, [selectedOutcome, selectedWhy])

  const effectiveFollowUpDays = followUpDays ?? defaultFollowUpDays

  const pace = useMemo(() => {
    if (!sessionStartTime || sessionAttempts.length === 0) return null
    const hoursElapsed = (Date.now() - sessionStartTime.getTime()) / (1000 * 60 * 60)
    if (hoursElapsed < 0.01) return null
    return Math.round((sessionAttempts.length / hoursElapsed) * 10) / 10
  }, [sessionStartTime, sessionAttempts])

  const sessionMetrics = calculateSessionMetrics(sessionAttempts)

  // ─── Initiate call ───
  const initiateCall = useCallback(async () => {
    if (!currentLead?.phone) return

    let e164Number = currentLead.phone.replace(/[^+\d]/g, "")
    if (/^\d{10}$/.test(e164Number)) e164Number = `+1${e164Number}`
    else if (/^1\d{10}$/.test(e164Number)) e164Number = `+${e164Number}`
    else if (!e164Number.startsWith("+")) e164Number = `+${e164Number}`

    try { await navigator.clipboard.writeText(e164Number) } catch { /* ignore */ }

    if (dialMethod === "app") {
      window.location.href = `openphone://dial?number=${encodeURIComponent(e164Number)}&action=call`
    } else {
      window.open("https://my.openphone.com", "openphone")
      toast({ title: "Number copied", description: `${e164Number} — paste in your OpenPhone tab` })
    }

    const supabase = getSupabase()
    const { data, error } = await supabase.from("call_sessions").insert([{
      lead_id: currentLead.id, phone_e164: e164Number, direction: "outgoing",
      status: "initiated", started_at: new Date().toISOString(), project_id: projectId,
    }]).select("id").single()

    if (error) console.error("Error creating call session:", error)
    else if (data) currentCallSessionIdRef.current = data.id

    setIsOnCall(true)
    setCallStartTime(new Date())
  }, [currentLead, projectId, dialMethod, toast])

  // ─── Supabase Realtime: Auto-detect call end ───
  useEffect(() => {
    if (!isOnCall || !currentCallSessionIdRef.current) return
    const supabase = getSupabase()
    const sessionId = currentCallSessionIdRef.current

    const channel = supabase
      .channel(`call-session-${sessionId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "call_sessions",
        filter: `id=eq.${sessionId}`,
      }, (payload: { new: { status?: string } }) => {
        if (payload.new.status === "completed") {
          endCall()
          toast({ title: "Call ended", description: "Detected from OpenPhone — ready to log" })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isOnCall, toast])

  // Reset form when outcome changes
  useEffect(() => {
    setSelectedWhy(null)
    setSelectedRepMistake(null)
    setFollowUpDays(null)
    setCustomFollowUpDays("")
  }, [selectedOutcome])

  // Update persisted session when lead changes
  useEffect(() => {
    if (currentLead && pageState === "dialing") updateCurrentLead(currentLead.id)
  }, [currentLead?.id, pageState])

  // ─── Session actions ───
  const handleStartSession = async () => {
    if (!selectedMode) return
    const experimentIdForSession = selectedExperimentObj?.id || (selectedExperiment === "none" ? undefined : selectedExperiment)
    const newSession = await startPersistedSession(sessionTarget, experimentIdForSession, selectedMode)

    if (newSession && projectId && queue.length > 0) {
      try {
        const supabase = getSupabase()
        const items = queue.map((item, idx) => ({
          dial_session_id: newSession.id, lead_id: item.lead.id, position: idx,
          source: item.source || selectedMode, reason: item.reason,
          task_id: item.task?.id || null, status: "pending", project_id: projectId,
        }))
        await supabase.from("dial_session_items").insert(items)
      } catch (err) { console.warn("[dial-session] Queue snapshot failed:", err) }
    }

    setSessionStartTime(new Date())
    setSessionAttempts([])
    setCurrentQueueIndex(0)
    setPageState("dialing")
  }

  const handleResumeSession = async () => {
    if (persistedSession?.currentLeadId) {
      const idx = queue.findIndex((q) => q.lead.id === persistedSession.currentLeadId)
      setCurrentQueueIndex(idx >= 0 ? idx : 0)
    }
    setSessionTarget(persistedSession?.target || 20)
    const storedExp = persistedSession?.experiment || "none"
    setSelectedExperiment(storedExp)

    if (storedExp && storedExp !== "none") {
      const matchedExp = activeExperiments.find(e => e.id === storedExp || e.name === storedExp)
      if (matchedExp) { setSelectedExperimentObj(matchedExp); setVariantCursor(0) }
    }

    setSessionStartTime(new Date(persistedSession?.startedAt || Date.now()))
    setSessionAttempts([])
    setPageState("dialing")
  }

  const handleAbandonSession = async () => { await abandonSession(); setPageState("setup") }

  const handleEndSession = async () => {
    await endPersistedSession()
    setIsOnCall(false)
    setCallStartTime(null)
    router.push("/batch-review")
  }

  const endCall = () => {
    setIsOnCall(false)
    setPageState("logging")
    setSelectedOutcome(null); setSelectedWhy(null); setSelectedRepMistake(null)
    setFollowUpDays(null); setCustomFollowUpDays(""); setShowDetail(false); setNoteText("")
    setActionSignal(null); setWinSignal(null)
  }

  const skipLead = () => {
    if (currentQueueIndex < queue.length - 1) setCurrentQueueIndex(currentQueueIndex + 1)
  }

  // ─── VM Drop (auto-log "No connect" + advance) ───
  const handleVmDrop = useCallback(async () => {
    if (!currentLead) return

    const attemptId = crypto.randomUUID()
    const attemptData = {
      id: attemptId, lead_id: currentLead.id, timestamp: new Date().toISOString(),
      outcome: OUTCOMES.NO_CONNECT.value, why: null, rep_mistake: null,
      dm_reached: false, next_action: "Call again",
      note: "VM Drop",
      experiment_tag: selectedExperimentObj ? null : (selectedExperiment === "none" ? null : selectedExperiment),
      experiment_id: selectedExperimentObj?.id || null,
      variant_id: selectedExperimentObj && selectedExperimentObj.variants.length > 0
        ? selectedExperimentObj.variants[variantCursor % selectedExperimentObj.variants.length].id
        : null,
      session_id: persistedSession?.id || null, duration_sec: 0,
      project_id: projectId, rules_shown: rulesShownIds,
    }

    const supabase = getSupabase()
    const { data, error } = await supabase.from("attempts").insert([attemptData]).select().single()
    if (error) { console.error("Error logging VM drop:", error); return }

    if (data) {
      const attempt: Attempt = {
        id: data.id, leadId: data.lead_id, timestamp: data.timestamp,
        outcome: data.outcome, why: data.why, repMistake: data.rep_mistake,
        dmReached: data.dm_reached, nextAction: data.next_action, note: data.note,
        experimentTag: data.experiment_tag, sessionId: data.session_id,
        durationSec: data.duration_sec, createdAt: data.created_at,
        recordingUrl: undefined, callTranscriptText: undefined, rulesShown: data.rules_shown ?? [],
      }
      setSessionAttempts((prev) => [attempt, ...prev])
      setAllAttempts((prev) => [attempt, ...prev])

      // Link call_session if present
      if (currentCallSessionIdRef.current) {
        supabase.from("call_sessions").update({ attempt_id: data.id })
          .eq("id", currentCallSessionIdRef.current)
          .then(({ error: linkError }) => {
            if (linkError) console.warn("[vmDrop] Failed to link call_session:", linkError.message)
          })
        currentCallSessionIdRef.current = null
      }

      // Auto-create follow-up task (2 days for VM drops)
      const dueAt = new Date()
      dueAt.setDate(dueAt.getDate() + 2)
      supabase.from("tasks").insert([{
        lead_id: currentLead.id, attempt_id: data.id, type: "follow_up",
        title: `Follow up after VM — ${currentLead.company}`,
        due_at: dueAt.toISOString(), priority: "normal", project_id: projectId,
      }]).then(({ error: taskError }) => {
        if (taskError) console.warn("[vmDrop] Auto-task failed:", taskError.message)
        else refetchTasks()
      })
    }

    setIsOnCall(false)
    setCallStartTime(null)
    toast({ title: "VM Drop logged", description: `${currentLead.company} — advancing to next` })

    if (currentQueueIndex < queue.length - 1) setCurrentQueueIndex(currentQueueIndex + 1)
    setPageState("dialing")
  }, [currentLead, projectId, selectedExperimentObj, selectedExperiment, variantCursor, persistedSession, rulesShownIds, currentQueueIndex, queue.length, toast])

  // ─── Log attempt ───
  const logAttempt = async () => {
    if (!currentLead || !selectedOutcome || !canSave) return

    const attemptId = crypto.randomUUID()
    const attemptData = {
      id: attemptId, lead_id: currentLead.id, timestamp: new Date().toISOString(),
      outcome: selectedOutcome, why: selectedWhy || null, rep_mistake: selectedRepMistake || null,
      dm_reached: isDmReached(selectedOutcome), next_action: computedNextAction,
      note: noteText || null,
      experiment_tag: selectedExperimentObj ? null : (selectedExperiment === "none" ? null : selectedExperiment),
      experiment_id: selectedExperimentObj?.id || null,
      variant_id: selectedExperimentObj && selectedExperimentObj.variants.length > 0
        ? selectedExperimentObj.variants[variantCursor % selectedExperimentObj.variants.length].id
        : null,
      session_id: persistedSession?.id || null, duration_sec: 0,
      project_id: projectId, rules_shown: rulesShownIds,
    }

    const supabase = getSupabase()
    const { data, error } = await supabase.from("attempts").insert([attemptData]).select().single()
    if (error) { console.error("Error logging attempt:", error); return }

    if (data) {
      const attempt: Attempt = {
        id: data.id, leadId: data.lead_id, timestamp: data.timestamp,
        outcome: data.outcome, why: data.why, repMistake: data.rep_mistake,
        dmReached: data.dm_reached, nextAction: data.next_action, note: data.note,
        experimentTag: data.experiment_tag, sessionId: data.session_id,
        durationSec: data.duration_sec, createdAt: data.created_at,
        recordingUrl: undefined, callTranscriptText: undefined, rulesShown: data.rules_shown ?? [],
      }

      if (selectedExperimentObj && selectedExperimentObj.variants.length > 0) {
        setVariantCursor(prev => prev + 1)
      }

      // Store signals in Supabase
      const signalRecorded = actionSignal !== null || winSignal !== null
      if (activePhase.actionMarkerKey) {
        setAttemptSignal(attemptId, activePhase.actionMarkerKey, actionSignal ?? false)
      }
      if (activePhase.winMarkerKey && winSignal !== null) {
        setAttemptSignal(attemptId, activePhase.winMarkerKey, winSignal)
      }

      if (!signalRecorded && activePhase.actionMarkerKey) {
        const newSkips = consecutiveSkips + 1
        setConsecutiveSkips(newSkips)
        if (newSkips >= 10 && newSkips % 10 === 0) {
          toast({ title: "No focus marks in 10 calls", description: "Press Y/N in the logger to track your practice." })
        }
      } else { setConsecutiveSkips(0) }

      setSessionAttempts((prev) => [attempt, ...prev])
      setAllAttempts((prev) => [attempt, ...prev])

      emitWorkflowEvent({
        type: "outcome_logged", leadId: currentLead.id,
        payload: { outcome: selectedOutcome, why: selectedWhy || undefined },
        timestamp: new Date().toISOString(),
      })

      if (ENABLE_EVIDENCE_QUEUE) {
        setPendingEvidence((prev) => ({
          ...prev, [data.id]: { addedAt: Date.now(), expiresAt: Date.now() + 180_000 },
        }))
      }

      // Auto-create follow-up task
      if (needsFollowUp && effectiveFollowUpDays) {
        const taskDef = getDefaultTaskForOutcome(selectedOutcome, selectedWhy || undefined, currentLead.company)
        if (taskDef) {
          const dueAt = new Date()
          dueAt.setDate(dueAt.getDate() + effectiveFollowUpDays)
          supabase.from("tasks").insert([{
            lead_id: currentLead.id, attempt_id: data.id, type: taskDef.type,
            title: taskDef.title, due_at: dueAt.toISOString(), priority: "normal", project_id: projectId,
          }]).then(({ error: taskError }) => {
            if (taskError) console.warn("[auto-task] Skipped:", taskError.message)
            else refetchTasks()
          })
        }
      }

      setPageState("dialing")
      if (currentQueueIndex < queue.length - 1) setCurrentQueueIndex(currentQueueIndex + 1)

      // Link call_session → attempt_id
      if (currentCallSessionIdRef.current) {
        supabase.from("call_sessions").update({ attempt_id: data.id })
          .eq("id", currentCallSessionIdRef.current)
          .then(({ error: linkError }) => {
            if (linkError) console.warn("[logAttempt] Failed to link call_session:", linkError.message)
          })
        currentCallSessionIdRef.current = null
      }
    }
  }

  // ─── Background Evidence Poller ───
  useEffect(() => {
    if (!ENABLE_EVIDENCE_QUEUE) return
    const pendingIds = Object.keys(pendingEvidence)
    if (pendingIds.length === 0) return

    const poll = async () => {
      try {
        const supabase = getSupabase()
        const { data: enriched } = await supabase
          .from("v_attempts_enriched")
          .select("id, call_recording_url, call_transcript_text")
          .in("id", pendingIds)

        const { data: sessions } = await supabase
          .from("call_sessions")
          .select("attempt_id, openphone_call_id")
          .in("attempt_id", pendingIds)

        if (sessions) {
          setCallSessionMap((prev) => {
            const next = { ...prev }
            for (const s of sessions) {
              if (s.attempt_id) next[s.attempt_id] = { openphone_call_id: s.openphone_call_id }
            }
            return next
          })
        }

        if (enriched) {
          const updates = new Map<string, { recordingUrl?: string; callTranscriptText?: string }>()
          for (const row of enriched) {
            if (row.call_recording_url || row.call_transcript_text) {
              updates.set(row.id, {
                recordingUrl: row.call_recording_url || undefined,
                callTranscriptText: row.call_transcript_text || undefined,
              })
            }
          }
          if (updates.size > 0) {
            const updater = (prev: Attempt[]) => prev.map((a) => {
              const u = updates.get(a.id)
              return u ? { ...a, ...u } : a
            })
            setSessionAttempts(updater)
            setAllAttempts(updater)
          }
        }

        setPendingEvidence((prev) => {
          const next = { ...prev }
          const now = Date.now()
          for (const id of Object.keys(next)) {
            const hasEvidence = enriched?.some(
              (r) => r.id === id && (r.call_recording_url || r.call_transcript_text)
            )
            if (hasEvidence || now >= next[id].expiresAt) delete next[id]
          }
          return next
        })
      } catch (err) { console.warn("[evidence-queue] Poll error:", err) }
    }

    const intervalId = setInterval(poll, 5000)
    poll()
    return () => clearInterval(intervalId)
  }, [ENABLE_EVIDENCE_QUEUE, Object.keys(pendingEvidence).join(",")])

  // ─── Keyboard shortcuts ───
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return

      if (pageState === "dialing" && !isOnCall) {
        if (e.key === "d" || e.key === "D") { e.preventDefault(); if (currentLead?.phone) initiateCall() }
        if (e.key === "s" || e.key === "S") { e.preventDefault(); skipLead() }
      }
      if (pageState === "dialing" && isOnCall) {
        if (e.key === "e" || e.key === "E") { e.preventDefault(); endCall() }
        if (e.key === "v" || e.key === "V") { e.preventDefault(); handleVmDrop() }
      }
      if (pageState === "logging") {
        if (e.key >= "1" && e.key <= "5" && !showWhyField) {
          const index = parseInt(e.key) - 1
          if (index < attemptOutcomeOptions.length) setSelectedOutcome(attemptOutcomeOptions[index])
        }
        if (e.key === "y" || e.key === "Y") { e.preventDefault(); setActionSignal(true) }
        if (e.key === "n" || e.key === "N") { e.preventDefault(); setActionSignal(false) }
        if (e.key === "Enter" && canSave) { e.preventDefault(); logAttempt() }
      }
    },
    [pageState, isOnCall, currentLead, showWhyField, canSave, initiateCall, handleVmDrop],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Experiment change handler for setup screen
  const handleExperimentChange = (v: string) => {
    if (v === "none") {
      setSelectedExperimentObj(null); setSelectedExperiment("none"); setVariantCursor(0)
    } else {
      const exp = activeExperiments.find(e => e.id === v)
      if (exp) { setSelectedExperimentObj(exp); setSelectedExperiment(exp.name); setVariantCursor(0) }
    }
  }

  // ─── RENDER ───

  if (pageState === "setup") {
    return (
      <DialSetupScreen
        modes={modes}
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
        queue={queue}
        sessionTarget={sessionTarget}
        onSessionTargetChange={setSessionTarget}
        dialMethod={dialMethod}
        onDialMethodChange={setDialMethod}
        activeExperiments={activeExperiments}
        selectedExperimentObj={selectedExperimentObj}
        onExperimentChange={handleExperimentChange}
        hasActiveSession={hasActiveSession}
        persistedSession={persistedSession}
        sessionLoading={sessionLoading}
        onStartSession={handleStartSession}
        onResumeSession={handleResumeSession}
        onAbandonSession={handleAbandonSession}
      />
    )
  }

  // Active Session (Dialing + Logging)
  return (
    <div className="flex flex-col min-h-screen">
      <Topbar
        title="Dial Session"
        actions={
          <div className="flex items-center gap-2">
            <FrictionButton
              categories={frictionCategories}
              rootCauses={frictionRootCauses}
              currentAttemptId={sessionAttempts[0]?.id ?? null}
              onLog={(categoryId, rootCauseId, note) => {
                logFriction.mutate({
                  categoryId,
                  rootCauseId: rootCauseId ?? null,
                  note,
                  attemptId: sessionAttempts[0]?.id ?? null,
                })
              }}
              isPending={logFriction.isPending}
            />
            <Button variant="destructive" onClick={handleEndSession}>
              <XCircle className="mr-2 h-4 w-4" /> End Session
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <MissionControl attempts={allAttempts} tasks={allTasks} />

        <SessionProgressBar
          attemptCount={sessionAttempts.length}
          target={sessionTarget}
          pace={pace}
          metrics={sessionMetrics}
        />

        <CallPrepPanel
          leadSegment={currentLead?.segment}
          leadStage={currentLead?.stage}
          onRulesLoaded={setRulesShownIds}
        />

        {/* Experiment Variant Protocol */}
        {selectedExperimentObj && selectedExperimentObj.variants.length > 0 && (
          <Card className="border-purple-200/50 bg-purple-50/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-purple-800">{selectedExperimentObj.name}</span>
                <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-600">
                  {selectedExperimentObj.variants[variantCursor % selectedExperimentObj.variants.length].name}
                </Badge>
              </div>
              <p className="text-xs text-purple-700">
                {selectedExperimentObj.variants[variantCursor % selectedExperimentObj.variants.length].protocol
                  || selectedExperimentObj.protocol
                  || "Follow standard approach"}
              </p>
            </CardContent>
          </Card>
        )}

        {currentLead ? (
          <>
            {currentItem && (
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-normal">
                  {currentItem.reason}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {currentQueueIndex + 1} of {queue.length} in queue
                </span>
              </div>
            )}

            {pageState === "dialing" && (
              <LeadCallCard
                lead={currentLead}
                allAttempts={allAttempts}
                isOnCall={isOnCall}
                activeFocusLever={activeFocusLever}
                onDial={initiateCall}
                onSkip={skipLead}
                onEndCall={endCall}
                onVmDrop={handleVmDrop}
              />
            )}

            {!isOnCall && pageState === "dialing" && (
              <div className="mb-4">
                <DialContextPanel lead={currentLead} attempts={allAttempts} />
              </div>
            )}

            {pageState === "logging" && (
              <OutcomeLogger
                companyName={currentLead.company}
                selectedOutcome={selectedOutcome}
                onOutcomeChange={setSelectedOutcome}
                showWhyField={showWhyField}
                selectedWhy={selectedWhy}
                onWhyChange={setSelectedWhy}
                selectedRepMistake={selectedRepMistake}
                onRepMistakeChange={setSelectedRepMistake}
                needsFollowUp={needsFollowUp}
                effectiveFollowUpDays={effectiveFollowUpDays}
                defaultFollowUpDays={defaultFollowUpDays}
                followUpDays={followUpDays}
                onFollowUpDaysChange={setFollowUpDays}
                customFollowUpDays={customFollowUpDays}
                onCustomFollowUpDaysChange={setCustomFollowUpDays}
                activePhase={activePhase}
                activeFocusLever={activeFocusLever}
                actionMarker={actionMarker}
                winMarker={winMarker}
                actionSignal={actionSignal}
                winSignal={winSignal}
                onActionSignalChange={setActionSignal}
                onWinSignalChange={setWinSignal}
                showDetail={showDetail}
                onShowDetailChange={setShowDetail}
                noteText={noteText}
                onNoteTextChange={setNoteText}
                canSave={!!canSave}
                onSave={logAttempt}
                onCancel={() => setPageState("dialing")}
              />
            )}
          </>
        ) : (
          <Card className="mb-4">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No more leads in queue.</p>
              <Button className="mt-4" onClick={handleEndSession}>
                End Session & Review
              </Button>
            </CardContent>
          </Card>
        )}

        <RecentAttemptsList
          sessionAttempts={sessionAttempts}
          leads={leads}
          pendingEvidence={pendingEvidence}
          callSessionMap={callSessionMap}
        />
      </div>
    </div>
  )
}

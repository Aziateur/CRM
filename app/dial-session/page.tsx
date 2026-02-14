"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { Topbar } from "@/components/topbar"
import { DialContextPanel } from "@/components/dial-context-panel"
import { DialScriptPanel } from "@/components/dial-script-panel"
import { MissionControl } from "@/components/mission-control"
import { useLeads } from "@/hooks/use-leads"
import { useAttempts } from "@/hooks/use-attempts"
import { useTasks } from "@/hooks/use-tasks"
import { useDialQueue } from "@/hooks/use-dial-queue"
import { useDialSession } from "@/hooks/use-dial-session"
import { useDialModes, type DialMode } from "@/hooks/use-dial-modes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Phone,
  PhoneOff,
  Building2,
  User,
  Play,
  SkipForward,
  XCircle,
  ChevronDown,
  Keyboard,
  Zap,
  RotateCcw,
  Crosshair,
} from "lucide-react"
import {
  getDefaultNextAction,
  getDefaultTaskForOutcome,
  isDmReached,
  calculateSessionMetrics,
  attemptOutcomeOptions,
  whyReasonOptions,
  repMistakeOptions,
  type Attempt,
  type AttemptOutcome,
  type WhyReason,
  type RepMistake,
} from "@/lib/store"
import { useFramework } from "@/hooks/use-framework"
import { setAttemptSignal, hasSignal } from "@/lib/signals"
import { useToast } from "@/hooks/use-toast"
import { useProjectId } from "@/hooks/use-project-id"

// Outcome colors for pills
const outcomeStyles: Record<AttemptOutcome, string> = {
  "No connect": "border-muted-foreground hover:bg-muted",
  "Gatekeeper only": "border-orange-500 hover:bg-orange-50 data-[selected=true]:bg-orange-100 data-[selected=true]:border-orange-600",
  "DM reached → No interest": "border-red-500 hover:bg-red-50 data-[selected=true]:bg-red-100 data-[selected=true]:border-red-600",
  "DM reached → Some interest": "border-blue-500 hover:bg-blue-50 data-[selected=true]:bg-blue-100 data-[selected=true]:border-blue-600",
  "Meeting set": "border-green-500 hover:bg-green-50 data-[selected=true]:bg-green-100 data-[selected=true]:border-green-600",
}

const followUpOptions = [
  { label: "1d", days: 1 },
  { label: "2d", days: 2 },
  { label: "1w", days: 7 },
  { label: "2w", days: 14 },
]

type SessionState = "setup" | "dialing" | "logging"

export default function DialSessionPage() {
  const router = useRouter()

  // Data hooks
  const { leads } = useLeads({ withContacts: true })
  const { attempts: allAttempts, setAttempts: setAllAttempts } = useAttempts()
  const { tasks: allTasks, refetch: refetchTasks } = useTasks()

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
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
  const [sessionAttempts, setSessionAttempts] = useState<Attempt[]>([])

  // Framework + signals
  const { activePhase, activeFocusLever, actionMarker, winMarker } = useFramework()
  const { toast } = useToast()
  const projectId = useProjectId()
  const [actionSignal, setActionSignal] = useState<boolean | null>(null)
  const [winSignal, setWinSignal] = useState<boolean | null>(null)
  const [consecutiveSkips, setConsecutiveSkips] = useState(0)

  // Call state
  const [isOnCall, setIsOnCall] = useState(false)
  const [callStartTime, setCallStartTime] = useState<Date | null>(null)

  // Log state
  const [selectedOutcome, setSelectedOutcome] = useState<AttemptOutcome | null>(null)
  const [selectedWhy, setSelectedWhy] = useState<WhyReason | null>(null)
  const [selectedRepMistake, setSelectedRepMistake] = useState<RepMistake | null>(null)
  const [followUpDays, setFollowUpDays] = useState<number | null>(null)
  const [customFollowUpDays, setCustomFollowUpDays] = useState("")
  const [noteText, setNoteText] = useState("")
  const [showDetail, setShowDetail] = useState(false)

  // Session start time for pace calc
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)

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

  // Default follow-up days from outcome
  const defaultFollowUpDays = useMemo(() => {
    if (!selectedOutcome) return null
    const taskDef = getDefaultTaskForOutcome(selectedOutcome, selectedWhy || undefined, "")
    return taskDef?.dueDays ?? null
  }, [selectedOutcome, selectedWhy])

  // Effective follow-up days (user override or default)
  const effectiveFollowUpDays = followUpDays ?? defaultFollowUpDays

  // Pace: calls per hour
  const pace = useMemo(() => {
    if (!sessionStartTime || sessionAttempts.length === 0) return null
    const hoursElapsed = (Date.now() - sessionStartTime.getTime()) / (1000 * 60 * 60)
    if (hoursElapsed < 0.01) return null
    return Math.round((sessionAttempts.length / hoursElapsed) * 10) / 10
  }, [sessionStartTime, sessionAttempts])

  // No client-side call timer — duration comes from OpenPhone webhook via call_sessions table



  // Initiate a call — creates call_session only. Attempt is created later in logAttempt().
  const initiateCall = useCallback(async () => {
    if (!currentLead?.phone) return

    // Format phone to E.164 (assuming it's already formatted or close)
    const e164Number = currentLead.phone.replace(/[^+\d]/g, "")

    // 1) Trigger native dialer via hidden anchor click (avoids popup blockers)
    const anchor = document.createElement('a')
    anchor.href = `tel:${e164Number}`
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)

    // 2) Copy phone to clipboard (background)
    try {
      await navigator.clipboard.writeText(e164Number)
    } catch (err) {
      console.error('Failed to copy phone number', err)
    }

    // 3) Create ONLY a call_session — NO attempt yet (attempt is created when rep logs outcome)
    {
      const supabase = getSupabase()
      supabase.from('call_sessions').insert([{
        lead_id: currentLead.id,
        phone_e164: e164Number,
        direction: 'outgoing',
        status: 'initiated',
        started_at: new Date().toISOString(),
        project_id: projectId,
      }]).then(({ error }) => {
        if (error) console.error("Error creating call session:", error)
      })
    }

    // Mark as on-call (no timer — duration comes from OpenPhone webhook)
    setIsOnCall(true)
    setCallStartTime(new Date())
  }, [currentLead, projectId])

  // Reset form when outcome changes
  useEffect(() => {
    setSelectedWhy(null)
    setSelectedRepMistake(null)
    setFollowUpDays(null)
    setCustomFollowUpDays("")
  }, [selectedOutcome])

  // Update persisted session when lead changes
  useEffect(() => {
    if (currentLead && pageState === "dialing") {
      updateCurrentLead(currentLead.id)
    }
  }, [currentLead?.id, pageState])

  // Session metrics
  const sessionMetrics = calculateSessionMetrics(sessionAttempts)
  const progress = sessionTarget > 0 ? (sessionAttempts.length / sessionTarget) * 100 : 0

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // --- Actions ---

  const handleStartSession = async () => {
    if (!selectedMode) return
    const newSession = await startPersistedSession(sessionTarget, selectedExperiment === "none" ? undefined : selectedExperiment, selectedMode)

    // Snapshot queue to dial_session_items
    if (newSession && projectId && queue.length > 0) {
      try {
        const supabase = getSupabase()
        const items = queue.map((item, idx) => ({
          dial_session_id: newSession.id,
          lead_id: item.lead.id,
          position: idx,
          source: item.source || selectedMode,
          reason: item.reason,
          task_id: item.task?.id || null,
          status: "pending",
          project_id: projectId,
        }))
        await supabase.from("dial_session_items").insert(items)
      } catch (err) {
        console.warn("[dial-session] Queue snapshot failed:", err)
      }
    }

    setSessionStartTime(new Date())
    setSessionAttempts([])
    setCurrentQueueIndex(0)
    setPageState("dialing")
  }

  const handleResumeSession = async () => {
    // Find the lead in the queue that matches the persisted session
    if (persistedSession?.currentLeadId) {
      const idx = queue.findIndex((q) => q.lead.id === persistedSession.currentLeadId)
      setCurrentQueueIndex(idx >= 0 ? idx : 0)
    }
    setSessionTarget(persistedSession?.target || 20)
    setSelectedExperiment(persistedSession?.experiment || "none")
    setSessionStartTime(new Date(persistedSession?.startedAt || Date.now()))
    setSessionAttempts([])
    setPageState("dialing")
  }

  const handleAbandonSession = async () => {
    await abandonSession()
    setPageState("setup")
  }

  const handleEndSession = async () => {
    await endPersistedSession()
    setIsOnCall(false)
    setCallStartTime(null)
    router.push("/batch-review")
  }

  const endCall = () => {
    setIsOnCall(false)
    setPageState("logging")
    // Reset log form
    setSelectedOutcome(null)
    setSelectedWhy(null)
    setSelectedRepMistake(null)
    setFollowUpDays(null)
    setCustomFollowUpDays("")
    setShowDetail(false)
    setNoteText("")
    // Reset signals
    setActionSignal(null)
    setWinSignal(null)
  }

  const skipLead = () => {
    if (currentQueueIndex < queue.length - 1) {
      setCurrentQueueIndex(currentQueueIndex + 1)
    }
  }

  const logAttempt = async () => {
    if (!currentLead || !selectedOutcome || !canSave) return

    // Client-generated UUID — used for both Supabase insert and localStorage signals
    const attemptId = crypto.randomUUID()

    const attemptData = {
      id: attemptId,
      lead_id: currentLead.id,
      timestamp: new Date().toISOString(),
      outcome: selectedOutcome,
      why: selectedWhy || null,
      rep_mistake: selectedRepMistake || null,
      dm_reached: isDmReached(selectedOutcome),
      next_action: computedNextAction,
      note: noteText || null,
      experiment_tag: selectedExperiment === "none" ? null : selectedExperiment,
      session_id: persistedSession?.id || null,
      duration_sec: 0, // Real duration comes from OpenPhone webhook via call_sessions
      project_id: projectId,
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("attempts")
      .insert([attemptData])
      .select()
      .single()

    if (error) {
      console.error("Error logging attempt:", error)
      return
    }

    if (data) {
      // Fetch artifacts associated with this attempt (if any) via the view
      let artifacts: { recording_url: string | null, transcript_text: string | null } = { recording_url: null, transcript_text: null }
      {
        const { data: artifactData } = await supabase
          .from('v_calls_with_artifacts')
          .select('recording_url, transcript_text')
          .eq('attempt_id', data.id)
          .single()

        if (artifactData) {
          artifacts = artifactData
        }
      }

      const attempt: Attempt = {
        id: data.id,
        leadId: data.lead_id,
        timestamp: data.timestamp,
        outcome: data.outcome,
        why: data.why,
        repMistake: data.rep_mistake,
        dmReached: data.dm_reached,
        nextAction: data.next_action,
        note: data.note,
        experimentTag: data.experiment_tag,
        sessionId: data.session_id,
        durationSec: data.duration_sec,
        createdAt: data.created_at,
        recordingUrl: artifacts.recording_url || undefined,
        callTranscriptText: artifacts.transcript_text || undefined,
      }

      // Store signals in localStorage — only the phase's markers
      const signalRecorded = actionSignal !== null || winSignal !== null
      if (activePhase.actionMarkerKey) {
        setAttemptSignal(attemptId, activePhase.actionMarkerKey, actionSignal ?? false)
      }
      if (activePhase.winMarkerKey && winSignal !== null) {
        setAttemptSignal(attemptId, activePhase.winMarkerKey, winSignal)
      }

      // Nudge: track consecutive skips
      if (!signalRecorded && activePhase.actionMarkerKey) {
        const newSkips = consecutiveSkips + 1
        setConsecutiveSkips(newSkips)
        if (newSkips >= 10 && newSkips % 10 === 0) {
          toast({
            title: "No focus marks in 10 calls",
            description: "Press Y/N in the logger to track your practice.",
          })
        }
      } else {
        setConsecutiveSkips(0)
      }

      setSessionAttempts((prev) => [attempt, ...prev])
      setAllAttempts((prev) => [attempt, ...prev])

      // Auto-create follow-up task with user's chosen delay
      if (needsFollowUp && effectiveFollowUpDays) {
        const taskDef = getDefaultTaskForOutcome(selectedOutcome, selectedWhy || undefined, currentLead.company)
        if (taskDef) {
          const dueAt = new Date()
          dueAt.setDate(dueAt.getDate() + effectiveFollowUpDays)
          supabase
            .from("tasks")
            .insert([{
              lead_id: currentLead.id,
              attempt_id: data.id,
              type: taskDef.type,
              title: taskDef.title,
              due_at: dueAt.toISOString(),
              priority: "normal",
              project_id: projectId,
            }])
            .then(({ error: taskError }) => {
              if (taskError) console.warn("[auto-task] Skipped:", taskError.message)
              else refetchTasks()
            })
        }
      }

      // Advance to next lead
      setPageState("dialing")
      if (currentQueueIndex < queue.length - 1) {
        setCurrentQueueIndex(currentQueueIndex + 1)
      }
    }
  }

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return

      if (pageState === "dialing" && !isOnCall) {
        // D to dial
        if (e.key === "d" || e.key === "D") {
          e.preventDefault()
          if (currentLead?.phone) initiateCall()
        }
        // S to skip
        if (e.key === "s" || e.key === "S") {
          e.preventDefault()
          skipLead()
        }
      }

      if (pageState === "dialing" && isOnCall) {
        // E to end call
        if (e.key === "e" || e.key === "E") {
          e.preventDefault()
          endCall()
        }
      }

      if (pageState === "logging") {
        // 1-5 for outcome
        if (e.key >= "1" && e.key <= "5" && !showWhyField) {
          const index = parseInt(e.key) - 1
          if (index < attemptOutcomeOptions.length) {
            setSelectedOutcome(attemptOutcomeOptions[index])
          }
        }
        // Y/N for action signal
        if (e.key === "y" || e.key === "Y") {
          e.preventDefault()
          setActionSignal(true)
        }
        if (e.key === "n" || e.key === "N") {
          e.preventDefault()
          setActionSignal(false)
        }
        // Enter to save
        if (e.key === "Enter" && canSave) {
          e.preventDefault()
          logAttempt()
        }
      }
    },
    [pageState, isOnCall, currentLead, showWhyField, canSave, initiateCall],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // --- Setup Screen ---
  if (pageState === "setup") {
    return (
      <div className="flex flex-col min-h-screen">
        <Topbar title="Dial Session" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="w-full max-w-md space-y-4">
            {/* Resume Card */}
            {hasActiveSession && persistedSession && !sessionLoading && (
              <Card className="border-primary/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <RotateCcw className="h-5 w-5 text-primary" />
                    Resume Session?
                  </CardTitle>
                  <CardDescription>
                    You have an active session from{" "}
                    {new Date(persistedSession.startedAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
                    <span>Target: {persistedSession.target || "—"}</span>
                    {persistedSession.experiment && (
                      <Badge variant="outline">{persistedSession.experiment}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleResumeSession}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Resume
                    </Button>
                    <Button variant="outline" className="bg-transparent" onClick={handleAbandonSession}>
                      Abandon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dial Mode Selector */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {hasActiveSession ? "Or Start Fresh" : "Start Dial Session"}
                </CardTitle>
                <CardDescription>Choose what kind of leads to call</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mode Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {modes.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSelectedMode(mode.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${selectedMode === mode.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{mode.icon}</span>
                        <span className="font-semibold text-sm">{mode.label}</span>
                      </div>
                      <p className="text-3xl font-bold tabular-nums mb-1">{mode.count}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{mode.description}</p>
                    </button>
                  ))}
                </div>

                {/* Queue Preview (shown after mode selected) */}
                {selectedMode && (
                  <div className="p-4 bg-muted rounded-lg animate-in slide-in-from-top-2">
                    <p className="text-sm text-muted-foreground mb-1">Queue ready:</p>
                    <p className="text-2xl font-bold">{queue.length} leads</p>
                    {queue.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        First up: {queue[0].lead.company} — {queue[0].reason}
                      </p>
                    )}
                  </div>
                )}

                {/* Target */}
                <div className="grid gap-2">
                  <Label>Call Target</Label>
                  <Select
                    value={sessionTarget.toString()}
                    onValueChange={(v) => setSessionTarget(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 calls</SelectItem>
                      <SelectItem value="20">20 calls</SelectItem>
                      <SelectItem value="50">50 calls</SelectItem>
                      <SelectItem value="100">100 calls</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => router.push("/")}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleStartSession}
                    disabled={!selectedMode || queue.length === 0}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // --- Active Session (Dialing + Logging) ---
  return (
    <div className="flex flex-col min-h-screen">
      <Topbar
        title="Dial Session"
        actions={
          <Button variant="destructive" onClick={handleEndSession}>
            <XCircle className="mr-2 h-4 w-4" />
            End Session
          </Button>
        }
      />

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {/* Mission Control */}
        <MissionControl attempts={allAttempts} tasks={allTasks} />

        {/* Session Progress Bar */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {sessionAttempts.length} / {sessionTarget}
                  </p>
                  <p className="text-xs text-muted-foreground">calls logged</p>
                </div>
                {pace && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium tabular-nums">{pace}</span>
                    <span>calls/hr</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold tabular-nums">{sessionMetrics.connectRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Connect</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{sessionMetrics.dmReachRate}%</p>
                  <p className="text-[10px] text-muted-foreground">DM Reach</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{sessionMetrics.interestRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Interest</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600 tabular-nums">{sessionMetrics.meetingsSet}</p>
                  <p className="text-[10px] text-muted-foreground">Meetings</p>
                </div>
              </div>
            </div>
            <Progress value={progress} className="h-1.5" />
          </CardContent>
        </Card>

        {currentLead ? (
          <>
            {/* Reason Badge */}
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

            {/* Lead Card */}
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Building2 className="h-5 w-5" />
                      {currentLead.company}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {currentLead.segment}
                      {currentLead.isDecisionMaker === "yes" && " · DM"}
                      {currentLead.isFleetOwner === "yes" && " · Fleet Owner"}
                    </CardDescription>
                  </div>
                  {currentLead.stage && (
                    <Badge variant="secondary">{currentLead.stage}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phone */}
                {currentLead.phone && (
                  <a
                    href={`tel:${currentLead.phone}`}
                    className="flex items-center gap-3 text-3xl font-mono text-primary hover:underline"
                  >
                    <Phone className="h-7 w-7" />
                    {currentLead.phone}
                  </a>
                )}

                {/* Contacts */}
                {currentLead.contacts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentLead.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full"
                      >
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">{contact.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {contact.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Call status (when on call) */}
                {isOnCall && (
                  <div className="flex items-center gap-2 text-lg font-medium">
                    <Phone className="h-5 w-5 text-green-500 animate-pulse" />
                    <span className="text-green-600">Call in progress</span>
                  </div>
                )}

                {/* Focus hint (visible during call) */}
                {isOnCall && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
                    <Crosshair className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-primary">Focus: {activeFocusLever.label}</span>
                      {activeFocusLever.prompt && (
                        <p className="text-xs text-muted-foreground truncate">{activeFocusLever.prompt}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Script Panel (visible during call) */}
                <DialScriptPanel visible={isOnCall} />

                {/* Call Controls */}
                {pageState === "dialing" && (
                  <div className="flex gap-3">
                    {!isOnCall ? (
                      <>
                        <Button
                          size="lg"
                          className="flex-1 h-14 text-lg"
                          onClick={initiateCall}
                        >
                          <Phone className="mr-2 h-5 w-5" />
                          Dial (D)
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="h-14 bg-transparent"
                          onClick={skipLead}
                        >
                          <SkipForward className="mr-2 h-5 w-5" />
                          Skip (S)
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="lg"
                        variant="destructive"
                        className="flex-1 h-14 text-lg"
                        onClick={endCall}
                      >
                        <PhoneOff className="mr-2 h-5 w-5" />
                        End Call & Log (E)
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Context Panel (pre-call) */}
            {!isOnCall && pageState === "dialing" && (
              <div className="mb-4">
                <DialContextPanel lead={currentLead} attempts={allAttempts} />
              </div>
            )}

            {/* Inline Log Form (post-call) */}
            {pageState === "logging" && (
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle>
                    Log: {currentLead.company}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Keyboard className="h-4 w-4" />
                    1-5 outcome · Y/N focus · Enter save
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Outcome Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Outcome *</Label>
                    <div className="grid gap-2">
                      {attemptOutcomeOptions.map((outcome, index) => (
                        <button
                          key={outcome}
                          type="button"
                          data-selected={selectedOutcome === outcome}
                          onClick={() => setSelectedOutcome(outcome)}
                          className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors text-left ${outcomeStyles[outcome]} ${selectedOutcome === outcome ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                        >
                          <span className="font-medium">{outcome}</span>
                          <span className="text-xs text-muted-foreground">{index + 1}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Why (conditional) */}
                  {showWhyField && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      <Label className="text-sm font-medium">Why? *</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {whyReasonOptions.map((why) => (
                          <button
                            key={why}
                            type="button"
                            onClick={() => setSelectedWhy(why)}
                            className={`px-3 py-2 rounded-lg border transition-colors text-sm ${selectedWhy === why ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"}`}
                          >
                            {why}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rep Mistake (optional collapsible) */}
                  {selectedOutcome && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between">
                          <span className="text-sm text-muted-foreground">
                            {selectedRepMistake
                              ? `Mistake: ${selectedRepMistake}`
                              : "Was this a rep mistake? (optional)"}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="grid grid-cols-2 gap-2">
                          {repMistakeOptions.map((mistake) => (
                            <button
                              key={mistake}
                              type="button"
                              onClick={() =>
                                setSelectedRepMistake(
                                  selectedRepMistake === mistake ? null : mistake,
                                )
                              }
                              className={`px-3 py-2 rounded-lg border transition-colors text-sm ${selectedRepMistake === mistake ? "border-red-500 bg-red-50 font-medium" : "border-border hover:bg-muted"}`}
                            >
                              {mistake}
                            </button>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Follow-Up Timing (when action needs it) */}
                  {selectedOutcome && needsFollowUp && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Follow up in:</Label>
                      <div className="flex items-center gap-2">
                        {followUpOptions.map((opt) => (
                          <Button
                            key={opt.days}
                            type="button"
                            size="sm"
                            variant={
                              (followUpDays ?? defaultFollowUpDays) === opt.days
                                ? "default"
                                : "outline"
                            }
                            className={
                              (followUpDays ?? defaultFollowUpDays) === opt.days
                                ? ""
                                : "bg-transparent"
                            }
                            onClick={() => setFollowUpDays(opt.days)}
                          >
                            {opt.label}
                          </Button>
                        ))}
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={1}
                            max={90}
                            placeholder="custom"
                            className="w-20 h-8 text-sm"
                            value={customFollowUpDays}
                            onChange={(e) => {
                              setCustomFollowUpDays(e.target.value)
                              const n = parseInt(e.target.value)
                              if (n > 0) setFollowUpDays(n)
                            }}
                          />
                          <span className="text-xs text-muted-foreground">days</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signals — Y/N per call, dynamic from phase markers */}
                  <div className="space-y-2">
                    {/* Action checkbox (if phase has one) */}
                    {activePhase.actionMarkerKey && actionMarker && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crosshair className="h-3.5 w-3.5 text-primary" />
                          <Label className="text-sm font-medium">
                            {actionMarker.label} (Y/N)
                          </Label>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={actionSignal === true ? "default" : "outline"}
                            className={`h-7 w-10 text-xs ${actionSignal === true ? "" : "bg-transparent"}`}
                            onClick={() => setActionSignal(true)}
                          >
                            Y
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={actionSignal === false ? "default" : "outline"}
                            className={`h-7 w-10 text-xs ${actionSignal === false ? "" : "bg-transparent"}`}
                            onClick={() => setActionSignal(false)}
                          >
                            N
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Win checkbox (if phase has one) */}
                    {activePhase.winMarkerKey && winMarker && (
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-muted-foreground">
                          {winMarker.label}?
                        </Label>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={winSignal === true ? "default" : "outline"}
                            className={`h-7 w-10 text-xs ${winSignal === true ? "" : "bg-transparent"}`}
                            onClick={() => setWinSignal(true)}
                          >
                            Y
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={winSignal === false ? "default" : "outline"}
                            className={`h-7 w-10 text-xs ${winSignal === false ? "" : "bg-transparent"}`}
                            onClick={() => setWinSignal(false)}
                          >
                            N
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Show focus hint if no markers at all */}
                    {!activePhase.actionMarkerKey && !activePhase.winMarkerKey && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                        <Crosshair className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Focus: {activeFocusLever.label} — no markers for this phase
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Note (optional collapsible) */}
                  <Collapsible open={showDetail} onOpenChange={setShowDetail}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="text-sm text-muted-foreground">
                          Add note (optional)
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${showDetail ? "rotate-180" : ""}`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <Input
                        placeholder="Quick note (max 120 chars)"
                        maxLength={120}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Save / Cancel */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="bg-transparent"
                      onClick={() => {
                        setPageState("dialing")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={logAttempt} disabled={!canSave}>
                      Save & Next (Enter)
                    </Button>
                  </div>
                </CardContent>
              </Card>
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

        {/* Recent Attempts */}
        {sessionAttempts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sessionAttempts.slice(0, 5).map((attempt) => {
                  const lead = leads.find((l) => l.id === attempt.leadId)
                  return (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{lead?.company}</span>
                        <Badge variant="outline" className="text-xs">
                          {attempt.outcome}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(attempt.durationSec)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

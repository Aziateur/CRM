"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Phone, 
  PhoneOff, 
  AlertTriangle, 
  Target, 
  Clock,
  Building2,
  User,
  Play,
  SkipForward,
  XCircle,
  ChevronDown,
  Keyboard
} from "lucide-react"
import {
  leads as allLeads,
  attempts as allAttempts,
  experiments,
  drills,
  stopSignals,
  getDialableLeads,
  getDefaultNextAction,
  isDmReached,
  checkStopSignals,
  calculateSessionMetrics,
  attemptOutcomeOptions,
  whyReasonOptions,
  repMistakeOptions,
  nextActionOptions,
  type Lead,
  type Attempt,
  type AttemptOutcome,
  type WhyReason,
  type RepMistake,
  type NextAction,
  type Drill,
} from "@/lib/store"

// Outcome colors for pills
const outcomeStyles: Record<AttemptOutcome, string> = {
  "No connect": "border-muted-foreground hover:bg-muted",
  "Gatekeeper only": "border-orange-500 hover:bg-orange-50 data-[selected=true]:bg-orange-100 data-[selected=true]:border-orange-600",
  "DM reached → No interest": "border-red-500 hover:bg-red-50 data-[selected=true]:bg-red-100 data-[selected=true]:border-red-600",
  "DM reached → Some interest": "border-blue-500 hover:bg-blue-50 data-[selected=true]:bg-blue-100 data-[selected=true]:border-blue-600",
  "Meeting set": "border-green-500 hover:bg-green-50 data-[selected=true]:bg-green-100 data-[selected=true]:border-green-600",
}

export default function DialSessionPage() {
  const router = useRouter()
  
  // Data state
  const [leads, setLeads] = useState<Lead[]>([])
  const [sessionAttempts, setSessionAttempts] = useState<Attempt[]>([])
  const [allAttemptsList, setAllAttemptsList] = useState<Attempt[]>([])
  
  useEffect(() => {
    const fetchData = async () => {
      // Fetch leads
      const supabase = getSupabase()
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*, contacts(*)')
        .order('created_at', { ascending: false })
      
      if (leadsData) {
        const mappedLeads: Lead[] = leadsData.map((l: any) => ({
          id: l.id,
          company: l.company,
          phone: l.phone,
          segment: l.segment || "Unknown",
          isDecisionMaker: l.is_decision_maker || l.isDecisionMaker || "unknown",
          isFleetOwner: l.is_fleet_owner || l.isFleetOwner || "unknown",
          confirmedFacts: l.confirmed_facts || l.confirmedFacts || [],
          openQuestions: l.open_questions || l.openQuestions || [],
          nextCallObjective: l.next_call_objective || l.nextCallObjective,
          operationalContext: l.operational_context || l.operationalContext,
          constraints: l.constraints || [],
          constraintOther: l.constraint_other || l.constraintOther,
          opportunityAngle: l.opportunity_angle || l.opportunityAngle,
          website: l.website,
          email: l.email,
          address: l.address,
          leadSource: l.lead_source || l.leadSource,
          contacts: (l.contacts || []).map((c: any) => ({
             id: c.id,
             name: c.name,
             role: c.role || "Other",
             phone: c.phone,
             email: c.email
          })),
          createdAt: l.created_at || l.createdAt || new Date().toISOString()
        }))
        setLeads(mappedLeads)
      }

      // Fetch attempts
      const { data: attemptsData } = await supabase
        .from('attempts')
        .select('*')
        .order('created_at', { ascending: false })

      if (attemptsData) {
         const mappedAttempts: Attempt[] = attemptsData.map((a: any) => ({
            id: a.id,
            leadId: a.lead_id || a.leadId,
            contactId: a.contact_id || a.contactId,
            timestamp: a.timestamp,
            outcome: a.outcome,
            why: a.why,
            repMistake: a.rep_mistake || a.repMistake,
            dmReached: a.dm_reached || a.dmReached,
            nextAction: a.next_action || a.nextAction,
            nextActionAt: a.next_action_at || a.nextActionAt,
            note: a.note,
            durationSec: a.duration_sec || a.durationSec || 0,
            experimentTag: a.experiment_tag || a.experimentTag,
            sessionId: a.session_id || a.sessionId,
            createdAt: a.created_at || a.createdAt || new Date().toISOString(),
            recordingUrl: a.recording_url,
            transcript: a.transcript
         }))
         setAllAttemptsList(mappedAttempts)
      }
    }
    fetchData()
  }, [])
  
  // Session state
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [sessionTarget, setSessionTarget] = useState(20)
  const [selectedExperiment, setSelectedExperiment] = useState<string>("none")
  
  // Current call state
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0)
  const [isOnCall, setIsOnCall] = useState(false)
  const [callStartTime, setCallStartTime] = useState<Date | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  
  // Log attempt modal - SPEED OPTIMIZED
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<AttemptOutcome | null>(null)
  const [selectedWhy, setSelectedWhy] = useState<WhyReason | null>(null)
  const [selectedRepMistake, setSelectedRepMistake] = useState<RepMistake | null>(null)
  const [nextActionOverride, setNextActionOverride] = useState<NextAction | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [noteText, setNoteText] = useState("")
  
  // Drill state
  const [activeDrill, setActiveDrill] = useState<Drill | null>(null)
  const [drillRemainingCount, setDrillRemainingCount] = useState(0)
  const [showDrillAlert, setShowDrillAlert] = useState(false)
  const [triggeredSignal, setTriggeredSignal] = useState<ReturnType<typeof checkStopSignals>>(null)
  
  // Pending attempt for OpenPhone integration
  const [pendingAttemptId, setPendingAttemptId] = useState<string | null>(null)
  
  // Setup dialog
  const [showSetupDialog, setShowSetupDialog] = useState(true)

  const dialableLeads = getDialableLeads(leads, allAttemptsList)
  const currentLead = dialableLeads[currentLeadIndex]
  
  // Computed next action
  const computedNextAction = selectedOutcome 
    ? getDefaultNextAction(selectedOutcome, selectedWhy || undefined)
    : "Call back"
  const finalNextAction = nextActionOverride || computedNextAction

  // Should show "Why" field - only when "DM reached → No interest"
  const showWhyField = selectedOutcome === "DM reached → No interest"
  
  // Rep Mistake is now an optional toggle, always available when outcome selected
  const showRepMistakeField = selectedOutcome != null
  const canShowRepMistake = selectedOutcome != null

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isOnCall && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime.getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isOnCall, callStartTime])

  // Check stop signals after logging
  useEffect(() => {
    if (sessionAttempts.length > 0 && sessionAttempts.length % 5 === 0) {
      const triggered = checkStopSignals(sessionAttempts, stopSignals, drills)
      if (triggered && !activeDrill) {
        setTriggeredSignal(triggered)
        setShowDrillAlert(true)
      }
    }
  }, [sessionAttempts])

  // Function to initiate a call and register pending attempt
  const initiateCall = useCallback(async () => {
    if (!currentLead?.phone) return
    
    // Format phone to E.164 (assuming it's already formatted or close)
    const e164Number = currentLead.phone.replace(/[^+\d]/g, "")

    // Sandbox only: Create attempt and call_session
    if (process.env.NEXT_PUBLIC_SANDBOX_CALLS === 'true') {
        const supabase = getSupabase()
        
        // 1. Create attempt
        const { data: attempt, error: attemptError } = await supabase.from('attempts').insert([{
            lead_id: currentLead.id,
            timestamp: new Date().toISOString(),
            outcome: 'No connect', // Default initial state
            dm_reached: false,
            next_action: 'Call again',
            duration_sec: 0
        }]).select().single()

        if (attemptError) {
            console.error("Error creating attempt:", attemptError)
            return
        }

        // 2. Create call_session
        const { error: sessionError } = await supabase.from('call_sessions').insert([{
            attempt_id: attempt.id,
            lead_id: currentLead.id,
            phone_e164: e164Number,
            direction: 'outgoing',
            status: 'initiated',
            started_at: new Date().toISOString()
        }])

        if (sessionError) {
            console.error("Error creating call session:", sessionError)
        }
    }
    
    // Create pending attempt for OpenPhone webhook matching
    const attemptId = `pending-${Date.now()}`
    setPendingAttemptId(attemptId)
    
    // Register pending attempt (in production, this would call the API)
    console.log(`[v0] Registered pending attempt ${attemptId} for ${e164Number}`)
    
    // Trigger tel: link. Use window.open for desktop to avoid navigating away from CRM.
    // On mobile, this will still trigger the native dialer app.
    window.open(`tel:${e164Number}`, '_parent')
    
    // Start the call timer
    startCall()
  }, [currentLead])

  // Keyboard shortcuts for speed
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // "D" to dial current lead (when not in log modal)
    if (e.key === "d" || e.key === "D") {
      if (!isLogOpen && !isOnCall && currentLead?.phone) {
        e.preventDefault()
        initiateCall()
      }
    }
    
    if (!isLogOpen) return
    
    // Number keys 1-5 for outcome selection
    if (e.key >= "1" && e.key <= "5" && !showWhyField) {
      const index = parseInt(e.key) - 1
      if (index < attemptOutcomeOptions.length) {
        setSelectedOutcome(attemptOutcomeOptions[index])
      }
    }
    
    // Enter to save (if valid)
    if (e.key === "Enter" && canSave) {
      e.preventDefault()
      logAttempt()
    }
  }, [isLogOpen, showWhyField, isOnCall, currentLead, initiateCall])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Reset form when outcome changes
  useEffect(() => {
    setSelectedWhy(null)
    setSelectedRepMistake(null)
    setNextActionOverride(null)
  }, [selectedOutcome])

  // Rep mistake no longer tied to why, but reset when changing outcome
  useEffect(() => {
    setSelectedRepMistake(null)
  }, [selectedOutcome])

  const startSession = () => {
    setIsSessionActive(true)
    setSessionAttempts([])
    setCurrentLeadIndex(0)
    setShowSetupDialog(false)
  }

  const endSession = () => {
    setIsSessionActive(false)
    setIsOnCall(false)
    setCallStartTime(null)
    setCallDuration(0)
    // Navigate to batch review with session data
    router.push("/batch-review")
  }

  const startCall = () => {
    setIsOnCall(true)
    setCallStartTime(new Date())
    setCallDuration(0)
  }

  const endCall = () => {
    setIsOnCall(false)
    setIsLogOpen(true)
    // Reset form
    setSelectedOutcome(null)
    setSelectedWhy(null)
    setSelectedRepMistake(null)
    setNextActionOverride(null)
    setShowDetail(false)
    setNoteText("")
  }

  const skipLead = () => {
    if (currentLeadIndex < dialableLeads.length - 1) {
      setCurrentLeadIndex(currentLeadIndex + 1)
    }
  }

  // Can save if: outcome selected + (why selected if required for DM No Interest)
  const canSave = selectedOutcome && (!showWhyField || selectedWhy)

  const logAttempt = async () => {
    if (!currentLead || !selectedOutcome || !canSave) return

    const attemptData = {
      lead_id: currentLead.id,
      timestamp: new Date().toISOString(),
      outcome: selectedOutcome,
      why: selectedWhy || null,
      rep_mistake: selectedRepMistake || null,
      dm_reached: isDmReached(selectedOutcome),
      next_action: finalNextAction,
      note: noteText || null,
      experiment_tag: selectedExperiment === "none" ? null : selectedExperiment,
      session_id: `session-${Date.now()}`,
      duration_sec: callDuration,
    }

    const supabase = getSupabase()
    const { data, error } = await supabase.from('attempts').insert([attemptData]).select().single()

    if (error) {
        console.error("Error logging attempt:", error)
        return
    }

    if (data) {
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
            createdAt: data.created_at
        }

        setSessionAttempts([attempt, ...sessionAttempts])
        setAllAttemptsList([attempt, ...allAttemptsList])
        
        // Decrease drill count if active
        if (activeDrill && drillRemainingCount > 0) {
            const newCount = drillRemainingCount - 1
            setDrillRemainingCount(newCount)
            if (newCount === 0) {
                setActiveDrill(null)
            }
        }

        // Close modal and advance
        setIsLogOpen(false)
        setCallDuration(0)
        
        if (currentLeadIndex < dialableLeads.length - 1) {
            setCurrentLeadIndex(currentLeadIndex + 1)
        }
    }
  }

  const acceptDrill = () => {
    if (triggeredSignal) {
      setActiveDrill(triggeredSignal.drill)
      setDrillRemainingCount(triggeredSignal.drill.durationCount)
    }
    setShowDrillAlert(false)
    setTriggeredSignal(null)
  }

  const snoozeDrill = () => {
    setShowDrillAlert(false)
    setTriggeredSignal(null)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const sessionMetrics = calculateSessionMetrics(sessionAttempts)
  const progress = (sessionAttempts.length / sessionTarget) * 100

  // Setup dialog
  if (showSetupDialog) {
    return (
      <div className="flex flex-col min-h-screen">
        <Topbar title="Dial Session" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Start Dial Session</CardTitle>
              <CardDescription>Set your target and begin dialing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Call Target</Label>
                <Select
                  value={sessionTarget.toString()}
                  onValueChange={(value) => setSessionTarget(parseInt(value))}
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
              
              <div className="grid gap-2">
                <Label>Experiment (optional)</Label>
                <Select
                  value={selectedExperiment}
                  onValueChange={setSelectedExperiment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No experiment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No experiment</SelectItem>
                    {experiments.filter(e => e.active).map((exp) => (
                      <SelectItem key={exp.id} value={exp.id}>{exp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Available leads:</p>
                <p className="text-2xl font-bold">{dialableLeads.length}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => router.push("/")}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={startSession} disabled={dialableLeads.length === 0}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar 
        title="Dial Session" 
        actions={
          <Button variant="destructive" onClick={endSession}>
            <XCircle className="mr-2 h-4 w-4" />
            End Session
          </Button>
        }
      />

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {/* Stop Signal Alert */}
        {showDrillAlert && triggeredSignal && (
          <Alert className="mb-6 border-amber-500 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">{triggeredSignal.signal.name}</AlertTitle>
            <AlertDescription className="text-amber-700">
              {triggeredSignal.signal.description}
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={acceptDrill}>
                  Start Drill: {triggeredSignal.drill.name} ({triggeredSignal.drill.durationCount} calls)
                </Button>
                <Button size="sm" variant="outline" onClick={snoozeDrill}>
                  Snooze (20 calls)
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Active Drill Banner */}
        {activeDrill && (
          <Alert className="mb-6 border-primary bg-primary/5">
            <Target className="h-4 w-4 text-primary" />
            <AlertTitle>Current Drill: {activeDrill.name} ({drillRemainingCount} remaining)</AlertTitle>
            <AlertDescription>
              <p className="mb-2">{activeDrill.instructions}</p>
              {activeDrill.script && (
                <p className="italic text-sm bg-background p-2 rounded border">{activeDrill.script}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Session Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{sessionAttempts.length} / {sessionTarget}</p>
              </div>
              <div className="grid grid-cols-4 gap-6 text-center">
                <div>
                  <p className="text-xl font-bold">{sessionMetrics.connectRate}%</p>
                  <p className="text-xs text-muted-foreground">Connect</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{sessionMetrics.dmReachRate}%</p>
                  <p className="text-xs text-muted-foreground">DM Reach</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{sessionMetrics.interestRate}%</p>
                  <p className="text-xs text-muted-foreground">Interest</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-green-600">{sessionMetrics.meetingsSet}</p>
                  <p className="text-xs text-muted-foreground">Meetings</p>
                </div>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Current Lead Card */}
        {currentLead ? (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="h-5 w-5" />
                    {currentLead.company}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {currentLead.segment}
                    {currentLead.isDecisionMaker === "yes" && " • DM"}
                    {currentLead.isFleetOwner === "yes" && " • Fleet Owner"}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {currentLeadIndex + 1} / {Math.min(dialableLeads.length, sessionTarget)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Phone number - prominent */}
              {currentLead.phone && (
                <a
                  href={`tel:${currentLead.phone}`}
                  className="flex items-center gap-3 text-3xl font-mono text-primary hover:underline mb-4"
                >
                  <Phone className="h-7 w-7" />
                  {currentLead.phone}
                </a>
              )}

              {/* Contacts */}
              {currentLead.contacts.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {currentLead.contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">{contact.name}</span>
                      <Badge variant="secondary" className="text-xs">{contact.role}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Call timer */}
              {isOnCall && (
                <div className="flex items-center gap-2 text-2xl font-mono mb-4">
                  <Clock className="h-6 w-6 text-red-500 animate-pulse" />
                  <span>{formatDuration(callDuration)}</span>
                </div>
              )}

              {/* Call controls */}
              <div className="flex gap-3">
                {!isOnCall ? (
                  <>
                    <Button size="lg" className="flex-1 h-14 text-lg" onClick={initiateCall}>
                      <Phone className="mr-2 h-5 w-5" />
                      Dial (D)
                    </Button>
                    <Button size="lg" variant="outline" className="h-14 bg-transparent" onClick={skipLead}>
                      <SkipForward className="mr-2 h-5 w-5" />
                      Skip
                    </Button>
                  </>
                ) : (
                  <Button size="lg" variant="destructive" className="flex-1 h-14 text-lg" onClick={endCall}>
                    <PhoneOff className="mr-2 h-5 w-5" />
                    End Call & Log
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No more leads to dial.</p>
              <Button className="mt-4" onClick={endSession}>
                End Session & Review
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Attempts (compact) */}
        {sessionAttempts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sessionAttempts.slice(0, 3).map((attempt) => {
                  const lead = leads.find(l => l.id === attempt.leadId)
                  return (
                    <div key={attempt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{lead?.company}</span>
                        <Badge variant="outline" className="text-xs">{attempt.outcome}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDuration(attempt.durationSec)}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* SPEED-OPTIMIZED LOG ATTEMPT MODAL */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Log: {currentLead?.company}</span>
              <span className="text-sm font-normal text-muted-foreground">{formatDuration(callDuration)}</span>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Press 1-5 to select, Enter to save
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Step 1: Outcome (REQUIRED) - Large pill buttons */}
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

            {/* Step 2: Why (CONDITIONAL) */}
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

            {/* Optional Rep Mistake (collapsible, always available) */}
            {canShowRepMistake && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="text-sm text-muted-foreground">
                      {selectedRepMistake ? `Mistake: ${selectedRepMistake}` : "Was this a rep mistake? (optional)"}
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
                        onClick={() => setSelectedRepMistake(selectedRepMistake === mistake ? null : mistake)}
                        className={`px-3 py-2 rounded-lg border transition-colors text-sm ${selectedRepMistake === mistake ? "border-red-500 bg-red-50 font-medium" : "border-border hover:bg-muted"}`}
                      >
                        {mistake}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Next Action (auto-computed with override) */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Next:</span>
              <Badge variant="secondary">{finalNextAction}</Badge>
              <Select
                value={nextActionOverride || ""}
                onValueChange={(value) => setNextActionOverride(value as NextAction || null)}
              >
                <SelectTrigger className="w-24 h-7 text-xs">
                  <SelectValue placeholder="Change" />
                </SelectTrigger>
                <SelectContent>
                  {nextActionOptions.map((action) => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional Detail (collapsed) */}
            <Collapsible open={showDetail} onOpenChange={setShowDetail}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="text-sm text-muted-foreground">Add detail (optional)</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showDetail ? "rotate-180" : ""}`} />
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={logAttempt} disabled={!canSave}>
              Save & Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

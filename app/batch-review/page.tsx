"use client"

import { useState, useEffect, useMemo } from "react"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  SkipForward,
  Check,
  ChevronRight,
  Star,
  AlertCircle,
  BookOpen,
  Zap,
  MessageSquare,
} from "lucide-react"
import { useAttempts } from "@/hooks/use-attempts"
import { useLeads } from "@/hooks/use-leads"
import { useCallReviews } from "@/hooks/use-call-reviews"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import type { Attempt, Lead } from "@/lib/store"

// ─── Types ───

interface CallSession {
  id: string
  openphone_call_id: string | null
  recording_url: string | null
  transcript: string | null
  duration_sec: number | null
}

interface ReviewableCall {
  attempt: Attempt
  lead: Lead | null
  session: CallSession | null
}

// ─── Quick Review Tags ───

const QUICK_TAGS = [
  { value: "solid_opener", label: "Solid Opener", color: "bg-green-500/10 text-green-600" },
  { value: "good_discovery", label: "Good Discovery", color: "bg-blue-500/10 text-blue-600" },
  { value: "handled_objection", label: "Handled Objection", color: "bg-purple-500/10 text-purple-600" },
  { value: "weak_close", label: "Weak Close", color: "bg-orange-500/10 text-orange-600" },
  { value: "talked_too_much", label: "Talked Too Much", color: "bg-red-500/10 text-red-600" },
  { value: "no_next_step", label: "No Next Step", color: "bg-red-500/10 text-red-600" },
  { value: "market_intel", label: "Market Intel", color: "bg-cyan-500/10 text-cyan-600" },
  { value: "competitor_mention", label: "Competitor Mention", color: "bg-yellow-500/10 text-yellow-600" },
]

// ─── Deep Dive Rubric ───

const RUBRIC_DIMENSIONS = [
  { key: "opening", label: "Opening", description: "Hook, pattern interrupt, tonality" },
  { key: "discovery", label: "Discovery", description: "Questions, pain uncovering, listening" },
  { key: "control", label: "Frame Control", description: "Directing conversation, pacing" },
  { key: "objections", label: "Objection Handling", description: "Reframes, empathy, persistence" },
  { key: "close", label: "Close Attempt", description: "Asked for commitment, urgency" },
  { key: "nextStep", label: "Next Step Lock", description: "Calendar invite, clear follow-up" },
] as const

// ─── Page ───

export default function ReviewPage() {
  const projectId = useProjectId()
  const { attempts } = useAttempts()
  const { leads } = useLeads()
  const { saveQuickReview, saveDeepReview, saving } = useCallReviews()

  // State
  const [activeTab, setActiveTab] = useState<"quick" | "deep">("quick")
  const [callSessions, setCallSessions] = useState<CallSession[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())

  // Quick review state
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [marketInsight, setMarketInsight] = useState("")
  const [promoteToPlaybook, setPromoteToPlaybook] = useState(false)

  // Deep review state
  const [scores, setScores] = useState<Record<string, number>>({
    opening: 3,
    discovery: 3,
    control: 3,
    objections: 3,
    close: 3,
    nextStep: 3,
  })
  const [whatWorked, setWhatWorked] = useState("")
  const [whatFailed, setWhatFailed] = useState("")
  const [coachingNotes, setCoachingNotes] = useState("")

  // Build reviewable calls — attempts with DM connection (actual conversations)
  const reviewableCalls = useMemo((): ReviewableCall[] => {
    const leadMap = new Map(leads.map((l) => [l.id, l]))
    const sessionMap = new Map(callSessions.map((s) => [s.id, s]))

    return attempts
      .filter((a) => a.dmReached && !reviewedIds.has(a.id))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((attempt) => ({
        attempt,
        lead: leadMap.get(attempt.leadId) || null,
        session: attempt.callSessionId ? sessionMap.get(attempt.callSessionId) || null : null,
      }))
  }, [attempts, leads, callSessions, reviewedIds])

  const currentCall = reviewableCalls[currentIndex] || null

  // Fetch call sessions on mount
  useEffect(() => {
    if (!projectId) return
    const fetchSessions = async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from("call_sessions")
        .select("id, openphone_call_id, recording_url, transcript, duration_sec")
        .eq("project_id", projectId)
      if (data) setCallSessions(data as CallSession[])
    }
    fetchSessions()
  }, [projectId])

  // Reset form when switching calls
  const resetForm = () => {
    setSelectedTags([])
    setMarketInsight("")
    setPromoteToPlaybook(false)
    setScores({ opening: 3, discovery: 3, control: 3, objections: 3, close: 3, nextStep: 3 })
    setWhatWorked("")
    setWhatFailed("")
    setCoachingNotes("")
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const handleQuickSubmit = async () => {
    if (!currentCall) return
    await saveQuickReview({
      attemptId: currentCall.attempt.id,
      callSessionId: currentCall.session?.id,
      tags: selectedTags,
      marketInsight: marketInsight || undefined,
      promoteToPlaybook,
    })
    setReviewedIds((prev) => new Set(prev).add(currentCall.attempt.id))
    resetForm()
    setCurrentIndex((prev) => Math.min(prev, reviewableCalls.length - 2))
  }

  const handleDeepSubmit = async () => {
    if (!currentCall) return
    await saveDeepReview({
      attemptId: currentCall.attempt.id,
      callSessionId: currentCall.session?.id,
      scoreOpening: scores.opening,
      scoreDiscovery: scores.discovery,
      scoreControl: scores.control,
      scoreObjections: scores.objections,
      scoreClose: scores.close,
      scoreNextStep: scores.nextStep,
      whatWorked: whatWorked || undefined,
      whatFailed: whatFailed || undefined,
      coachingNotes: coachingNotes || undefined,
    })
    setReviewedIds((prev) => new Set(prev).add(currentCall.attempt.id))
    resetForm()
    setCurrentIndex((prev) => Math.min(prev, reviewableCalls.length - 2))
  }

  const handleSkip = () => {
    resetForm()
    setCurrentIndex((prev) => Math.min(prev + 1, reviewableCalls.length - 1))
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const maxScore = RUBRIC_DIMENSIONS.length * 5

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar
        title="Call Review"
        actions={
          <Badge variant="outline" className="text-sm">
            {reviewableCalls.length} calls to review
          </Badge>
        }
      />

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "quick" | "deep")} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-2 w-80">
              <TabsTrigger value="quick" className="gap-2">
                <Zap className="h-4 w-4" />
                Quick Batch
              </TabsTrigger>
              <TabsTrigger value="deep" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Deep Dive
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="tabular-nums font-medium">
                {currentIndex + 1} / {reviewableCalls.length}
              </span>
            </div>
          </div>

          {/* Call Card — shared between tabs */}
          {currentCall ? (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {currentCall.lead?.company || "Unknown Company"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {currentCall.lead?.contactName || "Unknown"} ·{" "}
                      {new Date(currentCall.attempt.timestamp).toLocaleDateString()} ·{" "}
                      {currentCall.session?.duration_sec
                        ? `${Math.round(currentCall.session.duration_sec / 60)}min`
                        : "No duration"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={
                          currentCall.attempt.outcome === "Meeting set"
                            ? "default"
                            : currentCall.attempt.outcome?.includes("interest")
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {currentCall.attempt.outcome}
                      </Badge>
                      {currentCall.attempt.why && (
                        <Badge variant="outline">{currentCall.attempt.why}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Audio Player (if recording available) */}
                  {currentCall.session?.recording_url && (
                    <div className="flex items-center gap-2">
                      <audio
                        controls
                        src={currentCall.session.recording_url}
                        className="h-8"
                        preload="none"
                      />
                    </div>
                  )}
                </div>

                {/* Transcript */}
                {currentCall.session?.transcript && (
                  <div className="mt-4 p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Transcript
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{currentCall.session.transcript}</p>
                  </div>
                )}

                {/* Notes from attempt */}
                {currentCall.attempt.notes && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Rep Notes</p>
                    <p className="text-sm">{currentCall.attempt.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold">All Caught Up!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  No more calls to review. Come back after your next session.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ─── Quick Batch Tab ─── */}
          <TabsContent value="quick" className="mt-0 space-y-4">
            {currentCall && (
              <>
                {/* Tags */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Tag This Call</CardTitle>
                    <CardDescription>Select all that apply — builds your pattern library</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TAGS.map((tag) => (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => toggleTag(tag.value)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedTags.includes(tag.value)
                              ? `${tag.color} ring-2 ring-offset-1 ring-primary/30`
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Market Insight + Promote */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-cyan-500" />
                        Market Insight
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Any market intel from this call? Competitor mentions, budget timing, industry trends..."
                        value={marketInsight}
                        onChange={(e) => setMarketInsight(e.target.value)}
                        className="resize-none"
                        rows={3}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Playbook
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <button
                        type="button"
                        onClick={() => setPromoteToPlaybook(!promoteToPlaybook)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${promoteToPlaybook
                            ? "border-yellow-500 bg-yellow-500/5"
                            : "border-border hover:border-yellow-500/40"
                          }`}
                      >
                        <p className="font-medium text-sm">
                          {promoteToPlaybook ? "✓ Marked for Playbook" : "Promote to Playbook?"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Flag this call as a learning moment to review later
                        </p>
                      </button>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={handleSkip}
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleQuickSubmit}
                    disabled={saving || selectedTags.length === 0}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Tag & Next
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ─── Deep Dive Tab ─── */}
          <TabsContent value="deep" className="mt-0 space-y-4">
            {currentCall && (
              <>
                {/* Rubric Scoring */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Rubric Score</span>
                      <span className="tabular-nums text-lg">
                        {totalScore} / {maxScore}
                      </span>
                    </CardTitle>
                    <CardDescription>Rate each dimension 1-5</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {RUBRIC_DIMENSIONS.map((dim) => (
                      <div key={dim.key}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <Label className="font-medium">{dim.label}</Label>
                            <p className="text-xs text-muted-foreground">{dim.description}</p>
                          </div>
                          <span className="text-xl font-bold tabular-nums w-8 text-right">
                            {scores[dim.key]}
                          </span>
                        </div>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[scores[dim.key]]}
                          onValueChange={(v) =>
                            setScores((prev) => ({ ...prev, [dim.key]: v[0] }))
                          }
                          className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>Poor</span>
                          <span>Average</span>
                          <span>Excellent</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Coaching Notes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-green-600">What Worked</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={whatWorked}
                        onChange={(e) => setWhatWorked(e.target.value)}
                        placeholder="Strengths in this call..."
                        rows={4}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-red-600">What Failed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={whatFailed}
                        onChange={(e) => setWhatFailed(e.target.value)}
                        placeholder="Areas to improve..."
                        rows={4}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-blue-600">Coaching Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={coachingNotes}
                        onChange={(e) => setCoachingNotes(e.target.value)}
                        placeholder="Key takeaways, drills to run..."
                        rows={4}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Deep Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={handleSkip}
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleDeepSubmit}
                    disabled={saving}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Save Deep Review
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

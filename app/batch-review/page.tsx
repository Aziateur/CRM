"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  SkipForward,
  Check,
  Star,
  AlertCircle,
  BookOpen,
  Zap,
  MessageSquare,
  Quote,
  X,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react"
import { useAttempts } from "@/hooks/use-attempts"
import { useLeads } from "@/hooks/use-leads"
import { useCallReviews, type EvidenceSnippet, type DecisionType } from "@/hooks/use-call-reviews"
import { useReviewTemplates, type ReviewField } from "@/hooks/use-review-templates"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import type { Attempt, Lead } from "@/lib/store"
import { PromoteToPlaybookModal } from "@/components/promote-to-playbook-modal"

// ─── Types ───

interface CallSession {
  call_session_id: string
  attempt_id: string | null
  recording_url: string | null
  transcript_text: string | null
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

// ─── Anchor Label Component ───

function AnchorLabel({ value, anchors }: { value: number; anchors?: Record<string, string> }) {
  if (!anchors) return null
  const label = anchors[String(value)]
  if (!label) return null
  return (
    <p className="text-xs text-muted-foreground mt-1.5 p-2 bg-muted/50 rounded-md border border-border/50 italic leading-relaxed">
      {label}
    </p>
  )
}

// ─── Evidence Quote Component ───

function EvidenceQuoteField({
  field,
  transcriptText,
  snippet,
  onUpdate,
}: {
  field: ReviewField
  transcriptText: string | null
  snippet: EvidenceSnippet | undefined
  onUpdate: (snippet: EvidenceSnippet | null) => void
}) {
  const [selecting, setSelecting] = useState(false)
  const lines = useMemo(
    () => (transcriptText ? transcriptText.split("\n").filter(Boolean) : []),
    [transcriptText],
  )
  const [selectedLines, setSelectedLines] = useState<Set<number>>(
    new Set(snippet?.transcriptLines ?? []),
  )

  const toggleLine = (idx: number) => {
    setSelectedLines((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const confirmSelection = () => {
    const sortedLines = Array.from(selectedLines).sort((a, b) => a - b)
    const text = sortedLines.map((i) => lines[i]).join("\n")
    onUpdate({
      fieldKey: field.key,
      text,
      transcriptLines: sortedLines,
    })
    setSelecting(false)
  }

  if (!transcriptText) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg border border-dashed text-sm text-muted-foreground">
        No transcript available — evidence quoting requires a transcript
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-medium flex items-center gap-1.5">
          <Quote className="h-3.5 w-3.5 text-amber-500" />
          {field.label}
        </Label>
        {!selecting && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelecting(true)}
            className="text-xs h-7"
          >
            {snippet ? "Re-select lines" : "Select from transcript"}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {field.config.prompt || "Select transcript lines as evidence"}
      </p>

      {/* Current snippet */}
      {snippet && !selecting && (
        <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 relative group">
          <button
            onClick={() => onUpdate(null)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <p className="text-sm whitespace-pre-wrap font-mono">{snippet.text}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Lines {snippet.transcriptLines?.join(", ")}
          </p>
        </div>
      )}

      {/* Line selector */}
      {selecting && (
        <div className="space-y-2">
          <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-0.5">
            {lines.map((line, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleLine(idx)}
                className={`w-full text-left text-xs p-1.5 rounded transition-colors ${selectedLines.has(idx)
                  ? "bg-amber-100 text-amber-900 font-medium"
                  : "hover:bg-muted/50"
                  }`}
              >
                <span className="text-muted-foreground font-mono mr-2">{idx + 1}</span>
                {line}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelecting(false)} className="text-xs h-7">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmSelection}
              disabled={selectedLines.size === 0}
              className="text-xs h-7"
            >
              Attach {selectedLines.size} line{selectedLines.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ───

export default function ReviewPage() {
  const projectId = useProjectId()
  const { attempts } = useAttempts()
  const { leads } = useLeads()
  const { saveQuickReview, saveDeepReview, saving } = useCallReviews()
  const { activeDeepTemplate, loading: templatesLoading } = useReviewTemplates()

  // State
  const [activeTab, setActiveTab] = useState<"quick" | "deep">("quick")
  const [callSessions, setCallSessions] = useState<CallSession[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())

  // Quick review state
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [marketInsight, setMarketInsight] = useState("")
  const [promoteToPlaybook, setPromoteToPlaybook] = useState(false)
  const [showPromotionModal, setShowPromotionModal] = useState(false)

  // Deep review state — template-driven
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [evidenceSnippets, setEvidenceSnippets] = useState<EvidenceSnippet[]>([])

  // Evidence gating state
  const [showUnverifiedConfirm, setShowUnverifiedConfirm] = useState(false)

  // Decision state (required for Deep Dive)
  const [decisionType, setDecisionType] = useState<DecisionType | null>(null)
  const [decisionReason, setDecisionReason] = useState("")

  // Initialize responses when template loads or call changes
  useEffect(() => {
    if (!activeDeepTemplate) return
    const defaults: Record<string, unknown> = {}
    for (const field of activeDeepTemplate.fields) {
      if (field.fieldType === "score") {
        defaults[field.key] = Math.ceil(((field.config.min ?? 1) + (field.config.max ?? 5)) / 2)
      } else if (field.fieldType === "text") {
        defaults[field.key] = ""
      } else if (field.fieldType === "multi_select") {
        defaults[field.key] = []
      } else if (field.fieldType === "checkbox") {
        defaults[field.key] = false
      }
    }
    setResponses(defaults)
    setEvidenceSnippets([])
  }, [activeDeepTemplate, currentIndex])

  // Build reviewable calls
  const reviewableCalls = useMemo((): ReviewableCall[] => {
    const leadMap = new Map(leads.map((l) => [l.id, l]))
    const sessionByIdMap = new Map(callSessions.map((s) => [s.call_session_id, s]))
    const sessionByAttemptMap = new Map(
      callSessions.filter((s) => s.attempt_id).map((s) => [s.attempt_id!, s]),
    )

    return attempts
      .filter((a) => a.dmReached && !reviewedIds.has(a.id))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((attempt) => ({
        attempt,
        lead: leadMap.get(attempt.leadId) || null,
        session:
          (attempt.sessionId ? sessionByIdMap.get(attempt.sessionId) : null) ||
          sessionByAttemptMap.get(attempt.id) ||
          null,
      }))
  }, [attempts, leads, callSessions, reviewedIds])

  const currentCall = reviewableCalls[currentIndex] || null

  // ─── Evidence readiness ───
  const hasEvidence = Boolean(
    currentCall?.session?.recording_url || currentCall?.session?.transcript_text,
  )

  // Fetch call sessions (view inherits project scope via call_sessions.project_id)
  useEffect(() => {
    if (!projectId) return
    const fetchSessions = async () => {
      const supabase = getSupabase()
      // The view joins call_sessions which has project_id — but the view doesn't expose it.
      // We filter by attempt_ids we already have (which are project-scoped from useAttempts).
      const attemptIds = attempts.map((a) => a.id)
      if (attemptIds.length === 0) return
      const { data } = await supabase
        .from("v_calls_with_artifacts")
        .select("call_session_id, attempt_id, recording_url, transcript_text")
        .in("attempt_id", attemptIds)
      if (data) setCallSessions(data as CallSession[])
    }
    fetchSessions()
  }, [projectId, attempts])

  // Auto-refresh evidence for the current call (polls every 10s when evidence is missing)
  useEffect(() => {
    if (!currentCall || hasEvidence) return
    const attemptId = currentCall.attempt.id
    if (!attemptId) return

    const poll = async () => {
      try {
        const supabase = getSupabase()
        const { data } = await supabase
          .from("v_calls_with_artifacts")
          .select("call_session_id, attempt_id, recording_url, transcript_text")
          .eq("attempt_id", attemptId)
          .maybeSingle()

        if (data && (data.recording_url || data.transcript_text)) {
          setCallSessions((prev) => {
            const existing = prev.findIndex((s) => s.attempt_id === attemptId)
            const updated = data as CallSession
            if (existing >= 0) {
              const next = [...prev]
              next[existing] = updated
              return next
            }
            return [...prev, updated]
          })
        }
      } catch (err) {
        console.warn("[ReviewPage] Evidence poll error:", err)
      }
    }

    const intervalId = setInterval(poll, 10_000)
    // Also poll immediately once
    poll()
    return () => clearInterval(intervalId)
  }, [currentCall?.attempt.id, hasEvidence]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form
  const resetForm = () => {
    setSelectedTags([])
    setMarketInsight("")
    setPromoteToPlaybook(false)
    setShowPromotionModal(false)
    setShowUnverifiedConfirm(false)
    setDecisionType(null)
    setDecisionReason("")
    // Deep responses reset handled by useEffect on currentIndex change
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
      callSessionId: currentCall.session?.call_session_id,
      tags: selectedTags,
      marketInsight: marketInsight || undefined,
      promoteToPlaybook,
      evidenceVerified: hasEvidence,
    })
    setReviewedIds((prev) => new Set(prev).add(currentCall.attempt.id))
    resetForm()
    setCurrentIndex((prev) => Math.min(prev, reviewableCalls.length - 2))
  }

  const handleDeepSubmit = async () => {
    if (!currentCall || !activeDeepTemplate) return
    // Gate: require decision
    if (!decisionType) return
    // Gate: require explicit confirmation if no evidence
    if (!hasEvidence && !showUnverifiedConfirm) {
      setShowUnverifiedConfirm(true)
      return
    }
    await saveDeepReview({
      attemptId: currentCall.attempt.id,
      callSessionId: currentCall.session?.call_session_id,
      templateId: activeDeepTemplate.id,
      templateVersion: activeDeepTemplate.version,
      responses,
      evidenceSnippets,
      evidenceVerified: hasEvidence,
      decisionType,
      decisionPayload: decisionType === "no_decision"
        ? { reason: decisionReason }
        : {},
    })
    setReviewedIds((prev) => new Set(prev).add(currentCall.attempt.id))
    resetForm()
    setCurrentIndex((prev) => Math.min(prev, reviewableCalls.length - 2))
  }

  const handleSkip = () => {
    resetForm()
    setCurrentIndex((prev) => Math.min(prev + 1, reviewableCalls.length - 1))
  }

  // Compute total score from score fields
  const scoreFields = activeDeepTemplate?.fields.filter((f) => f.fieldType === "score") ?? []
  const totalScore = scoreFields.reduce((sum, f) => sum + ((responses[f.key] as number) ?? 0), 0)
  const maxScore = scoreFields.reduce((sum, f) => sum + (f.config.max ?? 5), 0)

  // Group fields by section
  const fieldSections = useMemo(() => {
    if (!activeDeepTemplate) return []
    const sections = new Map<string, ReviewField[]>()
    for (const field of activeDeepTemplate.fields) {
      const section = field.section || "General"
      if (!sections.has(section)) sections.set(section, [])
      sections.get(section)!.push(field)
    }
    return Array.from(sections.entries())
  }, [activeDeepTemplate])

  const updateEvidence = (fieldKey: string, snippet: EvidenceSnippet | null) => {
    setEvidenceSnippets((prev) => {
      const filtered = prev.filter((s) => s.fieldKey !== fieldKey)
      if (snippet) filtered.push(snippet)
      return filtered
    })
  }

  return (
    <>
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

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {activeDeepTemplate && activeTab === "deep" && (
                  <Badge variant="secondary" className="text-xs">
                    {activeDeepTemplate.name} v{activeDeepTemplate.version}
                  </Badge>
                )}
                <span className="tabular-nums font-medium">
                  {currentIndex + 1} / {reviewableCalls.length}
                </span>
              </div>
            </div>

            {/* ─── Call Card (shared between tabs) ─── */}
            {currentCall ? (
              <Card className="mb-4">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {currentCall.lead?.company || "Unknown Company"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {currentCall.attempt.outcome} ·{" "}
                        {new Date(currentCall.attempt.timestamp).toLocaleDateString()}
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

                    {/* Audio Player */}
                    {currentCall.session?.recording_url ? (
                      <div className="flex items-center gap-2">
                        <audio
                          controls
                          src={currentCall.session.recording_url}
                          className="h-8"
                          preload="none"
                        />
                      </div>
                    ) : currentCall.session ? (
                      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300 animate-pulse">
                        Recording pending...
                      </Badge>
                    ) : null}
                  </div>

                  {/* Transcript */}
                  {currentCall.session?.transcript_text ? (
                    <div className="mt-4 p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Transcript
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{currentCall.session.transcript_text}</p>
                    </div>
                  ) : currentCall.session ? (
                    <div className="mt-4 p-3 bg-yellow-50/50 rounded-lg border border-yellow-200">
                      <p className="text-xs text-yellow-600 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Transcript processing — will appear when OpenPhone webhook delivers it
                      </p>
                    </div>
                  ) : null}

                  {/* Rep Notes */}
                  {currentCall.attempt.note && (
                    <div className="mt-3 p-2 bg-muted/50 rounded">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Rep Notes</p>
                      <p className="text-sm">{currentCall.attempt.note}</p>
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
                          onClick={() => setShowPromotionModal(true)}
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${promoteToPlaybook
                            ? "border-green-500 bg-green-500/5"
                            : "border-border hover:border-yellow-500/40"
                            }`}
                        >
                          <p className="font-medium text-sm">
                            {promoteToPlaybook ? "✓ Promoted to Playbook" : "Promote to Playbook"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {promoteToPlaybook
                              ? "Rule and evidence link created"
                              : "Create a new rule or link evidence to an existing one"}
                          </p>
                        </button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Evidence warning — Quick Batch */}
                  {!hasEvidence && currentCall && (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50/50 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-amber-800">No recording or transcript available</p>
                        <p className="text-amber-600 text-xs mt-0.5">
                          This review will be marked as <span className="font-semibold">Unverified</span> — scored from memory, not evidence.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 bg-transparent" onClick={handleSkip}>
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

            {/* ─── Deep Dive Tab (template-driven) ─── */}
            <TabsContent value="deep" className="mt-0 space-y-4">
              {currentCall && activeDeepTemplate && (
                <>
                  {/* Template Header + Score */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>{activeDeepTemplate.name}</span>
                        {scoreFields.length > 0 && (
                          <span className="tabular-nums text-lg">
                            {totalScore} / {maxScore}
                          </span>
                        )}
                      </CardTitle>
                      {activeDeepTemplate.description && (
                        <CardDescription>{activeDeepTemplate.description}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>

                  {/* Render fields by section */}
                  {fieldSections.map(([section, fields]) => (
                    <Card key={section}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
                          {section}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {fields.map((field) => {
                          // ─── Score Field with Calibration Anchors ───
                          if (field.fieldType === "score") {
                            const value = (responses[field.key] as number) ?? field.config.min ?? 1
                            return (
                              <div key={field.key}>
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <Label className="font-medium">{field.label}</Label>
                                  </div>
                                  <span className="text-xl font-bold tabular-nums w-8 text-right">
                                    {value}
                                  </span>
                                </div>
                                <Slider
                                  min={field.config.min ?? 1}
                                  max={field.config.max ?? 5}
                                  step={1}
                                  value={[value]}
                                  onValueChange={(v) =>
                                    setResponses((prev) => ({ ...prev, [field.key]: v[0] }))
                                  }
                                  className="w-full"
                                />
                                {/* Calibration anchor for current value */}
                                <AnchorLabel value={value} anchors={field.config.anchors} />
                              </div>
                            )
                          }

                          // ─── Text Field ───
                          if (field.fieldType === "text") {
                            return (
                              <div key={field.key}>
                                <Label className="font-medium">{field.label}</Label>
                                <Textarea
                                  value={(responses[field.key] as string) ?? ""}
                                  onChange={(e) =>
                                    setResponses((prev) => ({
                                      ...prev,
                                      [field.key]: e.target.value,
                                    }))
                                  }
                                  placeholder={field.config.placeholder ?? ""}
                                  rows={field.config.rows ?? 3}
                                  className="resize-none mt-1.5"
                                />
                              </div>
                            )
                          }

                          // ─── Evidence Quote Field ───
                          if (field.fieldType === "evidence_quote") {
                            return (
                              <EvidenceQuoteField
                                key={field.key}
                                field={field}
                                transcriptText={currentCall.session?.transcript_text ?? null}
                                snippet={evidenceSnippets.find((s) => s.fieldKey === field.key)}
                                onUpdate={(s) => updateEvidence(field.key, s)}
                              />
                            )
                          }

                          // ─── Checkbox Field ───
                          if (field.fieldType === "checkbox") {
                            return (
                              <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(responses[field.key] as boolean) ?? false}
                                  onChange={(e) =>
                                    setResponses((prev) => ({
                                      ...prev,
                                      [field.key]: e.target.checked,
                                    }))
                                  }
                                  className="rounded"
                                />
                                <span className="text-sm font-medium">{field.label}</span>
                              </label>
                            )
                          }

                          // ─── Multi-Select Field ───
                          if (field.fieldType === "multi_select") {
                            const selected = (responses[field.key] as string[]) ?? []
                            return (
                              <div key={field.key}>
                                <Label className="font-medium">{field.label}</Label>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  {(field.config.options ?? []).map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() =>
                                        setResponses((prev) => {
                                          const cur = (prev[field.key] as string[]) ?? []
                                          return {
                                            ...prev,
                                            [field.key]: cur.includes(opt.value)
                                              ? cur.filter((v) => v !== opt.value)
                                              : [...cur, opt.value],
                                          }
                                        })
                                      }
                                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selected.includes(opt.value)
                                        ? `${opt.color ?? "bg-primary/10 text-primary"} ring-2 ring-offset-1 ring-primary/30`
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          }

                          return null
                        })}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Decision Output — Required */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-500" />
                        What Next? <span className="text-red-500">*</span>
                      </CardTitle>
                      <CardDescription>Every review must produce a decision</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { value: "rule_draft" as const, label: "📝 Rule Draft", desc: "Create or update a playbook rule" },
                          { value: "experiment" as const, label: "🧪 Experiment", desc: "Test something specific next session" },
                          { value: "drill" as const, label: "🎯 Drill", desc: "Assign a corrective drill" },
                          { value: "no_decision" as const, label: "⏭️ No Decision", desc: "Nothing actionable (give reason)" },
                        ]).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setDecisionType(opt.value)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${decisionType === opt.value
                              ? "border-purple-500 bg-purple-50"
                              : "border-border hover:border-purple-300"
                              }`}
                          >
                            <p className="font-medium text-sm">{opt.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                      {decisionType === "no_decision" && (
                        <Textarea
                          value={decisionReason}
                          onChange={(e) => setDecisionReason(e.target.value)}
                          placeholder="Why is there nothing actionable? e.g., Already covered by existing rules, clean execution..."
                          rows={2}
                          className="resize-none text-sm mt-2"
                        />
                      )}
                      {!decisionType && (
                        <p className="text-xs text-red-500 font-medium">Select a decision type to enable submission</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Evidence warning — Deep Dive */}
                  {!hasEvidence && currentCall && (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-red-300 bg-red-50/50 text-sm">
                      <ShieldAlert className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-red-800">Evidence required for Deep Dive</p>
                        <p className="text-red-600 text-xs mt-0.5">
                          No recording or transcript — scoring without evidence contaminates analytics.
                          You can still submit, but the review will be marked <span className="font-semibold">Unverified</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Unverified confirmation */}
                  {showUnverifiedConfirm && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-red-400 bg-red-50">
                      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                      <p className="text-sm text-red-800 flex-1">Are you sure? This Deep Dive will be saved as <strong>Unverified</strong>.</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowUnverifiedConfirm(false)} className="text-xs h-7">
                          Cancel
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleDeepSubmit} className="text-xs h-7">
                          Submit Unverified
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Deep Actions */}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 bg-transparent" onClick={handleSkip}>
                      <SkipForward className="mr-2 h-4 w-4" />
                      Skip
                    </Button>
                    <Button className="flex-1" onClick={handleDeepSubmit} disabled={saving || !decisionType}>
                      <Check className="mr-2 h-4 w-4" />
                      {!decisionType
                        ? "Select Decision First"
                        : hasEvidence
                          ? "Save Deep Review"
                          : "Submit as Unverified…"}
                    </Button>
                  </div>
                </>
              )}

              {/* No template state */}
              {currentCall && !activeDeepTemplate && !templatesLoading && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold">No Review Template Found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create a review template in Settings → Templates to enable Deep Dive reviews
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div >

      {/* Promotion Modal */}
      {
        showPromotionModal && currentCall && (
          <PromoteToPlaybookModal
            attemptId={currentCall.attempt.id}
            callSessionId={currentCall.session?.call_session_id}
            onPromoted={() => setPromoteToPlaybook(true)}
            onClose={() => setShowPromotionModal(false)}
          />
        )
      }
    </>
  )
}

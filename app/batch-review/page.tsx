"use client"

import { useState, useEffect, useMemo } from "react"
import { Topbar } from "@/components/topbar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Zap, FlaskConical } from "lucide-react"
import { useRankedCallsQuery } from "@/queries/ranked-calls"
import { useCreateQuickReview, useCreateDeepReview, useSetReviewBucket, type EvidenceSnippet, type DecisionType } from "@/queries/review-commands"
import { useExperimentsQuery } from "@/queries/experiments"
import { useAttempts } from "@/hooks/use-attempts"
import { useLeads } from "@/hooks/use-leads"
import { useTemplatesQuery } from "@/queries/templates"
import { useRealtimeInvalidation } from "@/queries/realtime"
import { getSupabase } from "@/lib/supabase"
import { OUTCOMES } from "@/lib/store"
import { useProjectId } from "@/hooks/use-project-id"
import { PromoteToPlaybookModal } from "@/components/promote-to-playbook-modal"
import { ExperimentsBatchTab } from "@/components/experiments-batch-tab"
import {
  ReviewCallCard,
  QuickBatchFields,
  ReviewedCallsTable,
  DeepDivePanel,
  type CallSession,
  type ReviewableCall,
} from "@/components/batch-review"

// ─── Types ───

type ReviewScope = "dm_reached" | "gatekeeper" | "all"

// ─── Page ───

export default function ReviewPage() {
  const projectId = useProjectId()
  const { attempts } = useAttempts()
  const { leads } = useLeads({ withContacts: true })
  const createQuickReview = useCreateQuickReview()
  const createDeepReview = useCreateDeepReview()
  const setReviewBucket = useSetReviewBucket()
  const saving = createQuickReview.isPending || createDeepReview.isPending
  const { activeDeepTemplate, activeQuickTemplate, loading: templatesLoading } = useTemplatesQuery()
  useRealtimeInvalidation()

  // State
  const [activeTab, setActiveTab] = useState<"quick" | "deep" | "experiments">("quick")
  const { topCalls, bottomCalls, allRanked, fieldDefs, stats: rankedStats, bucketCounts } = useRankedCallsQuery()
  const { activeExperiments } = useExperimentsQuery()
  const [callSessions, setCallSessions] = useState<CallSession[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [reviewScope, setReviewScope] = useState<ReviewScope>("dm_reached")
  const [deepDiveAttemptIds, setDeepDiveAttemptIds] = useState<Set<string> | null>(null)
  const [deepDiveLabel, setDeepDiveLabel] = useState<string>("")
  const [experimentFilter, setExperimentFilter] = useState<string | null>(null)

  // Auto-populate deep dive queue from top + bottom buckets when switching to deep tab
  useEffect(() => {
    if (activeTab === "deep" && !deepDiveAttemptIds) {
      const bucketedIds = [...topCalls, ...bottomCalls].map(c => c.attemptId)
      if (bucketedIds.length > 0) {
        setDeepDiveAttemptIds(new Set(bucketedIds))
        setDeepDiveLabel(`Top ${topCalls.length} + Bottom ${bottomCalls.length}`)
        setCurrentIndex(0)
      }
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Deep dive progress tracking
  const deepDiveTotal = deepDiveAttemptIds?.size ?? 0
  const deepDiveCompleted = deepDiveAttemptIds
    ? [...deepDiveAttemptIds].filter(id => reviewedIds.has(id)).length
    : 0

  // Quick review state
  const [marketInsight, setMarketInsight] = useState("")
  const [promoteToPlaybook, setPromoteToPlaybook] = useState(false)
  const [showPromotionModal, setShowPromotionModal] = useState(false)
  const [quickResponses, setQuickResponses] = useState<Record<string, unknown>>({})
  const [quickBucket, setQuickBucket] = useState<"top" | "bottom" | null>(null)

  // Deep review state — template-driven
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [evidenceSnippets, setEvidenceSnippets] = useState<EvidenceSnippet[]>([])
  const [showUnverifiedConfirm, setShowUnverifiedConfirm] = useState(false)

  // Decision state (required for Deep Dive)
  const [decisionType, setDecisionType] = useState<DecisionType | null>(null)
  const [decisionReason, setDecisionReason] = useState("")
  const [createdExperimentId, setCreatedExperimentId] = useState<string | null>(null)
  const [experimentRefreshTrigger, setExperimentRefreshTrigger] = useState(0)

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
      .filter((a) => {
        if (reviewedIds.has(a.id)) return false
        if (activeTab === "deep" && deepDiveAttemptIds) {
          return deepDiveAttemptIds.has(a.id)
        }
        if (experimentFilter) {
          const rankedCall = allRanked.find(c => c.attemptId === a.id)
          if (rankedCall?.experimentId !== experimentFilter) return false
        }
        switch (reviewScope) {
          case "dm_reached": return a.dmReached
          case "gatekeeper": return a.outcome === OUTCOMES.GATEKEEPER.value
          case "all": return true
        }
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((attempt) => ({
        attempt,
        lead: leadMap.get(attempt.leadId) || null,
        session:
          (attempt.sessionId ? sessionByIdMap.get(attempt.sessionId) : null) ||
          sessionByAttemptMap.get(attempt.id) ||
          null,
      }))
  }, [attempts, leads, callSessions, reviewedIds, reviewScope, activeTab, deepDiveAttemptIds, experimentFilter, allRanked])

  const currentCall = reviewableCalls[currentIndex] || null

  // Evidence readiness
  const hasEvidence = Boolean(
    currentCall?.session?.recording_url || currentCall?.session?.transcript_text,
  )

  // Fetch call sessions
  useEffect(() => {
    if (!projectId) return
    const fetchSessions = async () => {
      const supabase = getSupabase()
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
    poll()
    return () => clearInterval(intervalId)
  }, [currentCall?.attempt.id, hasEvidence]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form
  const resetForm = () => {
    setMarketInsight("")
    setPromoteToPlaybook(false)
    setShowPromotionModal(false)
    setShowUnverifiedConfirm(false)
    setDecisionType(null)
    setDecisionReason("")
    setCreatedExperimentId(null)
    setQuickResponses({})
    setQuickBucket(null)
  }

  const handleQuickSubmit = async () => {
    if (!currentCall) return
    const derivedTags: string[] = []
    if (activeQuickTemplate) {
      activeQuickTemplate.fields
        .filter((f) => f.fieldType === "multi_select")
        .forEach((f) => {
          const sel = (quickResponses[f.key] as string[] | undefined) ?? []
          derivedTags.push(...sel)
        })
    }
    await createQuickReview.mutateAsync({
      attemptId: currentCall.attempt.id,
      callSessionId: currentCall.session?.call_session_id,
      tags: derivedTags,
      marketInsight: marketInsight || undefined,
      promoteToPlaybook,
      evidenceVerified: hasEvidence,
      templateId: activeQuickTemplate?.id,
      templateVersion: activeQuickTemplate?.version,
      responses: activeQuickTemplate ? quickResponses : undefined,
      callBucket: quickBucket,
    })
    setReviewedIds((prev) => new Set(prev).add(currentCall.attempt.id))
    resetForm()
    setCurrentIndex((prev) => Math.min(prev, reviewableCalls.length - 2))
  }

  const handleDeepSubmit = async () => {
    if (!currentCall || !activeDeepTemplate) return
    if (!decisionType) return
    if (!hasEvidence && !showUnverifiedConfirm) {
      setShowUnverifiedConfirm(true)
      return
    }
    await createDeepReview.mutateAsync({
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
        : decisionType === "experiment" && createdExperimentId
          ? { experiment_id: createdExperimentId }
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

  const handleDeepDive = (attemptIds: Set<string>, label: string) => {
    setDeepDiveAttemptIds(attemptIds)
    setDeepDiveLabel(label)
    setCurrentIndex(0)
    setActiveTab("deep")
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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "quick" | "deep" | "experiments")} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="grid grid-cols-3 w-[480px]">
                <TabsTrigger value="quick" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Quick Batch
                </TabsTrigger>
                <TabsTrigger value="deep" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Deep Dive
                </TabsTrigger>
                <TabsTrigger value="experiments" className="gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Experiments
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

            {activeTab !== "experiments" && (
              <>
                {/* Scope Selector — Quick Batch only */}
                {activeTab === "quick" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground font-medium">Scope:</span>
                    {([
                      { value: "dm_reached" as const, label: "DM Reached", count: attempts.filter(a => a.dmReached && !reviewedIds.has(a.id)).length },
                      { value: "gatekeeper" as const, label: "Gatekeeper", count: attempts.filter(a => a.outcome === OUTCOMES.GATEKEEPER.value && !reviewedIds.has(a.id)).length },
                      { value: "all" as const, label: "All Calls", count: attempts.filter(a => !reviewedIds.has(a.id)).length },
                    ]).map((scope) => (
                      <button
                        key={scope.value}
                        onClick={() => { setReviewScope(scope.value); setCurrentIndex(0); setExperimentFilter(null) }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${reviewScope === scope.value && !experimentFilter
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                      >
                        {scope.label} ({scope.count})
                      </button>
                    ))}
                    {/* Experiment filter */}
                    {activeExperiments.length > 0 && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <select
                          value={experimentFilter ?? ""}
                          onChange={(e) => {
                            const val = e.target.value || null
                            setExperimentFilter(val)
                            setCurrentIndex(0)
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all bg-muted border-0 cursor-pointer ${experimentFilter
                            ? "ring-2 ring-purple-400 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                          <option value="">Experiment…</option>
                          {activeExperiments.map(exp => (
                            <option key={exp.id} value={exp.id}>{exp.name}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                )}

                {/* Call Card (shared between tabs) */}
                <ReviewCallCard
                  currentCall={currentCall}
                  activeTab={activeTab}
                  allRanked={allRanked}
                />
              </>
            )}

            {/* Quick Batch Tab */}
            <TabsContent value="quick" className="mt-0 space-y-4">
              {currentCall && (
                <QuickBatchFields
                  currentCall={currentCall}
                  activeQuickTemplate={activeQuickTemplate}
                  hasEvidence={hasEvidence}
                  saving={saving}
                  quickResponses={quickResponses}
                  setQuickResponses={setQuickResponses}
                  quickBucket={quickBucket}
                  setQuickBucket={setQuickBucket}
                  onSubmit={handleQuickSubmit}
                  onSkip={handleSkip}
                />
              )}

              <ReviewedCallsTable
                allRanked={allRanked}
                topCalls={topCalls}
                bottomCalls={bottomCalls}
                bucketCounts={bucketCounts}
                fieldDefs={fieldDefs}
                setReviewBucket={setReviewBucket}
                onDeepDive={handleDeepDive}
              />
            </TabsContent>

            {/* Deep Dive Tab */}
            <TabsContent value="deep" className="mt-0 space-y-4">
              {currentCall && activeDeepTemplate && (
                <DeepDivePanel
                  currentCall={currentCall}
                  activeDeepTemplate={activeDeepTemplate}
                  hasEvidence={hasEvidence}
                  saving={saving}
                  responses={responses}
                  setResponses={setResponses}
                  evidenceSnippets={evidenceSnippets}
                  setEvidenceSnippets={setEvidenceSnippets}
                  decisionType={decisionType}
                  setDecisionType={setDecisionType}
                  decisionReason={decisionReason}
                  setDecisionReason={setDecisionReason}
                  createdExperimentId={createdExperimentId}
                  setCreatedExperimentId={setCreatedExperimentId}
                  onExperimentCreated={() => setExperimentRefreshTrigger(prev => prev + 1)}
                  deepDiveAttemptIds={deepDiveAttemptIds}
                  deepDiveLabel={deepDiveLabel}
                  deepDiveCompleted={deepDiveCompleted}
                  deepDiveTotal={deepDiveTotal}
                  onClearDeepDiveFilter={() => {
                    setDeepDiveAttemptIds(null)
                    setDeepDiveLabel("")
                    setCurrentIndex(0)
                  }}
                  onBackToQuickBatch={() => {
                    setDeepDiveAttemptIds(null)
                    setDeepDiveLabel("")
                    setActiveTab("quick")
                  }}
                  onSubmit={handleDeepSubmit}
                  onSkip={handleSkip}
                  showUnverifiedConfirm={showUnverifiedConfirm}
                  setShowUnverifiedConfirm={setShowUnverifiedConfirm}
                />
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

            {/* Experiments Tab */}
            <TabsContent value="experiments" className="mt-0 space-y-6">
              <ExperimentsBatchTab
                refetchTrigger={experimentRefreshTrigger}
                onReviewCalls={(experimentId) => {
                  setExperimentFilter(experimentId)
                  setCurrentIndex(0)
                  setActiveTab("quick")
                }}
                onDeepDiveCalls={(experimentId, label) => {
                  const expAttemptIds = allRanked
                    .filter(c => c.experimentId === experimentId)
                    .map(c => c.attemptId)
                  if (expAttemptIds.length > 0) {
                    setDeepDiveAttemptIds(new Set(expAttemptIds))
                    setDeepDiveLabel(`${label}`)
                    setCurrentIndex(0)
                    setActiveTab("deep")
                  }
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Promotion Modal */}
      {showPromotionModal && currentCall && (
        <PromoteToPlaybookModal
          attemptId={currentCall.attempt.id}
          callSessionId={currentCall.session?.call_session_id}
          onPromoted={() => setPromoteToPlaybook(true)}
          onClose={() => setShowPromotionModal(false)}
        />
      )}
    </>
  )
}

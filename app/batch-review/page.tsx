"use client"
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  ChevronRight, 
  ChevronLeft,
  ThumbsUp,
  ThumbsDown,
  SkipForward,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  Clock,
  Play,
  Check,
  AlertTriangle
} from "lucide-react"
import {
  leads as allLeads,
  attempts as allAttempts,
  experiments,
  drills,
  getLeadById,
  getExperimentById,
  calculateMetrics,
  getTopFailureReasons,
  type Attempt,
  type Lead,
  type Outcome,
  type RuleConfidence,
  type Drill,
} from "@/lib/store"

const getOutcomeColor = (outcome: Outcome) => {
  const colors: Record<Outcome, string> = {
    "No connect": "bg-muted text-muted-foreground",
    "Gatekeeper only": "bg-orange-100 text-orange-800",
    "DM reached → No interest": "bg-red-100 text-red-800",
    "DM reached → Some interest": "bg-amber-100 text-amber-800",
    "Meeting set": "bg-green-100 text-green-800",
  }
  return colors[outcome] || "bg-muted text-muted-foreground"
}

type ReviewRating = "top" | "bottom" | "skip" | null

interface AttemptWithRating extends Attempt {
  rating?: ReviewRating
}

type ReviewStep = "setup" | "review" | "summary" | "learnings" | "complete"

export default function BatchReviewPage() {
  const router = useRouter()
  
  // Step state
  const [currentStep, setCurrentStep] = useState<ReviewStep>("setup")
  
  // Setup state
  const [reviewRange, setReviewRange] = useState<"last20" | "last50" | "custom">("last20")
  const [experimentFilter, setExperimentFilter] = useState<string>("all")
  
  // Review state
  const [attemptsToReview, setAttemptsToReview] = useState<AttemptWithRating[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null)
  const attemptsPerPage = 5
  
  // Learnings state
  const [learningNotes, setLearningNotes] = useState("")
  const [newRuleText, setNewRuleText] = useState("")
  const [proposedRules, setProposedRules] = useState<{ ifWhen: string; then: string; because: string; confidence: RuleConfidence }[]>([])
  const [selectedDrill, setSelectedDrill] = useState<string>("")
  const [drillDuration, setDrillDuration] = useState(10)
  
  // Data state
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([])
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [experiments, setExperiments] = useState<any[]>([]) // using any for simplicity or import type

  useEffect(() => {
    const fetchData = async () => {
      // Fetch attempts
      const supabase = getSupabase()
      const { data: attemptsData } = await supabase
        .from('attempts')
        .select('*')
        .order('created_at', { ascending: false })

      if (attemptsData) {
         const mappedAttempts: Attempt[] = attemptsData.map((a: any) => ({
            id: a.id,
            leadId: a.lead_id,
            contactId: a.contact_id,
            timestamp: a.timestamp,
            outcome: a.outcome,
            why: a.why,
            repMistake: a.rep_mistake,
            dmReached: a.dm_reached,
            nextAction: a.next_action,
            note: a.note,
            durationSec: a.duration_sec,
            experimentTag: a.experiment_tag,
            sessionId: a.session_id,
            createdAt: a.created_at
         }))
         setAllAttempts(mappedAttempts)
      }

      // Fetch leads
      const { data: leadsData } = await supabase.from('leads').select('*')
      if (leadsData) {
          const mappedLeads: Lead[] = leadsData.map((l: any) => ({
              id: l.id,
              company: l.company,
              phone: l.phone,
              segment: l.segment,
              isDecisionMaker: l.is_decision_maker || "unknown",
              isFleetOwner: l.is_fleet_owner || "unknown",
              contacts: [], // Simplification for batch review which mostly needs company name
              createdAt: l.created_at
          }))
          setAllLeads(mappedLeads)
      }
      
      // Fetch experiments
      const { data: expData } = await supabase.from('experiments').select('*')
      if (expData) {
          setExperiments(expData)
      }
    }
    fetchData()
  }, [])

  const startReview = () => {
    let filteredAttempts = [...allAttempts]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    if (experimentFilter !== "all") {
      filteredAttempts = filteredAttempts.filter(a => a.experimentTag === experimentFilter)
    }
    
    const count = reviewRange === "last20" ? 20 : reviewRange === "last50" ? 50 : 100
    filteredAttempts = filteredAttempts.slice(0, count)
    
    setAttemptsToReview(filteredAttempts.map(a => ({ ...a, rating: null })))
    setCurrentStep("review")
    setCurrentPage(0)
  }

  const rateAttempt = (attemptId: string, rating: ReviewRating) => {
    setAttemptsToReview(attemptsToReview.map(a => 
      a.id === attemptId ? { ...a, rating } : a
    ))
  }

  const currentPageAttempts = attemptsToReview.slice(
    currentPage * attemptsPerPage,
    (currentPage + 1) * attemptsPerPage
  )

  const totalPages = Math.ceil(attemptsToReview.length / attemptsPerPage)
  const ratedCount = attemptsToReview.filter(a => a.rating !== null).length
  const topCount = attemptsToReview.filter(a => a.rating === "top").length
  const bottomCount = attemptsToReview.filter(a => a.rating === "bottom").length

  const goToSummary = () => {
    setCurrentStep("summary")
  }

  const goToLearnings = () => {
    setCurrentStep("learnings")
  }

  const addProposedRule = () => {
    if (!newRuleText.trim()) return
    setProposedRules([...proposedRules, {
      ifWhen: newRuleText,
      then: "",
      because: "",
      confidence: "Low"
    }])
    setNewRuleText("")
  }

  const finishReview = () => {
    setCurrentStep("complete")
  }

  const topAttempts = attemptsToReview.filter(a => a.rating === "top")
  const bottomAttempts = attemptsToReview.filter(a => a.rating === "bottom")
  
  const metrics = calculateMetrics(attemptsToReview)
  const topFailureReasons = getTopFailureReasons(attemptsToReview)

  // Setup step
  if (currentStep === "setup") {
    return (
      <div className="flex flex-col min-h-screen">
        <Topbar title="Batch Review" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Start Batch Review</CardTitle>
              <CardDescription>Select attempts to review and analyze</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Review Range</Label>
                <Select
                  value={reviewRange}
                  onValueChange={(value: "last20" | "last50" | "custom") => setReviewRange(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last20">Last 20 attempts</SelectItem>
                    <SelectItem value="last50">Last 50 attempts</SelectItem>
                    <SelectItem value="custom">Last 100 attempts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label>Filter by Experiment</Label>
                <Select
                  value={experimentFilter}
                  onValueChange={setExperimentFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All experiments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All experiments</SelectItem>
                    {experiments.map(exp => (
                      <SelectItem key={exp.id} value={exp.id}>
                        {exp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Total attempts available:</p>
                <p className="text-2xl font-bold">{allAttempts.length}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => router.push("/")}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={startReview}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Review
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Review step
  if (currentStep === "review") {
    return (
      <div className="flex flex-col min-h-screen">
        <Topbar 
          title="Batch Review" 
          actions={
            <Button onClick={goToSummary}>
              Go to Summary
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          }
        />

        <div className="flex-1 p-6">
          {/* Progress */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Review Progress</p>
                  <p className="text-2xl font-bold">{ratedCount} / {attemptsToReview.length} rated</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">{topCount}</p>
                    <p className="text-xs text-muted-foreground">Top</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-red-600">{bottomCount}</p>
                    <p className="text-xs text-muted-foreground">Bottom</p>
                  </div>
                </div>
              </div>
              <Progress value={(ratedCount / attemptsToReview.length) * 100} className="h-2" />
            </CardContent>
          </Card>

          {/* Attempts to review */}
          <div className="space-y-4 mb-6">
            {currentPageAttempts.map((attempt) => {
              const lead = allLeads.find(l => l.id === attempt.leadId)
              const experiment = attempt.experimentTag ? experiments.find(e => e.id === attempt.experimentTag) : null
              const isExpanded = expandedAttemptId === attempt.id
              
              return (
                <Card key={attempt.id} className={
                  attempt.rating === "top" ? "border-green-500 bg-green-50" :
                  attempt.rating === "bottom" ? "border-red-500 bg-red-50" :
                  attempt.rating === "skip" ? "opacity-50" : ""
                }>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{lead?.company || "Unknown"}</span>
                          <Badge className={getOutcomeColor(attempt.outcome)}>{attempt.outcome}</Badge>
                          {experiment && (
                            <Badge variant="outline">{experiment.name}</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          {lead && (
                            <span>{lead.segment}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(attempt.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        {attempt.why && (
                          <p className="text-sm text-red-600 mb-2">
                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                            {attempt.why}
                            {attempt.repMistake && ` - ${attempt.repMistake}`}
                          </p>
                        )}

                        {/* Expandable details */}
                        <button 
                          className="text-sm text-primary flex items-center gap-1"
                          onClick={() => setExpandedAttemptId(isExpanded ? null : attempt.id)}
                        >
                          {isExpanded ? "Hide details" : "Show details"}
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                            {attempt.note && <p><strong>Notes:</strong> {attempt.note}</p>}
                            {attempt.mattersMost && <p><strong>What mattered:</strong> {attempt.mattersMost}</p>}
                            <p><strong>Next action:</strong> {attempt.nextAction}</p>
                          </div>
                        )}
                      </div>

                      {/* Rating buttons */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant={attempt.rating === "top" ? "default" : "outline"}
                          className={attempt.rating === "top" ? "bg-green-600 hover:bg-green-700" : ""}
                          onClick={() => rateAttempt(attempt.id, attempt.rating === "top" ? null : "top")}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={attempt.rating === "bottom" ? "default" : "outline"}
                          className={attempt.rating === "bottom" ? "bg-red-600 hover:bg-red-700" : ""}
                          onClick={() => rateAttempt(attempt.id, attempt.rating === "bottom" ? null : "bottom")}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={attempt.rating === "skip" ? "secondary" : "ghost"}
                          onClick={() => rateAttempt(attempt.id, attempt.rating === "skip" ? null : "skip")}
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Summary step
  if (currentStep === "summary") {
    return (
      <div className="flex flex-col min-h-screen">
        <Topbar 
          title="Review Summary" 
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("review")}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Review
              </Button>
              <Button onClick={goToLearnings}>
                Continue to Learnings
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          }
        />

        <div className="flex-1 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Session Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{metrics.connectRate}%</p>
                    <p className="text-sm text-muted-foreground">Connect Rate</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{metrics.dmReachRate}%</p>
                    <p className="text-sm text-muted-foreground">DM Reach Rate</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{metrics.interestRate}%</p>
                    <p className="text-sm text-muted-foreground">Interest Rate</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{metrics.meetingsSet}</p>
                    <p className="text-sm text-muted-foreground">Meetings Set</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Failure Reasons */}
            <Card>
              <CardHeader>
                <CardTitle>Top Failure Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                {topFailureReasons.length > 0 ? (
                  <div className="space-y-3">
                    {topFailureReasons.slice(0, 5).map((item, i) => (
                      <div key={item.reason} className="flex items-center justify-between">
                        <span className="text-sm">{item.reason}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No failure reasons recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Top Calls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Top Calls ({topCount})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  {topAttempts.length > 0 ? (
                    <div className="space-y-2">
                      {topAttempts.map(attempt => {
                        const lead = allLeads.find(l => l.id === attempt.leadId)
                        return (
                          <div key={attempt.id} className="p-2 border rounded text-sm">
                            <p className="font-medium">{lead?.company}</p>
                            <p className="text-muted-foreground">{attempt.outcome}</p>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No top calls marked</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Bottom Calls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Bottom Calls ({bottomCount})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  {bottomAttempts.length > 0 ? (
                    <div className="space-y-2">
                      {bottomAttempts.map(attempt => {
                        const lead = allLeads.find(l => l.id === attempt.leadId)
                        return (
                          <div key={attempt.id} className="p-2 border rounded text-sm">
                            <p className="font-medium">{lead?.company}</p>
                            <p className="text-muted-foreground">{attempt.why || attempt.outcome}</p>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No bottom calls marked</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Learnings step
  if (currentStep === "learnings") {
    return (
      <div className="flex flex-col min-h-screen">
        <Topbar 
          title="Capture Learnings" 
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("summary")}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={finishReview}>
                <Check className="mr-2 h-4 w-4" />
                Complete Review
              </Button>
            </div>
          }
        />

        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Learning Notes */}
            <Card>
              <CardHeader>
                <CardTitle>What did you learn?</CardTitle>
                <CardDescription>Capture key insights from this batch</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={learningNotes}
                  onChange={(e) => setLearningNotes(e.target.value)}
                  placeholder="What patterns did you notice? What worked? What didn't?"
                  rows={5}
                />
              </CardContent>
            </Card>

            {/* Proposed Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Propose Rules</CardTitle>
                <CardDescription>Turn learnings into actionable rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newRuleText}
                    onChange={(e) => setNewRuleText(e.target.value)}
                    placeholder="If/When [situation], then [action]..."
                    onKeyDown={(e) => e.key === "Enter" && addProposedRule()}
                  />
                  <Button onClick={addProposedRule}>Add</Button>
                </div>

                {proposedRules.length > 0 && (
                  <div className="space-y-2">
                    {proposedRules.map((rule, i) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <p className="text-sm">{rule.ifWhen}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assign Drill */}
            <Card>
              <CardHeader>
                <CardTitle>Assign a Drill</CardTitle>
                <CardDescription>Practice a specific skill based on learnings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Select Drill</Label>
                  <Select
                    value={selectedDrill}
                    onValueChange={setSelectedDrill}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a drill (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {drills.map(drill => (
                        <SelectItem key={drill.id} value={drill.id}>
                          {drill.name} - {drill.triggerType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDrill && (
                  <div className="grid gap-2">
                    <Label>Duration (calls)</Label>
                    <Select
                      value={drillDuration.toString()}
                      onValueChange={(value) => setDrillDuration(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 calls</SelectItem>
                        <SelectItem value="10">10 calls</SelectItem>
                        <SelectItem value="15">15 calls</SelectItem>
                        <SelectItem value="20">20 calls</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Complete step
  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Review Complete" />
      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Batch Review Complete</h2>
            <p className="text-muted-foreground mb-6">
              Reviewed {attemptsToReview.length} attempts, marked {topCount} top and {bottomCount} bottom calls.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => router.push("/knowledge-base")}>
                View Knowledge Base
              </Button>
              <Button onClick={() => router.push("/")}>
                Back to Leads
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

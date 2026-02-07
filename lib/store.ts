// CRM Data Types and Store - Dalio Loop Sales CRM
// Simplified taxonomy for ultra-fast 2-click logging (100 calls/day)

// ============================================================================
// SIMPLIFIED TAXONOMY V1 - MECE (Mutually Exclusive, Collectively Exhaustive)
// ============================================================================

// Attempt Outcome (REQUIRED, 1 click) - EXACT 5 options
export type AttemptOutcome =
  | "No connect"
  | "Gatekeeper only"
  | "DM reached → No interest"
  | "DM reached → Some interest"
  | "Meeting set"

// Alias for compatibility
export type Outcome = AttemptOutcome

// Why (CONDITIONAL) - Show ONLY when Outcome is DM reached → No interest
// Exactly 5 options aligned to what we can learn from
export type WhyReason =
  | "Targeting"    // Not a fit for our product
  | "Value"        // No pain / low priority
  | "Trust"        // Skeptical / doesn't believe us
  | "Money"        // Locked contract / budget issue
  | "Timing"       // Later / bad timing

// Rep Mistake (CONDITIONAL) - Show as optional toggle, cut to 4 options
export type RepMistake =
  | "Weak opener"
  | "Talked too much"
  | "Weak questions"
  | "Didn't ask for meeting"

// Next Action - Exactly 4 states (auto-computed)
export type NextAction =
  | "Call again"         // With date
  | "Follow up"          // With date
  | "Meeting scheduled"
  | "Drop"

// Derived Lead Stage (read-only, computed from attempts)
export type DerivedStage =
  | "Not Contacted"
  | "Contacted"
  | "Meeting"
  | "Won"
  | "Lost"

// Derived Lead Status (read-only, computed from attempts)
export type DerivedStatus =
  | "New"
  | "No answer"
  | "Gatekeeper"
  | "Not interested"
  | "Interested"
  | "Meeting booked"
  | "Closed won"
  | "Closed lost"

// What Mattered Most (Batch Review only)
export type WhatMatteredMost =
  | "Segment"
  | "Time of day"
  | "Opener"
  | "Question"
  | "Proof point"
  | "Tone/pace"
  | "CTA/close"

// Contact roles
export type ContactRole = "DM" | "Gatekeeper" | "Other"

// Rule confidence
export type RuleConfidence = "Low" | "Likely" | "Proven"

// Drill trigger types (aligned with stop signals)
export type DrillTriggerType = "trust" | "value" | "access" | "execution" | "closing"

// ============================================================================
// INTERFACES
// ============================================================================

export interface Contact {
  id: string
  name: string
  role: ContactRole
  phone?: string
  email?: string
}

// Constraint options as chips
export type ConstraintOption = 
  | "Locked contract"
  | "Budget freeze"
  | "Seasonal business"
  | "Needs approval"
  | "Timing dependent"
  | "Switching friction high"

export const constraintOptions: ConstraintOption[] = [
  "Locked contract",
  "Budget freeze",
  "Seasonal business",
  "Needs approval",
  "Timing dependent",
  "Switching friction high",
]

export interface Lead {
  id: string
  company: string
  phone?: string
  // Account Reality card (Learning Card) - editable
  confirmedFacts?: string[] // MAX 5 bullets, MAX 120 chars each
  openQuestions?: string[] // MAX 3 bullets, must start with Do they/Can they/Will they
  nextCallObjective?: string // REQUIRED, single line, must start with verb
  // Lead Info fields (simplified)
  segment: string
  isDecisionMaker?: "yes" | "no" | "unknown"
  isFleetOwner?: "yes" | "no" | "unknown"
  operationalContext?: string // short paragraph
  constraints?: ConstraintOption[] // multi-select chips
  constraintOther?: string // optional other input
  opportunityAngle?: string // single line, MAX 100 chars
  // Advanced fields (collapsed)
  website?: string
  email?: string
  address?: string
  leadSource?: string
  // Contacts
  contacts: Contact[]
  createdAt: string
}

export interface Attempt {
  id: string
  leadId: string
  contactId?: string
  timestamp: string
  // Core logging fields
  outcome: AttemptOutcome
  why?: WhyReason // conditional
  repMistake?: RepMistake // conditional
  dmReached: boolean // derived from outcome
  // Auto-computed next action
  nextAction: NextAction
  nextActionAt?: string
  // Optional detail (collapsed by default)
  note?: string // max 120 chars
  durationSec: number // auto
  // Session tagging
  experimentTag?: string
  sessionId?: string
  // Batch review fields (added later)
  mattersMost?: WhatMatteredMost
  isTopCall?: boolean
  isBottomCall?: boolean
  createdAt: string
  // OpenPhone integration fields
  openPhoneCallId?: string
  direction?: "inbound" | "outbound"
  dialedNumber?: string // E.164 format
  answeredAt?: string
  completedAt?: string
  recordingUrl?: string
  recordingDurationSec?: number
  transcript?: TranscriptSegment[]
  callTranscriptText?: string // plain-text transcript from webhook view
  callSummary?: string
  status?: "pending" | "completed" | "failed"
}

export interface TranscriptSegment {
  speaker: string // "agent" | "contact" | identifier
  startSec: number
  endSec: number
  content: string
}

export interface PendingAttempt {
  id: string
  leadId: string
  dialedNumber: string // E.164 format
  startedAt: string
  direction: "outbound"
  status: "pending"
}

export interface OpenPhoneSettings {
  apiKey?: string // stored server-side only
  phoneNumberId?: string
  webhookSigningSecret?: string // stored server-side only
  webhookUrl?: string // read-only, generated
  lastWebhookReceivedAt?: string
  isConfigured: boolean
}

export interface Experiment {
  id: string
  name: string
  hypothesis: string
  primaryMetric: "dm_reach" | "interest_rate" | "meeting_rate"
  sampleSizeTarget: number
  currentSampleSize: number
  result: "win" | "lose" | "inconclusive" | "pending"
  active: boolean
  createdAt: string
}

export interface Rule {
  id: string
  ifWhen: string
  then: string
  because: string
  confidence: RuleConfidence
  evidenceAttemptIds: string[]
  isActive: boolean
  createdAt: string
}

export interface StopSignal {
  id: string
  name: string
  description: string
  triggerCondition: string
  threshold: number
  windowSize: number
  recommendedDrillId: string
  isActive: boolean
}

export interface Drill {
  id: string
  name: string
  triggerType: DrillTriggerType
  instructions: string
  script?: string
  durationCount: number // default 10
  successMetric: string
  isActive: boolean
  createdAt: string
}

export interface BatchReview {
  id: string
  sessionId?: string
  experimentId?: string
  attemptIds: string[]
  topCallIds: string[]
  bottomCallIds: string[]
  seekList: string[]
  avoidList: string[]
  learnings: string[]
  proposedRules: Omit<Rule, "id" | "createdAt" | "isActive">[]
  completedAt?: string
  createdAt: string
}

export interface DialSession {
  id: string
  startedAt: string
  endedAt?: string
  targetCalls: number
  completedCalls: number
  experimentId?: string
  activeDrillId?: string
  drillRemainingCount?: number
  attemptIds: string[]
}

// ============================================================================
// OPTIONS ARRAYS
// ============================================================================

export const attemptOutcomeOptions: AttemptOutcome[] = [
  "No connect",
  "Gatekeeper only",
  "DM reached → No interest",
  "DM reached → Some interest",
  "Meeting set",
]

export const whyReasonOptions: WhyReason[] = [
  "Targeting",
  "Value",
  "Trust",
  "Money",
  "Timing",
]

export const repMistakeOptions: RepMistake[] = [
  "Weak opener",
  "Talked too much",
  "Weak questions",
  "Didn't ask for meeting",
]

export const nextActionOptions: NextAction[] = [
  "Call again",
  "Follow up",
  "Meeting scheduled",
  "Drop",
]

export const whatMatteredMostOptions: WhatMatteredMost[] = [
  "Segment",
  "Time of day",
  "Opener",
  "Question",
  "Proof point",
  "Tone/pace",
  "CTA/close",
]

export const contactRoleOptions: ContactRole[] = ["DM", "Gatekeeper", "Other"]

export const segmentOptions: string[] = [
  "Unknown",
  "Trucking",
  "Home Services",
  "Construction",
  "Other",
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get default next action based on outcome and why
export function getDefaultNextAction(outcome: AttemptOutcome, why?: WhyReason): NextAction {
  switch (outcome) {
    case "No connect":
      return "Call again"
    case "Gatekeeper only":
      return "Call again"
    case "DM reached → No interest":
      if (why === "Targeting" || why === "Value") return "Drop"
      if (why === "Timing" || why === "Money") return "Follow up"
      return "Drop"
    case "DM reached → Some interest":
      return "Follow up"
    case "Meeting set":
      return "Meeting scheduled"
    default:
      return "Call again"
  }
}

// Determine if DM was reached based on outcome
export function isDmReached(outcome: AttemptOutcome): boolean {
  return outcome.startsWith("DM reached") || outcome === "Meeting set"
}

// Compute derived stage from attempts
export function getDerivedStage(attempts: Attempt[]): DerivedStage {
  if (attempts.length === 0) return "Not Contacted"
  
  const lastAttempt = attempts[0] // assumes sorted by timestamp desc
  
  // Check for meeting set
  const hasMeetingSet = attempts.some(a => a.outcome === "Meeting set")
  if (hasMeetingSet) return "Meeting"
  
  // Check for won/lost (would be marked separately in a real app)
  const hasNotInterested = attempts.some(a => a.outcome === "DM reached → No interest")
  if (hasNotInterested && lastAttempt.nextAction === "Drop") return "Lost"
  
  return "Contacted"
}

// Compute derived status from last attempt
export function getDerivedStatus(attempts: Attempt[]): DerivedStatus {
  if (attempts.length === 0) return "New"
  
  const lastAttempt = attempts[0] // assumes sorted by timestamp desc
  
  switch (lastAttempt.outcome) {
    case "No connect":
      return "No answer"
    case "Gatekeeper only":
      return "Gatekeeper"
    case "DM reached → No interest":
      return "Not interested"
    case "DM reached → Some interest":
      return "Interested"
    case "Meeting set":
      return "Meeting booked"
    default:
      return "New"
  }
}

// Calculate session metrics
export interface SessionMetrics {
  totalCalls: number
  connects: number
  connectRate: number
  dmReached: number
  dmReachRate: number
  interested: number
  interestRate: number
  meetingsSet: number
  topFailureReasons: { reason: WhyReason; count: number }[]
}

export function calculateSessionMetrics(attempts: Attempt[]): SessionMetrics {
  const totalCalls = attempts.length
  const connects = attempts.filter(a => a.outcome !== "No connect").length
  const dmReached = attempts.filter(a => a.dmReached).length
  const interested = attempts.filter(a => a.outcome === "DM reached → Some interest" || a.outcome === "Meeting set").length
  const meetingsSet = attempts.filter(a => a.outcome === "Meeting set").length
  
  // Count why reasons
  const whyCounts: Record<WhyReason, number> = {} as Record<WhyReason, number>
  whyReasonOptions.forEach(r => whyCounts[r] = 0)
  attempts.forEach(a => {
    if (a.why) whyCounts[a.why]++
  })
  
  const topFailureReasons = Object.entries(whyCounts)
    .map(([reason, count]) => ({ reason: reason as WhyReason, count }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totalCalls,
    connects,
    connectRate: totalCalls > 0 ? Math.round((connects / totalCalls) * 100) : 0,
    dmReached,
    dmReachRate: connects > 0 ? Math.round((dmReached / connects) * 100) : 0,
    interested,
    interestRate: dmReached > 0 ? Math.round((interested / dmReached) * 100) : 0,
    meetingsSet,
    topFailureReasons,
  }
}

// Check stop signals and return triggered ones
export interface TriggeredStopSignal {
  signal: StopSignal
  currentValue: number
  drill: Drill
}

export function checkStopSignals(
  attempts: Attempt[],
  stopSignals: StopSignal[],
  drills: Drill[]
): TriggeredStopSignal | null {
  for (const signal of stopSignals) {
    if (!signal.isActive) continue
    
    const recentAttempts = attempts.slice(0, signal.windowSize)
    if (recentAttempts.length < signal.windowSize / 2) continue
    
    const connectedAttempts = recentAttempts.filter(a => a.outcome !== "No connect")
    const dmConnectedAttempts = recentAttempts.filter(a => a.dmReached)
    
    let currentValue = 0
    
    switch (signal.id) {
      case "stop-trust":
        // Trust >= 35% of last 20 DM-connected calls
        currentValue = dmConnectedAttempts.length > 0
          ? (dmConnectedAttempts.filter(a => a.why === "Trust").length / dmConnectedAttempts.length) * 100
          : 0
        break
      case "stop-value":
        // Value >= 40% of last 20 DM-connected calls
        currentValue = dmConnectedAttempts.length > 0
          ? (dmConnectedAttempts.filter(a => a.why === "Value").length / dmConnectedAttempts.length) * 100
          : 0
        break
      case "stop-access":
        // DM reach rate < 10% over last 30 calls
        currentValue = recentAttempts.length > 0
          ? (dmConnectedAttempts.length / recentAttempts.length) * 100
          : 100
        // Invert for access problem (low DM reach is bad)
        if (currentValue < signal.threshold) {
          const drill = drills.find(d => d.id === signal.recommendedDrillId)
          if (drill) return { signal, currentValue, drill }
        }
        continue
      case "stop-execution":
        // Rep mistakes spiking - check for repeated mistakes
        currentValue = connectedAttempts.filter(a => a.repMistake).length
        break
      case "stop-closing":
        // DM Interested >= 8 today AND Meeting set = 0
        const interested = recentAttempts.filter(a => a.outcome === "DM reached → Some interest").length
        const meetings = recentAttempts.filter(a => a.outcome === "Meeting set").length
        if (interested >= 8 && meetings === 0) {
          const drill = drills.find(d => d.id === signal.recommendedDrillId)
          if (drill) return { signal, currentValue: interested, drill }
        }
        continue
    }
    
    if (currentValue >= signal.threshold) {
      const drill = drills.find(d => d.id === signal.recommendedDrillId)
      if (drill) return { signal, currentValue, drill }
    }
  }
  
  return null
}

// Get leads ready for dial session (not won/lost, has phone)
export function getDialableLeads(leads: Lead[], attempts: Attempt[]): Lead[] {
  return leads.filter(lead => {
    if (!lead.phone) return false
    const leadAttempts = attempts.filter(a => a.leadId === lead.id)
    const stage = getDerivedStage(leadAttempts)
    return stage !== "Won" && stage !== "Lost"
  })
}

// Auto-suggest top/bottom calls for batch review
export function suggestTopBottomCalls(attempts: Attempt[]): { top: string[]; bottom: string[] } {
  const sorted = [...attempts].sort((a, b) => {
    // Score each attempt
    const scoreA = getAttemptScore(a)
    const scoreB = getAttemptScore(b)
    return scoreB - scoreA
  })
  
  const top = sorted.slice(0, 5).map(a => a.id)
  const bottom = sorted.slice(-5).reverse().map(a => a.id)
  
  return { top, bottom }
}

function getAttemptScore(attempt: Attempt): number {
  let score = 0
  
  // Outcome scoring
  if (attempt.outcome === "Meeting set") score += 100
  else if (attempt.outcome === "DM reached → Some interest") score += 50
  else if (attempt.outcome === "DM reached → No interest") score += 10
  else if (attempt.outcome === "Gatekeeper only") score += 5
  else score += 1
  
  // Penalize rep mistakes
  if (attempt.repMistake) score -= 20
  
  return score
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

export const drills: Drill[] = []
export const stopSignals: StopSignal[] = []
export const experiments: Experiment[] = []
export const rules: Rule[] = []
export const leads: Lead[] = []
export const attempts: Attempt[] = []

// ============================================================================
// HELPER FUNCTIONS - These must be defined after data arrays
// ============================================================================

// Helper function to get drill by ID
export function getDrillById(drillId: string): Drill | undefined {
  return drills.find((d) => d.id === drillId)
}

// Helper function to get lead by ID
export function getLeadById(leadId: string): Lead | undefined {
  return leads.find((l) => l.id === leadId)
}

// Helper function to get experiment by ID
export function getExperimentById(experimentId: string): Experiment | undefined {
  return experiments.find((e) => e.id === experimentId)
}

// Calculate metrics from attempts
export function calculateMetrics(attemptsList: Attempt[]): {
  connectRate: number
  dmReachRate: number
  interestRate: number
  meetingsSet: number
} {
  if (attemptsList.length === 0) {
    return { connectRate: 0, dmReachRate: 0, interestRate: 0, meetingsSet: 0 }
  }

  const connects = attemptsList.filter((a) => a.outcome !== "No connect").length
  const dmReached = attemptsList.filter((a) => a.dmReached).length
  const interested = attemptsList.filter(
    (a) => a.outcome === "DM reached → Some interest" || a.outcome === "Meeting set"
  ).length
  const meetings = attemptsList.filter((a) => a.outcome === "Meeting set").length

  return {
    connectRate: Math.round((connects / attemptsList.length) * 100),
    dmReachRate: Math.round((dmReached / attemptsList.length) * 100),
    interestRate: dmReached > 0 ? Math.round((interested / dmReached) * 100) : 0,
    meetingsSet: meetings,
  }
}

// Get top failure reasons from attempts
export function getTopFailureReasons(
  attemptsList: Attempt[]
): { reason: string; count: number }[] {
  const reasons: Record<string, number> = {}

  for (const attempt of attemptsList) {
    if (attempt.why) {
      reasons[attempt.why] = (reasons[attempt.why] || 0) + 1
    }
  }

  return Object.entries(reasons)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
}

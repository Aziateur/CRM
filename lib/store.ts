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

export const drills: Drill[] = [
  {
    id: "drill-trust",
    name: "Trust Builder",
    triggerType: "trust",
    instructions: "For the next 10 connects, lead with a specific industry insight before asking questions. Reference a real stat or trend.",
    script: "\"I was just reading that [industry] companies are seeing [specific trend]. We've been helping folks like [similar company] navigate that. Does that resonate?\"",
    durationCount: 10,
    successMetric: "Reduce Trust from 35% to under 20%",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "drill-value",
    name: "Value Finder",
    triggerType: "value",
    instructions: "Focus exclusively on uncovering pain. Ask at least 3 follow-up questions about their current situation before discussing solutions.",
    script: "\"What's the biggest challenge with [area]? How long has that been going on? What have you tried? What's that costing you?\"",
    durationCount: 10,
    successMetric: "Increase interest rate by 15%",
    isActive: true,
    createdAt: "2024-01-02",
  },
  {
    id: "drill-access",
    name: "Gatekeeper Ally",
    triggerType: "access",
    instructions: "Treat gatekeepers as allies. Learn their name, be curious about their role, ask for their help navigating.",
    script: "\"Hi [Name], this is [You] - I'm hoping you can point me in the right direction. Who typically handles [area] there?\"",
    durationCount: 15,
    successMetric: "Increase DM reach rate by 20%",
    isActive: true,
    createdAt: "2024-01-03",
  },
  {
    id: "drill-execution",
    name: "Slow Down",
    triggerType: "execution",
    instructions: "Consciously slow your pace by 20%. Pause for 2 seconds after each prospect response before speaking.",
    script: "\"Based on what you've shared, I think we could help. I have Tuesday at 2pm or Thursday at 10am - which works better?\"",
    durationCount: 10,
    successMetric: "Reduce execution issues by 50%",
    isActive: true,
    createdAt: "2024-01-04",
  },
  {
    id: "drill-closing",
    name: "Confident Closer",
    triggerType: "closing",
    instructions: "End every connected call with a clear, confident ask for a specific meeting time. No soft closes.",
    script: "\"Based on what you've shared, I think we could help. I have Tuesday at 2pm or Thursday at 10am - which works better?\"",
    durationCount: 10,
    successMetric: "Increase meeting set rate by 25%",
    isActive: true,
    createdAt: "2024-01-05",
  },
]

export const stopSignals: StopSignal[] = [
  {
    id: "stop-trust",
    name: "Trust Problem",
    description: "High skepticism indicates your opener isn't establishing credibility fast enough.",
    triggerCondition: "Why = Trust >= 35% of last 20 DM-connected calls",
    threshold: 35,
    windowSize: 20,
    recommendedDrillId: "drill-trust",
    isActive: true,
  },
  {
    id: "stop-value",
    name: "Value Problem",
    description: "Without uncovering pain, prospects have no reason to change.",
    triggerCondition: "Why = Value >= 40% of last 20 DM-connected calls",
    threshold: 40,
    windowSize: 20,
    recommendedDrillId: "drill-value",
    isActive: true,
  },
  {
    id: "stop-access",
    name: "Access Problem",
    description: "Half your calls are getting stopped at the gate.",
    triggerCondition: "DM reach rate < 10% over last 30 calls",
    threshold: 10,
    windowSize: 30,
    recommendedDrillId: "drill-access",
    isActive: true,
  },
  {
    id: "stop-execution",
    name: "Execution Problem",
    description: "Rep mistakes are spiking - time to slow down and reset.",
    triggerCondition: "Rep Mistakes >= 3 in last 15 connected calls",
    threshold: 3,
    windowSize: 15,
    recommendedDrillId: "drill-execution",
    isActive: true,
  },
  {
    id: "stop-closing",
    name: "Closing Problem",
    description: "You're having good conversations but not converting them to meetings.",
    triggerCondition: "DM Interested >= 8 AND Meeting set = 0",
    threshold: 8,
    windowSize: 50,
    recommendedDrillId: "drill-closing",
    isActive: true,
  },
]

export const experiments: Experiment[] = [
  {
    id: "exp-1",
    name: "Value-first opener",
    hypothesis: "Leading with value outperforms permission-based openers",
    primaryMetric: "interest_rate",
    sampleSizeTarget: 100,
    currentSampleSize: 42,
    result: "pending",
    active: true,
    createdAt: "2024-01-01",
  },
  {
    id: "exp-2",
    name: "Early morning calls",
    hypothesis: "Calls before 9am reach more decision makers",
    primaryMetric: "dm_reach",
    sampleSizeTarget: 100,
    currentSampleSize: 67,
    result: "win",
    active: true,
    createdAt: "2024-01-05",
  },
  {
    id: "exp-3",
    name: "Direct line focus",
    hypothesis: "Direct lines have higher connect rate than main lines",
    primaryMetric: "dm_reach",
    sampleSizeTarget: 50,
    currentSampleSize: 50,
    result: "win",
    active: false,
    createdAt: "2024-01-10",
  },
]

export const rules: Rule[] = [
  {
    id: "rule-1",
    ifWhen: "Prospect says they're 'happy with current provider'",
    then: "Ask: 'What would need to change for you to consider alternatives?'",
    because: "Opens the door to future pain without being pushy",
    confidence: "Proven",
    evidenceAttemptIds: ["att-1", "att-5", "att-12"],
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "rule-2",
    ifWhen: "Calling trucking companies before 8am",
    then: "Lead with operational efficiency angle, not cost savings",
    because: "Early morning decision makers are operationally focused",
    confidence: "Likely",
    evidenceAttemptIds: ["att-3", "att-8"],
    isActive: true,
    createdAt: "2024-01-05",
  },
  {
    id: "rule-3",
    ifWhen: "Gatekeeper asks 'What is this regarding?'",
    then: "Be direct: 'I'm calling about your fleet operations - is [Name] available?'",
    because: "Vague answers trigger more gatekeeping; directness gets transfers",
    confidence: "Proven",
    evidenceAttemptIds: ["att-2", "att-6", "att-15"],
    isActive: true,
    createdAt: "2024-01-10",
  },
]

export const leads: Lead[] = [
  {
    id: "lead-1",
    company: "Midwest Logistics Co.",
    phone: "+1 555-1001",
    segment: "Trucking",
    isDecisionMaker: "yes",
    isFleetOwner: "yes",
    confirmedFacts: ["12 trucks, growing fleet", "Currently using paper logs"],
    openQuestions: ["Do they have budget this quarter?"],
    nextCallObjective: "Confirm whether they have compliance issues with ELD mandate",
    operationalContext: "Family business, 2nd generation",
    contacts: [
      { id: "c-1-1", name: "Tom Brennan", role: "DM", phone: "+1 555-1001", email: "tom@midwestlogistics.com" },
      { id: "c-1-2", name: "Lisa Park", role: "Gatekeeper", phone: "+1 555-1002" },
    ],
    createdAt: "2024-01-01",
  },
  {
    id: "lead-2",
    company: "Sunrise Medical Transport",
    phone: "+1 555-2001",
    segment: "Other",
    isDecisionMaker: "yes",
    isFleetOwner: "no",
    contacts: [
      { id: "c-2-1", name: "Maria Gonzalez", role: "DM", phone: "+1 555-2001" },
    ],
    createdAt: "2024-01-02",
  },
  {
    id: "lead-3",
    company: "Great Plains Carriers",
    phone: "+1 555-3001",
    segment: "Trucking",
    isDecisionMaker: "yes",
    isFleetOwner: "yes",
    openQuestions: ["Will they expand fleet this year?"],
    nextCallObjective: "Identify their growth timeline and pain points",
    contacts: [
      { id: "c-3-1", name: "Bill Thompson", role: "DM", phone: "+1 555-3001" },
    ],
    createdAt: "2024-01-03",
  },
  {
    id: "lead-4",
    company: "QuickHaul Inc.",
    phone: "+1 555-4001",
    segment: "Other",
    isDecisionMaker: "unknown",
    isFleetOwner: "unknown",
    contacts: [
      { id: "c-4-1", name: "Derek Simmons", role: "DM", phone: "+1 555-4001" },
    ],
    createdAt: "2024-01-04",
  },
  {
    id: "lead-5",
    company: "Iron Range Trucking",
    phone: "+1 555-5001",
    segment: "Trucking",
    isDecisionMaker: "yes",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-5-1", name: "Mike Kowalski", role: "DM", phone: "+1 555-5001" },
    ],
    createdAt: "2024-01-05",
  },
  {
    id: "lead-6",
    company: "Desert Sun Freight",
    phone: "+1 555-6001",
    segment: "Trucking",
    isDecisionMaker: "no",
    isFleetOwner: "yes",
    openQuestions: ["Can they connect us to the owner?"],
    nextCallObjective: "Identify the decision maker name and direct line",
    operationalContext: "Only reached dispatcher so far",
    contacts: [
      { id: "c-6-1", name: "Carlos Mendez", role: "Other", phone: "+1 555-6001" },
    ],
    createdAt: "2024-01-06",
  },
  {
    id: "lead-7",
    company: "Lakeside Senior Care",
    phone: "+1 555-7001",
    segment: "Other",
    isDecisionMaker: "yes",
    isFleetOwner: "no",
    contacts: [
      { id: "c-7-1", name: "Patty Olson", role: "DM", phone: "+1 555-7001" },
      { id: "c-7-2", name: "Jim Huang", role: "Gatekeeper", phone: "+1 555-7002" },
    ],
    createdAt: "2024-01-07",
  },
  {
    id: "lead-8",
    company: "Metro Express Couriers",
    phone: "+1 555-8001",
    segment: "Other",
    isDecisionMaker: "yes",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-8-1", name: "Angela Wright", role: "DM", phone: "+1 555-8001" },
    ],
    createdAt: "2024-01-08",
  },
  {
    id: "lead-9",
    company: "Northwoods Excavation",
    phone: "+1 555-9001",
    segment: "Construction",
    isDecisionMaker: "yes",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-9-1", name: "Pete Larson", role: "DM", phone: "+1 555-9001" },
    ],
    createdAt: "2024-01-09",
  },
  {
    id: "lead-10",
    company: "Valley View Farms",
    phone: "+1 555-1010",
    segment: "Other",
    isDecisionMaker: "yes",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-10-1", name: "Ruth Andersen", role: "DM", phone: "+1 555-1010" },
    ],
    createdAt: "2024-01-10",
  },
  {
    id: "lead-11",
    company: "Bayshore Distributors",
    phone: "+1 555-1101",
    segment: "Trucking",
    isDecisionMaker: "no",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-11-1", name: "Greg Harrison", role: "Other", phone: "+1 555-1101" },
    ],
    createdAt: "2024-01-11",
  },
  {
    id: "lead-12",
    company: "Summit Moving & Storage",
    phone: "+1 555-1201",
    segment: "Other",
    isDecisionMaker: "yes",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-12-1", name: "Diana Reeves", role: "DM", phone: "+1 555-1201" },
    ],
    createdAt: "2024-01-12",
  },
  {
    id: "lead-13",
    company: "Heartland Grain Transport",
    phone: "+1 555-1301",
    segment: "Trucking",
    isDecisionMaker: "yes",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-13-1", name: "Earl Swenson", role: "DM", phone: "+1 555-1301" },
    ],
    createdAt: "2024-01-13",
  },
  {
    id: "lead-14",
    company: "Pacific Coast Freight",
    phone: "+1 555-1401",
    segment: "Trucking",
    isDecisionMaker: "yes",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-14-1", name: "Kevin Nakamura", role: "DM", phone: "+1 555-1401" },
      { id: "c-14-2", name: "Brenda Cho", role: "Gatekeeper", phone: "+1 555-1402" },
    ],
    createdAt: "2024-01-14",
  },
  {
    id: "lead-15",
    company: "Riverdale Plumbing",
    phone: "+1 555-1501",
    segment: "Home Services",
    isDecisionMaker: "yes",
    isFleetOwner: "no",
    contacts: [
      { id: "c-15-1", name: "Tony Marchetti", role: "DM", phone: "+1 555-1501" },
    ],
    createdAt: "2024-01-15",
  },
  {
    id: "lead-16",
    company: "Clearwater HVAC",
    phone: "+1 555-1601",
    segment: "Home Services",
    isDecisionMaker: "yes",
    isFleetOwner: "no",
    contacts: [
      { id: "c-16-1", name: "Sarah Chen", role: "DM", phone: "+1 555-1601" },
    ],
    createdAt: "2024-01-16",
  },
  {
    id: "lead-17",
    company: "Cascade Timber",
    phone: "+1 555-1701",
    segment: "Other",
    isDecisionMaker: "yes",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-17-1", name: "James Woodward", role: "DM", phone: "+1 555-1701" },
    ],
    createdAt: "2024-01-17",
  },
  {
    id: "lead-18",
    company: "Premier Towing",
    phone: "+1 555-1801",
    segment: "Other",
    isDecisionMaker: "yes",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-18-1", name: "Dave Rodriguez", role: "DM", phone: "+1 555-1801" },
    ],
    createdAt: "2024-01-18",
  },
  {
    id: "lead-19",
    company: "GreenWaste Solutions",
    phone: "+1 555-1901",
    segment: "Other",
    isDecisionMaker: "no",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-19-1", name: "Patricia Green", role: "Other", phone: "+1 555-1901" },
    ],
    createdAt: "2024-01-19",
  },
  {
    id: "lead-20",
    company: "FreshFood Distributors",
    phone: "+1 555-2001",
    segment: "Other",
    isDecisionMaker: "no",
    isFleetOwner: "yes",
    contacts: [
      { id: "c-20-1", name: "Michael Torres", role: "DM", phone: "+1 555-2001" },
    ],
    createdAt: "2024-01-20",
  },
]

// Sample attempts with realistic distribution
export const attempts: Attempt[] = [
  // Lead 1 - Good progression to meeting
  {
    id: "att-1",
    leadId: "lead-1",
    contactId: "c-1-2",
    timestamp: "2024-01-15T09:00:00Z",
    outcome: "Gatekeeper only",
    dmReached: false,
    nextAction: "Call again",
    durationSec: 45,
    experimentTag: "exp-1",
    createdAt: "2024-01-15",
  },
  {
    id: "att-2",
    leadId: "lead-1",
    contactId: "c-1-1",
    timestamp: "2024-01-16T08:30:00Z",
    outcome: "DM reached → Some interest",
    dmReached: true,
    nextAction: "Follow up",
    durationSec: 180,
    experimentTag: "exp-2",
    createdAt: "2024-01-16",
  },
  {
    id: "att-3",
    leadId: "lead-1",
    contactId: "c-1-1",
    timestamp: "2024-01-18T10:00:00Z",
    outcome: "Meeting set",
    dmReached: true,
    nextAction: "Meeting scheduled",
    durationSec: 240,
    experimentTag: "exp-2",
    createdAt: "2024-01-18",
  },
  // Lead 2 - Not interested
  {
    id: "att-4",
    leadId: "lead-2",
    contactId: "c-2-1",
    timestamp: "2024-01-15T10:00:00Z",
    outcome: "DM reached → No interest",
    why: "Value",
    dmReached: true,
    nextAction: "Drop",
    durationSec: 120,
    experimentTag: "exp-1",
    createdAt: "2024-01-15",
  },
  // Lead 3 - Multiple no connects then callback
  {
    id: "att-5",
    leadId: "lead-3",
    timestamp: "2024-01-15T11:00:00Z",
    outcome: "No connect",
    dmReached: false,
    nextAction: "Call again",
    durationSec: 30,
    createdAt: "2024-01-15",
  },
  {
    id: "att-6",
    leadId: "lead-3",
    timestamp: "2024-01-16T09:00:00Z",
    outcome: "No connect",
    dmReached: false,
    nextAction: "Call again",
    durationSec: 30,
    createdAt: "2024-01-16",
  },
  {
    id: "att-7",
    leadId: "lead-3",
    contactId: "c-3-1",
    timestamp: "2024-01-17T08:00:00Z",
    outcome: "DM reached → Some interest",
    dmReached: true,
    nextAction: "Follow up",
    note: "Call again next week",
    durationSec: 150,
    experimentTag: "exp-2",
    createdAt: "2024-01-17",
  },
  // Lead 4 - Lost with targeting issue
  {
    id: "att-8",
    leadId: "lead-4",
    contactId: "c-4-1",
    timestamp: "2024-01-15T14:00:00Z",
    outcome: "DM reached → No interest",
    why: "Targeting issue",
    dmReached: true,
    nextAction: "Drop",
    durationSec: 90,
    createdAt: "2024-01-15",
  },
  // Lead 5 - Won
  {
    id: "att-9",
    leadId: "lead-5",
    contactId: "c-5-1",
    timestamp: "2024-01-10T09:00:00Z",
    outcome: "DM reached → Some interest",
    dmReached: true,
    nextAction: "Follow up",
    durationSec: 200,
    createdAt: "2024-01-10",
  },
  {
    id: "att-10",
    leadId: "lead-5",
    contactId: "c-5-1",
    timestamp: "2024-01-12T10:00:00Z",
    outcome: "Meeting set",
    dmReached: true,
    nextAction: "Meeting scheduled",
    durationSec: 300,
    createdAt: "2024-01-12",
  },
  // Lead 6 - No attempts yet (fresh)
  // Lead 7 - Gatekeeper blocked, needs alternate approach
  {
    id: "att-11",
    leadId: "lead-7",
    contactId: "c-7-2",
    timestamp: "2024-01-18T11:00:00Z",
    outcome: "Gatekeeper only",
    why: "Access issue",
    dmReached: false,
    nextAction: "Try alternate contact",
    durationSec: 60,
    createdAt: "2024-01-18",
  },
  // Lead 8 - Meeting booked
  {
    id: "att-12",
    leadId: "lead-8",
    contactId: "c-8-1",
    timestamp: "2024-01-17T15:00:00Z",
    outcome: "Meeting set",
    dmReached: true,
    nextAction: "Meeting scheduled",
    durationSec: 280,
    experimentTag: "exp-1",
    createdAt: "2024-01-17",
  },
  // Lead 9 - Timing, nurture
  {
    id: "att-13",
    leadId: "lead-9",
    contactId: "c-9-1",
    timestamp: "2024-01-16T14:00:00Z",
    outcome: "DM reached → No interest",
    why: "Timing",
    dmReached: true,
    nextAction: "Nurture",
    note: "Call again in 3 months",
    durationSec: 100,
    createdAt: "2024-01-16",
  },
  // Lead 10 - Interested, follow up
  {
    id: "att-14",
    leadId: "lead-10",
    contactId: "c-10-1",
    timestamp: "2024-01-18T08:00:00Z",
    outcome: "DM reached → Some interest",
    dmReached: true,
    nextAction: "Follow up",
    durationSec: 220,
    experimentTag: "exp-2",
    createdAt: "2024-01-18",
  },
  // Lead 11 - No connect
  {
    id: "att-15",
    leadId: "lead-11",
    timestamp: "2024-01-18T09:00:00Z",
    outcome: "No connect",
    dmReached: false,
    nextAction: "Call again",
    durationSec: 25,
    createdAt: "2024-01-18",
  },
  // Lead 12 - Trust (execution fumble)
  {
    id: "att-16",
    leadId: "lead-12",
    contactId: "c-12-1",
    timestamp: "2024-01-17T10:00:00Z",
    outcome: "DM reached → No interest",
    why: "Execution issue",
    repMistake: "Weak opener",
    dmReached: true,
    nextAction: "Drop",
    durationSec: 80,
    createdAt: "2024-01-17",
  },
  // Lead 14 - Good call
  {
    id: "att-17",
    leadId: "lead-14",
    contactId: "c-14-1",
    timestamp: "2024-01-18T11:00:00Z",
    outcome: "DM reached → Some interest",
    dmReached: true,
    nextAction: "Follow up",
    durationSec: 190,
    experimentTag: "exp-1",
    createdAt: "2024-01-18",
  },
  // Lead 16 - Meeting set
  {
    id: "att-18",
    leadId: "lead-16",
    contactId: "c-16-1",
    timestamp: "2024-01-18T14:00:00Z",
    outcome: "Meeting set",
    dmReached: true,
    nextAction: "Meeting scheduled",
    durationSec: 260,
    createdAt: "2024-01-18",
  },
  // More attempts for realistic data
  {
    id: "att-19",
    leadId: "lead-17",
    timestamp: "2024-01-18T15:00:00Z",
    outcome: "No connect",
    dmReached: false,
    nextAction: "Call again",
    durationSec: 20,
    createdAt: "2024-01-18",
  },
  {
    id: "att-20",
    leadId: "lead-18",
    contactId: "c-18-1",
    timestamp: "2024-01-18T16:00:00Z",
    outcome: "DM reached → No interest",
    why: "Money/contract issue",
    dmReached: true,
    nextAction: "Nurture",
    note: "Contract up in 6 months",
    durationSec: 110,
    createdAt: "2024-01-18",
  },
]

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

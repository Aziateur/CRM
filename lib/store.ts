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

// ─── Centralized Outcome Config ─────────────────────────────────────────────
// Single source of truth for outcome metadata. Import OUTCOMES everywhere
// instead of hardcoding strings.
export const OUTCOMES = {
  NO_CONNECT: {
    value: "No connect" as const,
    badgeColor: "bg-muted text-muted-foreground",
    buttonStyle: "border-muted-foreground hover:bg-muted",
    isWin: false,
    isDmReached: false,
  },
  GATEKEEPER: {
    value: "Gatekeeper only" as const,
    badgeColor: "bg-orange-100 text-orange-800",
    buttonStyle: "border-orange-500 hover:bg-orange-50 data-[selected=true]:bg-orange-100 data-[selected=true]:border-orange-600",
    isWin: false,
    isDmReached: false,
  },
  DM_NO_INTEREST: {
    value: "DM reached → No interest" as const,
    badgeColor: "bg-red-100 text-red-800",
    buttonStyle: "border-red-500 hover:bg-red-50 data-[selected=true]:bg-red-100 data-[selected=true]:border-red-600",
    isWin: false,
    isDmReached: true,
  },
  DM_SOME_INTEREST: {
    value: "DM reached → Some interest" as const,
    badgeColor: "bg-blue-100 text-blue-800",
    buttonStyle: "border-blue-500 hover:bg-blue-50 data-[selected=true]:bg-blue-100 data-[selected=true]:border-blue-600",
    isWin: false,
    isDmReached: true,
  },
  MEETING_SET: {
    value: "Meeting set" as const,
    badgeColor: "bg-green-100 text-green-800",
    buttonStyle: "border-green-500 hover:bg-green-50 data-[selected=true]:bg-green-100 data-[selected=true]:border-green-600",
    isWin: true,
    isDmReached: true,
  },
} as const

// Helpers to look up config by value string
const _outcomeByValue = new Map(
  Object.values(OUTCOMES).map(o => [o.value, o])
)
export function getOutcomeBadgeColor(outcome: AttemptOutcome): string {
  return _outcomeByValue.get(outcome)?.badgeColor ?? "bg-muted text-muted-foreground"
}
export function getOutcomeButtonStyle(outcome: AttemptOutcome): string {
  return _outcomeByValue.get(outcome)?.buttonStyle ?? ""
}
export function isWinOutcome(outcome: AttemptOutcome): boolean {
  return _outcomeByValue.get(outcome)?.isWin ?? false
}

// Default stage for leads — matches DB DEFAULT
export const DEFAULT_STAGE = "New"

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
export type DrillTriggerType = "trust" | "value" | "access" | "execution" | "closing" | "manual"

// ============================================================================
// PIPELINE STAGES
// ============================================================================

export interface PipelineStage {
  id: string
  name: string
  position: number
  defaultProbability: number
  color: string
  isWon: boolean
  isLost: boolean
}

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: "default-new", name: "New", position: 0, defaultProbability: 0, color: "#6b7280", isWon: false, isLost: false },
  { id: "default-contacted", name: "Contacted", position: 1, defaultProbability: 10, color: "#3b82f6", isWon: false, isLost: false },
  { id: "default-interested", name: "Interested", position: 2, defaultProbability: 30, color: "#8b5cf6", isWon: false, isLost: false },
  { id: "default-meeting", name: "Meeting Booked", position: 3, defaultProbability: 60, color: "#f59e0b", isWon: false, isLost: false },
  { id: "default-won", name: "Won", position: 4, defaultProbability: 100, color: "#22c55e", isWon: true, isLost: false },
  { id: "default-lost", name: "Lost", position: 5, defaultProbability: 0, color: "#ef4444", isWon: false, isLost: true },
]

// ============================================================================
// TASKS
// ============================================================================

export type TaskType = "call_back" | "follow_up" | "meeting" | "email" | "custom"
export type TaskPriority = "low" | "normal" | "high"

export interface ChecklistItem {
  label: string
  done: boolean
}

export interface Task {
  id: string
  leadId: string
  contactId?: string
  attemptId?: string
  type: TaskType
  title: string
  description?: string
  checklist?: ChecklistItem[]
  dueAt: string
  completedAt?: string
  priority: TaskPriority
  createdAt: string
}

export function getDefaultTaskForOutcome(
  outcome: AttemptOutcome,
  why: WhyReason | undefined,
  companyName: string
): { type: TaskType; title: string; dueDays: number } | null {
  switch (outcome) {
    case OUTCOMES.NO_CONNECT.value:
      return { type: "call_back", title: `Call back ${companyName}`, dueDays: 1 }
    case OUTCOMES.GATEKEEPER.value:
      return { type: "call_back", title: `Call back ${companyName}`, dueDays: 1 }
    case OUTCOMES.DM_NO_INTEREST.value:
      if (why === "Timing" || why === "Money") {
        return { type: "follow_up", title: `Follow up with ${companyName}`, dueDays: 14 }
      }
      return null // Targeting/Value/Trust → Drop, no task
    case OUTCOMES.DM_SOME_INTEREST.value:
      return { type: "follow_up", title: `Follow up with ${companyName}`, dueDays: 2 }
    case OUTCOMES.MEETING_SET.value:
      return { type: "meeting", title: `Prepare for meeting with ${companyName}`, dueDays: 1 }
    default:
      return null
  }
}

// ============================================================================
// CUSTOM FIELDS
// ============================================================================

export type FieldType = "text" | "number" | "select" | "multi_select" | "date" | "boolean" | "url" | "email"

export type FieldSection = "core" | "detail" | "strategy" | "advanced"
export type FieldSource = "native" | "promoted" | "custom"

export interface FieldDefinition {
  id: string
  entityType: string
  fieldKey: string
  fieldLabel: string
  fieldType: FieldType
  options?: string[]
  isRequired: boolean
  isPromoted: boolean
  isMasked: boolean
  section: FieldSection
  source: FieldSource
  position: number
  createdAt: string
}

// ============================================================================
// VIEW SCHEMAS (Layout Builder)
// ============================================================================

export type ViewType = "lead_drawer" | "leads_table" | "add_lead"

export interface ViewItem {
  id: string // A unique ID for drag-and-drop
  type: "field" | "widget"
  fieldKey?: string // Only if type === "field"
  widgetId?: string // Only if type === "widget"
}

export interface ViewSection {
  id: string
  name: string
  items: ViewItem[]
}

export interface ViewColumn {
  id: string
  width?: number // e.g., 1 for 1fr, 2 for 2fr (grid spans)
  sections: ViewSection[]
}

export interface ViewSchemaData {
  // For lead_drawer: divided into columns
  columns?: ViewColumn[]
  // For leads_table / add_lead: single list of visible fields/columns
  fields?: string[] // array of fieldKeys
  // For leads_table: ordered list of visible column keys (built-in + custom field keys)
  tableColumns?: string[]
}

export interface ViewSchema {
  id: string
  projectId: string
  viewType: ViewType
  schema: ViewSchemaData
  createdAt: string
  updatedAt: string
}

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
  // Pipeline
  stage: string
  stageChangedAt?: string
  dealValue?: number
  closeProbability?: number
  // Custom fields (JSONB)
  customFields?: Record<string, unknown>
  // Contacts
  contacts: Contact[]
  createdAt: string
  // Allow promoted columns (dynamic keys from field_definitions)
  [key: string]: unknown
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
  // Telemetry
  rulesShown?: string[] // rule IDs shown in call-prep panel
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
  /** How the dialer initiates calls:
   * - "app": Uses openphone:// deep link to open the desktop app (no new tabs)
   * - "web": Copies number to clipboard, reuses existing OpenPhone browser tab
   * Default: "app" */
  dialMethod?: "app" | "web"
  /** The OpenPhone outbound number (E.164) to use as caller ID with deep links */
  openPhoneFromNumber?: string
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
  recommendedDrillId?: string
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





export const contactRoleOptions: ContactRole[] = ["DM", "Gatekeeper", "Other"]



// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get default next action based on outcome and why
export function getDefaultNextAction(outcome: AttemptOutcome, why?: WhyReason): NextAction {
  switch (outcome) {
    case OUTCOMES.NO_CONNECT.value:
      return "Call again"
    case OUTCOMES.GATEKEEPER.value:
      return "Call again"
    case OUTCOMES.DM_NO_INTEREST.value:
      if (why === "Targeting" || why === "Value") return "Drop"
      if (why === "Timing" || why === "Money") return "Follow up"
      return "Drop"
    case OUTCOMES.DM_SOME_INTEREST.value:
      return "Follow up"
    case OUTCOMES.MEETING_SET.value:
      return "Meeting scheduled"
    default:
      return "Call again"
  }
}

// Determine if DM was reached based on outcome
export function isDmReached(outcome: AttemptOutcome): boolean {
  return _outcomeByValue.get(outcome)?.isDmReached ?? false
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
  const connects = attempts.filter(a => a.outcome !== OUTCOMES.NO_CONNECT.value).length
  const dmReached = attempts.filter(a => a.dmReached).length
  const interested = attempts.filter(a => a.outcome === OUTCOMES.DM_SOME_INTEREST.value || a.outcome === OUTCOMES.MEETING_SET.value).length
  const meetingsSet = attempts.filter(a => a.outcome === OUTCOMES.MEETING_SET.value).length

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


// ============================================================================
// TAGS
// ============================================================================

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: string
}

// ============================================================================
// TEMPLATES
// ============================================================================

export type TemplateCategory = "call" | "email" | "sms" | "note"

export interface Template {
  id: string
  name: string
  category: TemplateCategory
  subject?: string
  body: string
  variables: string[]
  isDefault: boolean
  position: number
  createdAt: string
}

// ============================================================================
// WORKFLOWS
// ============================================================================

export type WorkflowTriggerType =
  | "stage_change"
  | "new_lead"
  | "tag_added"
  | "tag_removed"
  | "field_changed"
  | "lead_idle"
  | "task_overdue"
  | "outcome_logged"

export type WorkflowActionType =
  | "change_stage"
  | "add_tag"
  | "remove_tag"
  | "create_task"
  | "update_field"
  | "send_notification"
  | "enroll_sequence"

export interface Workflow {
  id: string
  name: string
  description?: string
  isActive: boolean
  triggerType: WorkflowTriggerType
  triggerConfig: Record<string, unknown>
  actionType: WorkflowActionType
  actionConfig: Record<string, unknown>
  executionCount: number
  lastExecutedAt?: string
  createdAt: string
}

// ============================================================================
// FIELD TEMPLATES
// ============================================================================

export interface FieldTemplate {
  id: string
  projectId: string
  name: string
  description?: string
  icon: string
  fieldKeys: string[]
  createdAt: string
  updatedAt: string
}

// ============================================================================
// SEQUENCES
// ============================================================================

export type SequenceStepType = "call" | "email" | "sms" | "task" | "wait"
export type SequenceEnrollmentStatus = "active" | "paused" | "completed" | "exited"

export interface Sequence {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
}

export interface SequenceStep {
  id: string
  sequenceId: string
  position: number
  stepType: SequenceStepType
  delayDays: number
  templateId?: string
  config: Record<string, unknown>
  createdAt: string
}

export interface SequenceEnrollment {
  id: string
  leadId: string
  sequenceId: string
  currentStep: number
  status: SequenceEnrollmentStatus
  enrolledAt: string
  lastStepCompletedAt?: string
  nextStepDueAt?: string
  exitReason?: string
  createdAt: string
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

export const drills: Drill[] = []

// Helper function to get drill by ID
export function getDrillById(drillId: string): Drill | undefined {
  return drills.find((d) => d.id === drillId)
}

import { supabase } from './supabase'
import type { Lead, Attempt, Contact } from './store'

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ============================================================================
// LEADS
// ============================================================================

export async function fetchLeads(): Promise<Lead[]> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching leads:', error)
    return []
  }

  // Transform from snake_case to camelCase and parse JSON fields
  return (leads || []).map(transformLeadFromDb)
}

export async function createLead(lead: Lead): Promise<Lead | null> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, cannot create lead')
    return null
  }

  const dbLead = transformLeadToDb(lead)

  const { data, error } = await supabase
    .from('leads')
    .insert(dbLead)
    .select()
    .single()

  if (error) {
    console.error('Error creating lead:', error)
    return null
  }

  return transformLeadFromDb(data)
}

export async function updateLead(lead: Lead): Promise<Lead | null> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, cannot update lead')
    return null
  }

  const dbLead = transformLeadToDb(lead)

  const { data, error } = await supabase
    .from('leads')
    .update(dbLead)
    .eq('id', lead.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating lead:', error)
    return null
  }

  return transformLeadFromDb(data)
}

export async function deleteLead(leadId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, cannot delete lead')
    return false
  }

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId)

  if (error) {
    console.error('Error deleting lead:', error)
    return false
  }

  return true
}

// ============================================================================
// ATTEMPTS
// ============================================================================

export async function fetchAttempts(): Promise<Attempt[]> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data: attempts, error } = await supabase
    .from('attempts')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching attempts:', error)
    return []
  }

  return (attempts || []).map(transformAttemptFromDb)
}

export async function createAttempt(attempt: Attempt): Promise<Attempt | null> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, cannot create attempt')
    return null
  }

  const dbAttempt = transformAttemptToDb(attempt)

  const { data, error } = await supabase
    .from('attempts')
    .insert(dbAttempt)
    .select()
    .single()

  if (error) {
    console.error('Error creating attempt:', error)
    return null
  }

  return transformAttemptFromDb(data)
}

// ============================================================================
// TRANSFORM FUNCTIONS (snake_case <-> camelCase)
// ============================================================================

interface DbLead {
  id: string
  company: string
  phone?: string
  confirmed_facts?: string[]
  open_questions?: string[]
  next_call_objective?: string
  segment: string
  is_decision_maker?: string
  is_fleet_owner?: string
  operational_context?: string
  constraints?: string[]
  constraint_other?: string
  opportunity_angle?: string
  website?: string
  email?: string
  address?: string
  lead_source?: string
  contacts: Contact[]
  created_at: string
}

function transformLeadFromDb(dbLead: DbLead): Lead {
  return {
    id: dbLead.id,
    company: dbLead.company,
    phone: dbLead.phone,
    confirmedFacts: dbLead.confirmed_facts,
    openQuestions: dbLead.open_questions,
    nextCallObjective: dbLead.next_call_objective,
    segment: dbLead.segment,
    isDecisionMaker: dbLead.is_decision_maker as Lead['isDecisionMaker'],
    isFleetOwner: dbLead.is_fleet_owner as Lead['isFleetOwner'],
    operationalContext: dbLead.operational_context,
    constraints: dbLead.constraints as Lead['constraints'],
    constraintOther: dbLead.constraint_other,
    opportunityAngle: dbLead.opportunity_angle,
    website: dbLead.website,
    email: dbLead.email,
    address: dbLead.address,
    leadSource: dbLead.lead_source,
    contacts: dbLead.contacts || [],
    createdAt: dbLead.created_at,
  }
}

function transformLeadToDb(lead: Lead): DbLead {
  return {
    id: lead.id,
    company: lead.company,
    phone: lead.phone,
    confirmed_facts: lead.confirmedFacts,
    open_questions: lead.openQuestions,
    next_call_objective: lead.nextCallObjective,
    segment: lead.segment,
    is_decision_maker: lead.isDecisionMaker,
    is_fleet_owner: lead.isFleetOwner,
    operational_context: lead.operationalContext,
    constraints: lead.constraints,
    constraint_other: lead.constraintOther,
    opportunity_angle: lead.opportunityAngle,
    website: lead.website,
    email: lead.email,
    address: lead.address,
    lead_source: lead.leadSource,
    contacts: lead.contacts,
    created_at: lead.createdAt,
  }
}

interface DbAttempt {
  id: string
  lead_id: string
  contact_id?: string
  timestamp: string
  outcome: string
  why?: string
  rep_mistake?: string
  dm_reached: boolean
  next_action: string
  next_action_at?: string
  note?: string
  duration_sec: number
  experiment_tag?: string
  session_id?: string
  matters_most?: string
  is_top_call?: boolean
  is_bottom_call?: boolean
  created_at: string
  open_phone_call_id?: string
  direction?: string
  dialed_number?: string
  answered_at?: string
  completed_at?: string
  recording_url?: string
  recording_duration_sec?: number
  transcript?: Attempt['transcript']
  call_summary?: string
  status?: string
}

function transformAttemptFromDb(dbAttempt: DbAttempt): Attempt {
  return {
    id: dbAttempt.id,
    leadId: dbAttempt.lead_id,
    contactId: dbAttempt.contact_id,
    timestamp: dbAttempt.timestamp,
    outcome: dbAttempt.outcome as Attempt['outcome'],
    why: dbAttempt.why as Attempt['why'],
    repMistake: dbAttempt.rep_mistake as Attempt['repMistake'],
    dmReached: dbAttempt.dm_reached,
    nextAction: dbAttempt.next_action as Attempt['nextAction'],
    nextActionAt: dbAttempt.next_action_at,
    note: dbAttempt.note,
    durationSec: dbAttempt.duration_sec,
    experimentTag: dbAttempt.experiment_tag,
    sessionId: dbAttempt.session_id,
    mattersMost: dbAttempt.matters_most as Attempt['mattersMost'],
    isTopCall: dbAttempt.is_top_call,
    isBottomCall: dbAttempt.is_bottom_call,
    createdAt: dbAttempt.created_at,
    openPhoneCallId: dbAttempt.open_phone_call_id,
    direction: dbAttempt.direction as Attempt['direction'],
    dialedNumber: dbAttempt.dialed_number,
    answeredAt: dbAttempt.answered_at,
    completedAt: dbAttempt.completed_at,
    recordingUrl: dbAttempt.recording_url,
    recordingDurationSec: dbAttempt.recording_duration_sec,
    transcript: dbAttempt.transcript,
    callSummary: dbAttempt.call_summary,
    status: dbAttempt.status as Attempt['status'],
  }
}

function transformAttemptToDb(attempt: Attempt): DbAttempt {
  return {
    id: attempt.id,
    lead_id: attempt.leadId,
    contact_id: attempt.contactId,
    timestamp: attempt.timestamp,
    outcome: attempt.outcome,
    why: attempt.why,
    rep_mistake: attempt.repMistake,
    dm_reached: attempt.dmReached,
    next_action: attempt.nextAction,
    next_action_at: attempt.nextActionAt,
    note: attempt.note,
    duration_sec: attempt.durationSec,
    experiment_tag: attempt.experimentTag,
    session_id: attempt.sessionId,
    matters_most: attempt.mattersMost,
    is_top_call: attempt.isTopCall,
    is_bottom_call: attempt.isBottomCall,
    created_at: attempt.createdAt,
    open_phone_call_id: attempt.openPhoneCallId,
    direction: attempt.direction,
    dialed_number: attempt.dialedNumber,
    answered_at: attempt.answeredAt,
    completed_at: attempt.completedAt,
    recording_url: attempt.recordingUrl,
    recording_duration_sec: attempt.recordingDurationSec,
    transcript: attempt.transcript,
    call_summary: attempt.callSummary,
    status: attempt.status,
  }
}

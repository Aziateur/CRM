// Framework config v4 — Phases + Markers + Levers
// Stored in Supabase. Migration from localStorage happens on first load.
//
// v4 format:
//   - "action/win" marker naming (not "practice/translation")
//   - whyText/doText/winText (not why/do_/win)
//   - period: PeriodConfig object (supports rolling N days)

import { startOfWeek, startOfDay, subDays, differenceInCalendarDays } from "date-fns"
import { getSupabase } from "@/lib/supabase"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Marker {
  key: string       // stable id, e.g. "focus_practiced"
  label: string     // user-editable display name
  definition?: string // what does marking Y mean? (shown in logger tooltip)
}

export interface Lever {
  key: string       // stable, e.g. "call.framing"
  label: string     // editable display name
  prompt?: string   // optional 1-line coaching reminder
}

export type PrimaryGoal = "reps" | "action" | "win" | "outcome_meetings"

export type PeriodConfig =
  | { type: "today" }
  | { type: "iso_week" }
  | { type: "rolling_days"; days: number }

export interface Phase {
  key: string
  label: string
  whyText: string
  doText: string
  winText: string
  focusLeverKey: string
  actionMarkerKey?: string
  winMarkerKey?: string
  primaryGoal: PrimaryGoal
  target: number
  period: PeriodConfig
  exitCriteria?: string
}

export interface Framework {
  version: 4
  activePhaseKey: string
  phases: Phase[]
  markers: Marker[]
  levers: Lever[]
  signalsStartedAt?: string
}

// ---------------------------------------------------------------------------
// Default seed
// ---------------------------------------------------------------------------

const DEFAULT_MARKERS: Marker[] = [
  { key: "focus_practiced", label: "Did the move", definition: "Did I consciously practice the focus skill on this call?" },
  { key: "new_truth_gained", label: "Got new truth", definition: "Did I learn something new about the prospect's real situation?" },
]

const DEFAULT_LEVERS: Lever[] = [
  { key: "call.framing", label: "Framing & Positioning", prompt: "Lead with their world, not your pitch" },
  { key: "call.curiosity", label: "Curiosity Questions", prompt: "Ask one question you don't know the answer to" },
  { key: "call.qualify", label: "Qualify Who They Are", prompt: "Confirm ICP fit before pitching" },
  { key: "call.pain", label: "Pain Extraction", prompt: "Find the pain behind the stated need" },
  { key: "call.adapt", label: "Adapt Next Line", prompt: "React to what they said, not your script" },
]

const DEFAULT_PHASES: Phase[] = [
  {
    key: "call_quality",
    label: "Call Quality",
    whyText: "My calls aren't converting — I need better execution",
    doText: "Practice the focus skill consciously on every call",
    winText: "High action rate with new truths gained on most connects",
    focusLeverKey: "call.framing",
    actionMarkerKey: "focus_practiced",
    winMarkerKey: "new_truth_gained",
    primaryGoal: "reps",
    target: 40,
    period: { type: "iso_week" },
    exitCriteria: "Action rate > 80% for two weeks and truth rate climbing",
  },
  {
    key: "market_intel",
    label: "Market Intel",
    whyText: "I don't understand enough about prospects' real situation",
    doText: "Ask one question I don't know the answer to on every call",
    winText: "Learn something new on every connected call",
    focusLeverKey: "call.curiosity",
    actionMarkerKey: "focus_practiced",
    winMarkerKey: "new_truth_gained",
    primaryGoal: "win",
    target: 25,
    period: { type: "iso_week" },
    exitCriteria: "Win rate consistently above 60% of connects",
  },
  {
    key: "booking",
    label: "Book Meetings",
    whyText: "I'm connecting but not converting to meetings",
    doText: "Ask for the meeting explicitly on every qualified call",
    winText: "Book meetings at a sustainable rate",
    focusLeverKey: "call.framing",
    actionMarkerKey: "focus_practiced",
    primaryGoal: "outcome_meetings",
    target: 8,
    period: { type: "iso_week" },
    exitCriteria: "Booking rate above 10% of DM connects for 2 weeks",
  },
]

export const DEFAULT_FRAMEWORK: Framework = {
  version: 4,
  activePhaseKey: "call_quality",
  phases: DEFAULT_PHASES,
  markers: DEFAULT_MARKERS,
  levers: DEFAULT_LEVERS,
  signalsStartedAt: new Date().toISOString(),
}

// ---------------------------------------------------------------------------
// Validation (pure function, no side effects)
// ---------------------------------------------------------------------------

export function validateFramework(next: Framework): { ok: boolean; error?: string } {
  if (next.version !== 4) return { ok: false, error: "version must be 4" }
  if (!Array.isArray(next.phases) || next.phases.length === 0) return { ok: false, error: "At least one phase required" }
  if (!Array.isArray(next.markers)) return { ok: false, error: "markers array required" }
  if (!Array.isArray(next.levers) || next.levers.length === 0) return { ok: false, error: "At least one lever required" }

  const phaseKeys = new Set(next.phases.map(p => p.key))
  if (phaseKeys.size !== next.phases.length) return { ok: false, error: "Duplicate phase keys" }

  const leverKeys = new Set(next.levers.map(l => l.key))
  if (leverKeys.size !== next.levers.length) return { ok: false, error: "Duplicate lever keys" }

  const markerKeys = new Set(next.markers.map(m => m.key))
  if (markerKeys.size !== next.markers.length) return { ok: false, error: "Duplicate marker keys" }

  if (!phaseKeys.has(next.activePhaseKey)) {
    return { ok: false, error: `activePhaseKey "${next.activePhaseKey}" not found` }
  }

  for (const p of next.phases) {
    if (!p.key || !p.label.trim()) return { ok: false, error: "Phase missing key or label" }
    if (!leverKeys.has(p.focusLeverKey)) {
      return { ok: false, error: `Phase "${p.label}" references unknown lever "${p.focusLeverKey}"` }
    }
    if (p.actionMarkerKey && !markerKeys.has(p.actionMarkerKey)) {
      return { ok: false, error: `Phase "${p.label}" references unknown action marker "${p.actionMarkerKey}"` }
    }
    if (p.winMarkerKey && !markerKeys.has(p.winMarkerKey)) {
      return { ok: false, error: `Phase "${p.label}" references unknown win marker "${p.winMarkerKey}"` }
    }
    if (typeof p.target !== "number" || p.target < 0) {
      return { ok: false, error: `Phase "${p.label}" target must be >= 0` }
    }
    if (!p.period || !p.period.type) {
      return { ok: false, error: `Phase "${p.label}" has invalid period` }
    }
    if (p.period.type === "rolling_days" && (!p.period.days || p.period.days < 1)) {
      return { ok: false, error: `Phase "${p.label}" rolling period needs days >= 1` }
    }
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Supabase operations
// ---------------------------------------------------------------------------

/** Fetch the framework for a project from Supabase */
export async function fetchFramework(projectId: string): Promise<Framework | null> {
  const supabase = getSupabase()

  const { data: fwRow } = await supabase
    .from("frameworks")
    .select("*")
    .eq("project_id", projectId)
    .single()

  if (!fwRow) return null

  const fwId = (fwRow as Record<string, unknown>).id as string

  const [leversRes, markersRes, phasesRes] = await Promise.all([
    supabase.from("framework_levers").select("*").eq("framework_id", fwId).order("sort_order"),
    supabase.from("framework_markers").select("*").eq("framework_id", fwId).order("sort_order"),
    supabase.from("framework_phases").select("*").eq("framework_id", fwId).order("sort_order"),
  ])

  const levers: Lever[] = (leversRes.data ?? []).map((r: Record<string, unknown>) => ({
    key: r.key as string,
    label: r.label as string,
    prompt: (r.prompt ?? undefined) as string | undefined,
  }))

  const markers: Marker[] = (markersRes.data ?? []).map((r: Record<string, unknown>) => ({
    key: r.key as string,
    label: r.label as string,
    definition: (r.definition ?? undefined) as string | undefined,
  }))

  const phases: Phase[] = (phasesRes.data ?? []).map((r: Record<string, unknown>) => ({
    key: r.key as string,
    label: r.label as string,
    whyText: (r.why_text ?? "") as string,
    doText: (r.do_text ?? "") as string,
    winText: (r.win_text ?? "") as string,
    focusLeverKey: r.focus_lever_key as string,
    actionMarkerKey: (r.action_marker_key ?? undefined) as string | undefined,
    winMarkerKey: (r.win_marker_key ?? undefined) as string | undefined,
    primaryGoal: (r.primary_goal ?? "reps") as PrimaryGoal,
    target: (r.target ?? 40) as number,
    period: (r.period ?? { type: "iso_week" }) as PeriodConfig,
    exitCriteria: (r.exit_criteria ?? undefined) as string | undefined,
  }))

  if (phases.length === 0 || levers.length === 0) return null

  return {
    version: 4,
    activePhaseKey: (fwRow as Record<string, unknown>).active_phase_key as string,
    phases,
    markers,
    levers,
    signalsStartedAt: ((fwRow as Record<string, unknown>).signals_started_at as string) || undefined,
  }
}

/** Save a full framework to Supabase (upsert root + replace children) */
export async function saveFrameworkToDb(
  fw: Framework,
  projectId: string,
): Promise<{ ok: boolean; error?: string }> {
  const validation = validateFramework(fw)
  if (!validation.ok) return validation

  const supabase = getSupabase()

  // Upsert the root framework row
  const { data: fwRow, error: fwError } = await supabase
    .from("frameworks")
    .upsert({
      project_id: projectId,
      active_phase_key: fw.activePhaseKey,
      signals_started_at: fw.signalsStartedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "project_id" })
    .select("id")
    .single()

  if (fwError || !fwRow) {
    return { ok: false, error: fwError?.message || "Failed to save framework" }
  }

  const fwId = (fwRow as Record<string, unknown>).id as string

  // Delete existing children then re-insert (simplest transactional approach)
  await Promise.all([
    supabase.from("framework_levers").delete().eq("framework_id", fwId),
    supabase.from("framework_markers").delete().eq("framework_id", fwId),
    supabase.from("framework_phases").delete().eq("framework_id", fwId),
  ])

  const insertResults = await Promise.all([
    supabase.from("framework_levers").insert(
      fw.levers.map((l, i) => ({
        framework_id: fwId,
        key: l.key,
        label: l.label,
        prompt: l.prompt || null,
        sort_order: i,
        project_id: projectId,
      })),
    ),
    supabase.from("framework_markers").insert(
      fw.markers.map((m, i) => ({
        framework_id: fwId,
        key: m.key,
        label: m.label,
        definition: m.definition || null,
        sort_order: i,
        project_id: projectId,
      })),
    ),
    supabase.from("framework_phases").insert(
      fw.phases.map((p, i) => ({
        framework_id: fwId,
        key: p.key,
        label: p.label,
        why_text: p.whyText,
        do_text: p.doText,
        win_text: p.winText,
        focus_lever_key: p.focusLeverKey,
        action_marker_key: p.actionMarkerKey || null,
        win_marker_key: p.winMarkerKey || null,
        primary_goal: p.primaryGoal,
        target: p.target,
        period: p.period,
        exit_criteria: p.exitCriteria || null,
        sort_order: i,
        project_id: projectId,
      })),
    ),
  ])

  const childError = insertResults.find(r => r.error)
  if (childError?.error) {
    return { ok: false, error: childError.error.message }
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// localStorage → Supabase migration (one-time)
// ---------------------------------------------------------------------------

const STORAGE_KEY = "crm_framework_v4"
const V3_KEY = "crm_framework_v3"
const V2_KEY = "crm_framework_v2"
const V1_KEY = "crm_mission_control"
const BACKUP_KEY = "crm_framework_backup"

type V3GoalPeriod = "iso_week" | "rolling_7" | "today"
type V3TargetMetric = "reps" | "practice" | "translation" | "outcome_meetings"

interface V3Phase {
  key: string; label: string; why: string; do_: string; win: string
  focusLeverKey: string; practiceMarkerKey?: string; translationMarkerKey?: string
  targetMetric: V3TargetMetric; target: number; period: V3GoalPeriod; exitCriteria?: string
}

interface V3Framework {
  version: 3; activePhaseKey: string; phases: V3Phase[]
  markers: Marker[]; levers: Lever[]; signalsStartedAt?: string
}

interface V2Phase {
  key: string; label: string; goalCounterKey: string; target: number
  period: V3GoalPeriod; focusLeverKey: string; prompts?: string[]
}

interface V2Framework {
  version: 2; activePhaseKey: string; phases: V2Phase[]; levers: Lever[]
}

function migratePeriod(old: V3GoalPeriod): PeriodConfig {
  switch (old) {
    case "iso_week": return { type: "iso_week" }
    case "rolling_7": return { type: "rolling_days", days: 7 }
    case "today": return { type: "today" }
  }
}

function migrateGoal(old: V3TargetMetric): PrimaryGoal {
  switch (old) {
    case "practice": return "action"
    case "translation": return "win"
    default: return old
  }
}

function readLocalStorageFramework(): Framework | null {
  if (typeof window === "undefined") return null

  // Try v4
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.version === 4 && Array.isArray(parsed.phases)) return parsed as Framework
    }
  } catch { /* ignore */ }

  // Try v3 → v4
  try {
    const v3Raw = localStorage.getItem(V3_KEY)
    if (v3Raw) {
      const v3 = JSON.parse(v3Raw) as V3Framework
      if (v3.version === 3 && Array.isArray(v3.phases)) {
        return {
          version: 4,
          activePhaseKey: v3.activePhaseKey,
          phases: v3.phases.map(p => ({
            key: p.key, label: p.label, whyText: p.why, doText: p.do_, winText: p.win,
            focusLeverKey: p.focusLeverKey, actionMarkerKey: p.practiceMarkerKey,
            winMarkerKey: p.translationMarkerKey, primaryGoal: migrateGoal(p.targetMetric),
            target: p.target, period: migratePeriod(p.period), exitCriteria: p.exitCriteria,
          })),
          markers: v3.markers, levers: v3.levers,
          signalsStartedAt: v3.signalsStartedAt || new Date().toISOString(),
        }
      }
    }
  } catch { /* ignore */ }

  // Try v2 → v4
  try {
    const v2Raw = localStorage.getItem(V2_KEY)
    if (v2Raw) {
      const v2 = JSON.parse(v2Raw) as V2Framework
      if (v2.version === 2 && Array.isArray(v2.phases) && Array.isArray(v2.levers)) {
        const counterToGoal = (c: string): PrimaryGoal =>
          c === "meetings_set" ? "outcome_meetings" : c === "new_truth_gained" ? "win" : "reps"
        return {
          version: 4,
          activePhaseKey: v2.activePhaseKey,
          phases: v2.phases.map(p => ({
            key: p.key, label: p.label,
            whyText: `Working on ${p.label}`, doText: p.prompts?.[0] || "Focus on the skill",
            winText: `Hit ${p.target} ${p.label.toLowerCase()} this week`,
            focusLeverKey: p.focusLeverKey, actionMarkerKey: "focus_practiced",
            winMarkerKey: p.goalCounterKey === "meetings_set" ? undefined : "new_truth_gained",
            primaryGoal: counterToGoal(p.goalCounterKey),
            target: p.target, period: migratePeriod(p.period),
          })),
          markers: [...DEFAULT_MARKERS],
          levers: v2.levers.map(l => ({ key: l.key, label: l.label, prompt: l.prompt })),
          signalsStartedAt: new Date().toISOString(),
        }
      }
    }
  } catch { /* ignore */ }

  return null
}

function clearLocalStorageFramework(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(V3_KEY)
  localStorage.removeItem(V2_KEY)
  localStorage.removeItem(V1_KEY)
  localStorage.removeItem(BACKUP_KEY)
}

/** Migrate localStorage framework to Supabase. Returns true if migration happened. */
export async function migrateLocalStorageFramework(projectId: string): Promise<boolean> {
  const localFw = readLocalStorageFramework()
  if (!localFw) return false

  const result = await saveFrameworkToDb(localFw, projectId)
  if (result.ok) {
    clearLocalStorageFramework()
    console.log("[framework] migrated from localStorage to Supabase")
    return true
  }

  console.error("[framework] migration failed:", result.error)
  return false
}

// ---------------------------------------------------------------------------
// Helpers (pure functions — no storage access)
// ---------------------------------------------------------------------------

export function getActivePhase(fw: Framework): Phase {
  return fw.phases.find(p => p.key === fw.activePhaseKey) || fw.phases[0]
}

export function getActiveFocusLever(fw: Framework): Lever {
  const phase = getActivePhase(fw)
  return fw.levers.find(l => l.key === phase.focusLeverKey) || fw.levers[0]
}

export function getMarker(fw: Framework, key: string | undefined): Marker | undefined {
  if (!key) return undefined
  return fw.markers.find(m => m.key === key)
}

export function getPeriodRange(period: PeriodConfig): { start: Date; end: Date } {
  const now = new Date()
  switch (period.type) {
    case "iso_week": {
      const start = startOfWeek(now, { weekStartsOn: 1 })
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      return { start, end }
    }
    case "rolling_days": {
      const days = period.days || 7
      const start = startOfDay(subDays(now, days - 1))
      const end = new Date(now)
      end.setDate(end.getDate() + 1)
      return { start: startOfDay(start), end: startOfDay(end) }
    }
    case "today": {
      const start = startOfDay(now)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return { start, end }
    }
  }
}

export function getRemainingDays(period: PeriodConfig): number {
  const { end } = getPeriodRange(period)
  const now = new Date()
  return Math.max(differenceInCalendarDays(end, now), 1)
}

export function getPeriodTotalDays(period: PeriodConfig): number {
  switch (period.type) {
    case "iso_week": return 7
    case "rolling_days": return period.days || 7
    case "today": return 1
  }
}

export function getPeriodLabel(period: PeriodConfig): string {
  switch (period.type) {
    case "iso_week": return "This week"
    case "rolling_days": return `Last ${period.days || 7} days`
    case "today": return "Today"
  }
}

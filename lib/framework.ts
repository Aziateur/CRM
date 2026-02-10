// Framework config v3 — Phases + Markers + Levers
// Stored in localStorage. No DB tables needed.

import { startOfWeek, startOfDay, subDays, differenceInCalendarDays } from "date-fns"

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

export type TargetMetric = "reps" | "practice" | "translation" | "outcome_meetings"
export type GoalPeriod = "iso_week" | "rolling_7" | "today"

export interface Phase {
  key: string
  label: string
  // The 3 sentences — what the user reads
  why: string       // what bottleneck / constraint hypothesis
  do_: string       // what to do each call (the lever in plain language)
  win: string       // what counts as progress this week (definition)
  // Wiring
  focusLeverKey: string
  practiceMarkerKey?: string    // optional — omit for pure outcome phases
  translationMarkerKey?: string // optional — omit for pure practice phases
  // Goal
  targetMetric: TargetMetric
  target: number
  period: GoalPeriod
  // Optional
  exitCriteria?: string // when to switch phases (user-authored text)
}

export interface Framework {
  version: 3
  activePhaseKey: string
  phases: Phase[]
  markers: Marker[]
  levers: Lever[]
  signalsStartedAt?: string // ISO — so we know older calls are unscored
}

// ---------------------------------------------------------------------------
// Default seed
// ---------------------------------------------------------------------------

const DEFAULT_MARKERS: Marker[] = [
  { key: "focus_practiced", label: "Focus practiced", definition: "Did I consciously practice the focus skill on this call?" },
  { key: "new_truth_gained", label: "New truth gained", definition: "Did I learn something new about the prospect's real situation?" },
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
    why: "My calls aren't converting — I need better execution",
    do_: "Practice the focus skill consciously on every call",
    win: "High practice rate with truth gained on most connects",
    focusLeverKey: "call.framing",
    practiceMarkerKey: "focus_practiced",
    translationMarkerKey: "new_truth_gained",
    targetMetric: "reps",
    target: 40,
    period: "iso_week",
    exitCriteria: "Practice rate > 80% for two weeks and truth rate climbing",
  },
  {
    key: "market_intel",
    label: "Market Intel",
    why: "I don't understand enough about prospects' real situation",
    do_: "Ask one question I don't know the answer to on every call",
    win: "Learn something new on every connected call",
    focusLeverKey: "call.curiosity",
    practiceMarkerKey: "focus_practiced",
    translationMarkerKey: "new_truth_gained",
    targetMetric: "translation",
    target: 25,
    period: "iso_week",
    exitCriteria: "Truth gained rate consistently above 60% of connects",
  },
  {
    key: "booking",
    label: "Book Meetings",
    why: "I'm connecting but not converting to meetings",
    do_: "Ask for the meeting explicitly on every qualified call",
    win: "Book meetings at a sustainable rate",
    focusLeverKey: "call.framing",
    practiceMarkerKey: "focus_practiced",
    targetMetric: "outcome_meetings",
    target: 8,
    period: "iso_week",
    exitCriteria: "Booking rate above 10% of DM connects for 2 weeks",
  },
]

export const DEFAULT_FRAMEWORK: Framework = {
  version: 3,
  activePhaseKey: "call_quality",
  phases: DEFAULT_PHASES,
  markers: DEFAULT_MARKERS,
  levers: DEFAULT_LEVERS,
  signalsStartedAt: new Date().toISOString(),
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY = "crm_framework_v3"
const BACKUP_KEY = "crm_framework_backup"
const V2_KEY = "crm_framework_v2"
const V1_KEY = "crm_mission_control"

// ---------------------------------------------------------------------------
// v2 → v3 migration
// ---------------------------------------------------------------------------

interface V2Phase {
  key: string
  label: string
  goalCounterKey: string
  target: number
  period: GoalPeriod
  focusLeverKey: string
  prompts?: string[]
}

interface V2Framework {
  version: 2
  activePhaseKey: string
  phases: V2Phase[]
  levers: Lever[]
}

function migrateV2toV3(v2: V2Framework): Framework {
  const whyDoWinDefaults: Record<string, { why: string; do_: string; win: string }> = {
    call_quality: {
      why: "My calls aren't converting — I need better execution",
      do_: "Practice the focus skill consciously on every call",
      win: "High practice rate with truth gained on most connects",
    },
    market_intel: {
      why: "I don't understand enough about prospects' real situation",
      do_: "Ask one question I don't know the answer to on every call",
      win: "Learn something new on every connected call",
    },
    lead_quality: {
      why: "I might be calling the wrong people",
      do_: "Qualify ICP fit within the first 30 seconds",
      win: "Confirm or disqualify quickly — no wasted pitches",
    },
    booking: {
      why: "I'm connecting but not converting to meetings",
      do_: "Ask for the meeting explicitly on every qualified call",
      win: "Book meetings at a sustainable rate",
    },
  }

  const counterToTargetMetric = (counter: string): TargetMetric => {
    if (counter === "meetings_set") return "outcome_meetings"
    if (counter === "new_truth_gained") return "translation"
    return "reps"
  }

  const phases: Phase[] = v2.phases.map(p => {
    const defaults = whyDoWinDefaults[p.key] || {
      why: `Working on ${p.label}`,
      do_: p.prompts?.[0] || "Focus on the skill",
      win: `Hit ${p.target} ${p.label.toLowerCase()} this week`,
    }
    return {
      key: p.key,
      label: p.label,
      why: defaults.why,
      do_: defaults.do_,
      win: defaults.win,
      focusLeverKey: p.focusLeverKey,
      practiceMarkerKey: "focus_practiced",
      translationMarkerKey: p.goalCounterKey === "meetings_set" ? undefined : "new_truth_gained",
      targetMetric: counterToTargetMetric(p.goalCounterKey),
      target: p.target,
      period: p.period,
    }
  })

  return {
    version: 3,
    activePhaseKey: v2.activePhaseKey,
    phases,
    markers: [...DEFAULT_MARKERS],
    levers: v2.levers.map(l => ({ key: l.key, label: l.label, prompt: l.prompt })),
    signalsStartedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

export function getFramework(): Framework {
  if (typeof window === "undefined") return DEFAULT_FRAMEWORK
  try {
    // Try v3 first
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.version === 3 && Array.isArray(parsed.phases)) {
        return parsed as Framework
      }
    }

    // Try v2 migration
    const v2Raw = localStorage.getItem(V2_KEY)
    if (v2Raw) {
      try {
        const v2 = JSON.parse(v2Raw) as V2Framework
        if (v2.version === 2 && Array.isArray(v2.phases) && Array.isArray(v2.levers)) {
          const fw = migrateV2toV3(v2)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fw))
          localStorage.removeItem(V2_KEY)
          return fw
        }
      } catch { /* ignore bad v2 */ }
    }

    // Clean up v1 if it exists
    localStorage.removeItem(V1_KEY)

    return DEFAULT_FRAMEWORK
  } catch {
    return DEFAULT_FRAMEWORK
  }
}

/** Validate + save. Returns { ok, error? }. Backs up before writing. */
export function setFramework(next: Framework): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: false, error: "No window" }

  // Validate
  if (next.version !== 3) return { ok: false, error: "version must be 3" }
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
    if (!p.key || !p.label) return { ok: false, error: "Phase missing key or label" }
    if (!leverKeys.has(p.focusLeverKey)) {
      return { ok: false, error: `Phase "${p.label}" references unknown lever "${p.focusLeverKey}"` }
    }
    if (p.practiceMarkerKey && !markerKeys.has(p.practiceMarkerKey)) {
      return { ok: false, error: `Phase "${p.label}" references unknown practice marker "${p.practiceMarkerKey}"` }
    }
    if (p.translationMarkerKey && !markerKeys.has(p.translationMarkerKey)) {
      return { ok: false, error: `Phase "${p.label}" references unknown translation marker "${p.translationMarkerKey}"` }
    }
    if (typeof p.target !== "number" || p.target < 0) {
      return { ok: false, error: `Phase "${p.label}" target must be >= 0` }
    }
  }

  // Backup current
  const current = localStorage.getItem(STORAGE_KEY)
  if (current) localStorage.setItem(BACKUP_KEY, current)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Helpers
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

export function getPeriodRange(period: GoalPeriod): { start: Date; end: Date } {
  const now = new Date()
  switch (period) {
    case "iso_week": {
      const start = startOfWeek(now, { weekStartsOn: 1 })
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      return { start, end }
    }
    case "rolling_7": {
      const start = startOfDay(subDays(now, 6))
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

export function getRemainingDays(period: GoalPeriod): number {
  const { end } = getPeriodRange(period)
  const now = new Date()
  return Math.max(differenceInCalendarDays(end, now), 1)
}

export function getPeriodTotalDays(period: GoalPeriod): number {
  switch (period) {
    case "iso_week": return 7
    case "rolling_7": return 7
    case "today": return 1
  }
}

export function getPeriodLabel(period: GoalPeriod): string {
  switch (period) {
    case "iso_week": return "This week"
    case "rolling_7": return "Last 7 days"
    case "today": return "Today"
  }
}

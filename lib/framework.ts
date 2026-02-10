// Framework config — Modes + Levers + Signals
// Stored in localStorage. No DB tables needed.

import { startOfWeek, startOfDay, subDays, differenceInCalendarDays } from "date-fns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Lever {
  key: string    // stable, e.g. "call.framing"
  label: string  // editable display name
  prompt?: string // optional 1-line coaching reminder
}

export type GoalCounterKey =
  | "focus_practiced"
  | "new_truth_gained"
  | "meetings_set"
  | "icp_validated"

export type GoalPeriod = "iso_week" | "rolling_7" | "today"

export interface Phase {
  key: string
  label: string
  goalCounterKey: GoalCounterKey
  target: number
  period: GoalPeriod
  focusLeverKey: string
  prompts?: string[] // max 2 coaching lines shown during dialing
}

export interface Framework {
  version: 2
  activePhaseKey: string
  phases: Phase[]
  levers: Lever[]
}

// ---------------------------------------------------------------------------
// Default seed
// ---------------------------------------------------------------------------

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
    goalCounterKey: "focus_practiced",
    target: 40,
    period: "iso_week",
    focusLeverKey: "call.framing",
    prompts: ["Focus on one skill per session", "Rate honestly — no one sees this but you"],
  },
  {
    key: "market_intel",
    label: "Market Intel",
    goalCounterKey: "new_truth_gained",
    target: 25,
    period: "iso_week",
    focusLeverKey: "call.curiosity",
    prompts: ["Map pain owner, workflow, trigger, decision process", "Every call is a research call"],
  },
  {
    key: "lead_quality",
    label: "Lead Quality",
    goalCounterKey: "icp_validated",
    target: 20,
    period: "iso_week",
    focusLeverKey: "call.qualify",
    prompts: ["Confirm ICP fit within first 30 seconds", "Wrong list = wasted effort"],
  },
  {
    key: "booking",
    label: "Book Meetings",
    goalCounterKey: "meetings_set",
    target: 8,
    period: "iso_week",
    focusLeverKey: "call.framing",
    prompts: ["Ask for the meeting", "Don't leave without a clear next step"],
  },
]

export const DEFAULT_FRAMEWORK: Framework = {
  version: 2,
  activePhaseKey: "call_quality",
  phases: DEFAULT_PHASES,
  levers: DEFAULT_LEVERS,
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY = "crm_framework_v2"
const BACKUP_KEY = "crm_framework_backup"
const OLD_KEY = "crm_mission_control" // v1 — migrate once

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

export function getFramework(): Framework {
  if (typeof window === "undefined") return DEFAULT_FRAMEWORK
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version === 2 && Array.isArray(parsed.phases) && Array.isArray(parsed.levers)) {
        return parsed as Framework
      }
    }
    // Attempt migration from v1
    const old = localStorage.getItem(OLD_KEY)
    if (old) {
      // v1 had period, goalMetric, target — map to a single phase override
      try {
        const v1 = JSON.parse(old)
        const fw = structuredClone(DEFAULT_FRAMEWORK)
        // Preserve target on the booking phase if v1 was tracking meetings
        if (v1.goalMetric?.type === "attempt_outcome" && typeof v1.target === "number") {
          const booking = fw.phases.find(p => p.key === "booking")
          if (booking) booking.target = v1.target
        }
        if (v1.period) {
          fw.phases.forEach(p => { p.period = v1.period })
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fw))
        localStorage.removeItem(OLD_KEY)
        return fw
      } catch {
        // ignore bad v1
      }
    }
    return DEFAULT_FRAMEWORK
  } catch {
    return DEFAULT_FRAMEWORK
  }
}

/** Validate + save. Returns { ok, error? }. Backs up before writing. */
export function setFramework(next: Framework): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: false, error: "No window" }

  // Validate
  if (next.version !== 2) return { ok: false, error: "version must be 2" }
  if (!Array.isArray(next.phases) || next.phases.length === 0) return { ok: false, error: "phases required" }
  if (!Array.isArray(next.levers) || next.levers.length === 0) return { ok: false, error: "levers required" }

  const phaseKeys = new Set(next.phases.map(p => p.key))
  if (phaseKeys.size !== next.phases.length) return { ok: false, error: "Duplicate phase keys" }

  const leverKeys = new Set(next.levers.map(l => l.key))
  if (leverKeys.size !== next.levers.length) return { ok: false, error: "Duplicate lever keys" }

  if (!phaseKeys.has(next.activePhaseKey)) return { ok: false, error: `activePhaseKey "${next.activePhaseKey}" not found in phases` }

  for (const p of next.phases) {
    if (!p.key || !p.label) return { ok: false, error: `Phase missing key or label` }
    if (!leverKeys.has(p.focusLeverKey)) return { ok: false, error: `Phase "${p.key}" references unknown lever "${p.focusLeverKey}"` }
    if (typeof p.target !== "number" || p.target < 0) return { ok: false, error: `Phase "${p.key}" target must be >= 0` }
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
  const remaining = differenceInCalendarDays(end, now)
  return Math.max(remaining, 1)
}

export function getPeriodTotalDays(period: GoalPeriod): number {
  switch (period) {
    case "iso_week": return 7
    case "rolling_7": return 7
    case "today": return 1
  }
}

export function getGoalLabel(counterKey: GoalCounterKey): string {
  switch (counterKey) {
    case "focus_practiced": return "Focus Practiced"
    case "new_truth_gained": return "Truths Gained"
    case "meetings_set": return "Meetings Set"
    case "icp_validated": return "ICP Validated"
  }
}

export function getPeriodLabel(period: GoalPeriod): string {
  switch (period) {
    case "iso_week": return "This week"
    case "rolling_7": return "Last 7 days"
    case "today": return "Today"
  }
}

// Mission Control configuration — stored in localStorage.
// Configurable goal metric so you're not locked into "meetings" forever.

import { startOfWeek, startOfDay, subDays, differenceInCalendarDays } from "date-fns"

const STORAGE_KEY = "crm_mission_control"

export type GoalPeriod = "iso_week" | "rolling_7" | "today"

export type GoalMetricType = "attempt_outcome" | "attempt_count" | "task_completed"

export interface MissionControlConfig {
  period: GoalPeriod
  goalMetric: {
    type: GoalMetricType
    outcomes?: string[] // only for attempt_outcome
  }
  target: number
}

const DEFAULT_CONFIG: MissionControlConfig = {
  period: "iso_week",
  goalMetric: {
    type: "attempt_outcome",
    outcomes: ["Meeting set"],
  },
  target: 8,
}

export function getMissionControlConfig(): MissionControlConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    const parsed = JSON.parse(raw)
    return {
      period: parsed.period || DEFAULT_CONFIG.period,
      goalMetric: parsed.goalMetric || DEFAULT_CONFIG.goalMetric,
      target: typeof parsed.target === "number" ? parsed.target : DEFAULT_CONFIG.target,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function setMissionControlConfig(config: MissionControlConfig): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

// Period boundaries
export function getPeriodStart(period: GoalPeriod): Date {
  const now = new Date()
  switch (period) {
    case "iso_week":
      return startOfWeek(now, { weekStartsOn: 1 })
    case "rolling_7":
      return startOfDay(subDays(now, 6))
    case "today":
      return startOfDay(now)
  }
}

export function getPeriodTotalDays(period: GoalPeriod): number {
  switch (period) {
    case "iso_week":
      return 7
    case "rolling_7":
      return 7
    case "today":
      return 1
  }
}

export function getDaysElapsed(period: GoalPeriod): number {
  const start = getPeriodStart(period)
  const now = new Date()
  return Math.max(differenceInCalendarDays(now, start) + 1, 1)
}

// Labels for UI
export function getGoalLabel(config: MissionControlConfig): string {
  switch (config.goalMetric.type) {
    case "attempt_outcome":
      if (config.goalMetric.outcomes?.includes("Meeting set")) return "Meetings"
      return "Outcomes"
    case "attempt_count":
      return "Calls"
    case "task_completed":
      return "Tasks Done"
  }
}

export function getPeriodLabel(period: GoalPeriod): string {
  switch (period) {
    case "iso_week": return "This week"
    case "rolling_7": return "Last 7 days"
    case "today": return "Today"
  }
}

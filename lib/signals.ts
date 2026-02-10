// Signals store — boolean signals per attempt, stored in localStorage.
// Keyed by attemptId. Each entry holds { [leverKey]: boolean, createdAt }.

const STORAGE_KEY = "crm_signals_v1"

export interface AttemptSignals {
  [leverKey: string]: boolean
}

export interface SignalEntry {
  values: AttemptSignals
  createdAt: string // ISO
}

export type SignalsMap = Record<string, SignalEntry>

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

export function getSignals(): SignalsMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return (parsed && typeof parsed === "object") ? parsed as SignalsMap : {}
  } catch {
    return {}
  }
}

function saveSignals(signals: SignalsMap): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(signals))
}

// ---------------------------------------------------------------------------
// Per-attempt operations
// ---------------------------------------------------------------------------

export function setAttemptSignal(attemptId: string, leverKey: string, value: boolean): void {
  const all = getSignals()
  const existing = all[attemptId] || { values: {}, createdAt: new Date().toISOString() }
  existing.values[leverKey] = value
  all[attemptId] = existing
  saveSignals(all)
}

export function getAttemptSignal(attemptId: string, leverKey: string): boolean | undefined {
  const all = getSignals()
  return all[attemptId]?.values[leverKey]
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/** Count attempts where signals[id][counterKey] === true */
export function countSignals(attemptIds: string[], counterKey: string): number {
  const all = getSignals()
  let count = 0
  for (const id of attemptIds) {
    if (all[id]?.values[counterKey] === true) count++
  }
  return count
}

/** Check if a specific attempt has any signal recorded */
export function hasSignal(attemptId: string): boolean {
  const all = getSignals()
  const entry = all[attemptId]
  if (!entry) return false
  return Object.keys(entry.values).length > 0
}

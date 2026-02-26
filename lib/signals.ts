// Signals store — boolean signals per attempt, stored in Supabase.
// Keyed by attemptId + leverKey. Each row is a single Y/N marker.
//
// Migration from localStorage: on first load, useSignals hook checks for
// localStorage data and bulk-inserts it into Supabase, then clears localStorage.

import { getSupabase } from "@/lib/supabase"

const LEGACY_STORAGE_KEY = "crm_signals_v1"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttemptSignals {
  [leverKey: string]: boolean
}

export interface SignalEntry {
  values: AttemptSignals
  createdAt: string // ISO
}

export type SignalsMap = Record<string, SignalEntry>

interface SignalRow {
  id: string
  attempt_id: string
  lever_key: string
  value: boolean
  project_id: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Supabase operations
// ---------------------------------------------------------------------------

/** Fetch all signals for a project, returned as a SignalsMap for backward compat */
export async function fetchProjectSignals(projectId: string): Promise<SignalsMap> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("attempt_signals")
    .select("attempt_id, lever_key, value, created_at")
    .eq("project_id", projectId)

  if (error) {
    console.error("[signals] fetch failed:", error.message)
    return {}
  }

  const map: SignalsMap = {}
  for (const row of (data ?? []) as SignalRow[]) {
    if (!map[row.attempt_id]) {
      map[row.attempt_id] = { values: {}, createdAt: row.created_at }
    }
    map[row.attempt_id].values[row.lever_key] = row.value
  }
  return map
}

/** Upsert a single signal (attempt + lever → value) */
export async function upsertSignal(
  attemptId: string,
  leverKey: string,
  value: boolean,
  projectId: string,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("attempt_signals")
    .upsert(
      {
        attempt_id: attemptId,
        lever_key: leverKey,
        value,
        project_id: projectId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "attempt_id,lever_key" },
    )

  if (error) {
    console.error("[signals] upsert failed:", error.message)
    throw new Error(error.message)
  }
}

// ---------------------------------------------------------------------------
// Derived helpers (operate on a pre-fetched SignalsMap)
// ---------------------------------------------------------------------------

/** Count attempts where signals[id][counterKey] === true */
export function countSignals(signalsMap: SignalsMap, attemptIds: string[], counterKey: string): number {
  let count = 0
  for (const id of attemptIds) {
    if (signalsMap[id]?.values[counterKey] === true) count++
  }
  return count
}

/** Check if a specific attempt has any signal recorded */
export function hasSignal(signalsMap: SignalsMap, attemptId: string): boolean {
  const entry = signalsMap[attemptId]
  if (!entry) return false
  return Object.keys(entry.values).length > 0
}

/** Get a specific signal value */
export function getAttemptSignal(signalsMap: SignalsMap, attemptId: string, leverKey: string): boolean | undefined {
  return signalsMap[attemptId]?.values[leverKey]
}

// ---------------------------------------------------------------------------
// localStorage → Supabase migration (one-time)
// ---------------------------------------------------------------------------

/** Migrate any existing localStorage signals to Supabase, then clear localStorage */
export async function migrateLocalStorageSignals(projectId: string): Promise<number> {
  if (typeof window === "undefined") return 0

  const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) return 0

  let parsed: SignalsMap
  try {
    parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return 0
  } catch {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return 0
  }

  const rows: { attempt_id: string; lever_key: string; value: boolean; project_id: string }[] = []
  for (const [attemptId, entry] of Object.entries(parsed)) {
    if (!entry?.values) continue
    for (const [leverKey, value] of Object.entries(entry.values)) {
      rows.push({
        attempt_id: attemptId,
        lever_key: leverKey,
        value: Boolean(value),
        project_id: projectId,
      })
    }
  }

  if (rows.length === 0) {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return 0
  }

  const supabase = getSupabase()
  // Batch upsert — if signals already exist in DB, skip them
  const { error } = await supabase
    .from("attempt_signals")
    .upsert(rows, { onConflict: "attempt_id,lever_key", ignoreDuplicates: true })

  if (error) {
    console.error("[signals] migration failed:", error.message)
    // Don't clear localStorage on failure — retry next time
    return 0
  }

  localStorage.removeItem(LEGACY_STORAGE_KEY)
  return rows.length
}

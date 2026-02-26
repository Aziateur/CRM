"use client"

import { useState, useCallback, useRef } from "react"
import { getSupabase } from "@/lib/supabase"

type SaveStatus = "idle" | "saving" | "saved" | "error"

/**
 * Hook for auto-saving a single lead field on blur/change.
 * Returns: [localValue, setValue, saveStatus, saveNow]
 *
 * Usage:
 *   const [val, setVal, status] = useAutoSaveField(leadId, "next_call_objective", lead.nextCallObjective)
 *   <Input value={val} onChange={e => setVal(e.target.value)} onBlur={() => saveNow()} />
 *   {status === "saving" && <span>Saving...</span>}
 */
export function useAutoSaveField<T>(
    leadId: string | undefined,
    dbColumn: string,
    initialValue: T,
    onSaved?: (value: T) => void,
): [T, (v: T) => void, SaveStatus, () => Promise<void>] {
    const [localValue, setLocalValue] = useState<T>(initialValue)
    const [status, setStatus] = useState<SaveStatus>("idle")
    const latestValueRef = useRef<T>(initialValue)

    // Keep ref in sync
    const setValue = useCallback((v: T) => {
        setLocalValue(v)
        latestValueRef.current = v
    }, [])

    // Reset when lead changes (initialValue changes)
    const prevInitialRef = useRef(initialValue)
    if (initialValue !== prevInitialRef.current) {
        prevInitialRef.current = initialValue
        setLocalValue(initialValue)
        latestValueRef.current = initialValue
        setStatus("idle")
    }

    const saveNow = useCallback(async () => {
        if (!leadId) return
        const value = latestValueRef.current
        // Skip if unchanged
        if (JSON.stringify(value) === JSON.stringify(prevInitialRef.current)) return

        setStatus("saving")
        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("leads")
                .update({ [dbColumn]: value ?? null })
                .eq("id", leadId)

            if (error) {
                setStatus("error")
                console.error(`[autoSave] ${dbColumn}:`, error.message)
                return
            }

            prevInitialRef.current = value
            setStatus("saved")
            onSaved?.(value)

            // Clear "saved" indicator after 2s
            setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000)
        } catch {
            setStatus("error")
        }
    }, [leadId, dbColumn, onSaved])

    return [localValue, setValue, status, saveNow]
}

/**
 * Auto-save multiple lead fields at once (for batch updates like confirmed_facts array).
 */
export async function saveLeadField(leadId: string, field: string, value: unknown): Promise<boolean> {
    const supabase = getSupabase()
    const { error } = await supabase
        .from("leads")
        .update({ [field]: value ?? null })
        .eq("id", leadId)

    if (error) {
        console.error(`[saveLeadField] ${field}:`, error.message)
        return false
    }
    return true
}

/**
 * Inline save status indicator component
 */
export function SaveIndicator({ status }: { status: SaveStatus }) {
    if (status === "idle") return null
    return (
        <span className={`text-xs transition-opacity ${status === "saving" ? "text-muted-foreground animate-pulse" :
                status === "saved" ? "text-green-600" :
                    status === "error" ? "text-red-600" : ""
            }`}>
            {status === "saving" ? "Saving..." : status === "saved" ? "✓ Saved" : status === "error" ? "Error" : ""}
        </span>
    )
}

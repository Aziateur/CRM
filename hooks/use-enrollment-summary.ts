"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { getSupabase } from "@/lib/supabase"

export interface EnrollmentSummary {
    leadId: string
    sequenceId: string
    sequenceName: string
    currentStep: number
    totalSteps: number
    status: string
}

export function useEnrollmentSummary() {
    const [data, setData] = useState<EnrollmentSummary[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const supabase = getSupabase()

            // Fetch enrollments with sequence name
            const { data: enrollments, error: enrollErr } = await supabase
                .from("sequence_enrollments")
                .select("id, lead_id, sequence_id, current_step, status, sequences(name)")
                .in("status", ["active", "paused", "completed"])

            if (enrollErr) {
                if (!enrollErr.message?.includes("does not exist")) {
                    console.warn("[useEnrollmentSummary]", enrollErr.message)
                }
                setData([])
                return
            }

            if (!enrollments || enrollments.length === 0) {
                setData([])
                return
            }

            // Fetch step counts per sequence
            const sequenceIds = [...new Set(enrollments.map((e: Record<string, unknown>) => e.sequence_id as string))]
            const stepCounts: Record<string, number> = {}

            for (const seqId of sequenceIds) {
                const { count } = await supabase
                    .from("sequence_steps")
                    .select("*", { count: "exact", head: true })
                    .eq("sequence_id", seqId)

                stepCounts[seqId] = count || 0
            }

            const summaries: EnrollmentSummary[] = enrollments.map((row: Record<string, unknown>) => {
                const seqData = row.sequences as Record<string, unknown> | null
                return {
                    leadId: row.lead_id as string,
                    sequenceId: row.sequence_id as string,
                    sequenceName: (seqData?.name as string) || "Unknown",
                    currentStep: (row.current_step ?? 0) as number,
                    totalSteps: stepCounts[row.sequence_id as string] || 0,
                    status: (row.status ?? "active") as string,
                }
            })

            setData(summaries)
        } catch {
            setData([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Build a map: leadId -> most recent active enrollment (or completed if no active)
    const enrollmentMap = useMemo(() => {
        const map = new Map<string, EnrollmentSummary>()
        // Sort: active first, then by currentStep descending
        const sorted = [...data].sort((a, b) => {
            if (a.status === "active" && b.status !== "active") return -1
            if (b.status === "active" && a.status !== "active") return 1
            return b.currentStep - a.currentStep
        })
        for (const summary of sorted) {
            if (!map.has(summary.leadId)) {
                map.set(summary.leadId, summary)
            }
        }
        return map
    }, [data])

    return { enrollmentMap, loading, refetch: fetchData }
}

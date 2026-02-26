"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import { calculateScore, type ScoreResult } from "@/lib/scoring"
import type { ReviewField, ReviewFieldConfig } from "@/hooks/use-review-templates"

// ─── Types (re-exported for all consumers) ───

export type CallBucket = "top" | "bottom" | null

export interface RankedCall {
    reviewId: string
    attemptId: string
    callSessionId: string | null
    score: ScoreResult
    /** @deprecated Use score.total instead. Kept for backward compat during migration. */
    quickScore: number
    responses: Record<string, unknown>
    reviewedAt: string
    callBucket: CallBucket
    // Lead info
    companyName: string | null
    leadId: string | null
    outcome: string | null
    phone: string | null
    stage: string | null
    segment: string | null
    isDecisionMaker: string | null
    dealValue: number | null
    // Session
    recordingUrl: string | null
    transcriptText: string | null
    // Experiment context
    experimentId: string | null
    experimentName: string | null
    variantName: string | null
}

export interface RankedCallsData {
    allRanked: RankedCall[]
    topCalls: RankedCall[]
    bottomCalls: RankedCall[]
    bucketCounts: { top: number; bottom: number }
    fieldDefs: ReviewField[]
    stats: {
        avgScore: number
        totalReviewed: number
        maxScore: number
        minScore: number
    } | null
}

// ─── Fetcher ───

async function fetchRankedCalls(
    projectId: string,
): Promise<{ rows: RankedCall[]; fieldDefs: ReviewField[] }> {
    const supabase = getSupabase()

    // 1. Fetch active quick template fields for scoring + column rendering
    const { data: templates } = await supabase
        .from("review_templates")
        .select("id")
        .eq("project_id", projectId)
        .in("applies_to", ["quick", "both"])
        .eq("is_active", true)
        .limit(1)

    let fields: ReviewField[] = []
    if (templates && templates.length > 0) {
        const templateId = (templates[0] as Record<string, unknown>).id as string
        const { data: fData } = await supabase
            .from("review_fields")
            .select("*")
            .eq("template_id", templateId)
            .order("sort_order", { ascending: true })

        if (fData) {
            fields = fData.map((f: Record<string, unknown>) => ({
                id: f.id as string,
                key: f.key as string,
                label: f.label as string,
                fieldType: f.field_type as ReviewField["fieldType"],
                section: (f.section ?? null) as string | null,
                config: (f.config ?? {}) as ReviewFieldConfig,
                sortOrder: (f.sort_order ?? 0) as number,
                isRequired: (f.is_required ?? false) as boolean,
            }))
        }
    }

    // 2. Fetch all quick reviews with lead info
    const { data, error } = await supabase
        .from("call_reviews")
        .select(`
            id, attempt_id, call_session_id, responses, created_at, call_bucket,
            attempts!call_reviews_attempt_id_fkey (
                id, lead_id, outcome, experiment_id,
                leads!attempts_lead_id_fkey (
                    company, phone, stage, segment,
                    is_decision_maker, deal_value
                ),
                experiments!attempts_experiment_id_fkey (
                    id, name
                ),
                experiment_variants!attempts_variant_id_fkey (
                    name
                )
            ),
            call_sessions!call_reviews_call_session_id_fkey (
                recording_url, transcript_text
            )
        `)
        .eq("project_id", projectId)
        .eq("review_type", "quick")
        .order("created_at", { ascending: false })
        .limit(100)

    if (error) {
        console.warn("[rankedCalls] join query failed, trying fallback:", error.message)
        // Fallback: no joins
        const { data: fb } = await supabase
            .from("call_reviews")
            .select("id, attempt_id, call_session_id, responses, created_at, call_bucket")
            .eq("project_id", projectId)
            .eq("review_type", "quick")
            .order("created_at", { ascending: false })
            .limit(100)

        if (fb) {
            const mapped = fb.map((r: Record<string, unknown>) => {
                const scoreResult = calculateScore(r.responses as Record<string, unknown>, fields)
                return {
                    reviewId: r.id as string,
                    attemptId: r.attempt_id as string,
                    callSessionId: (r.call_session_id as string) ?? null,
                    score: scoreResult,
                    quickScore: scoreResult.total,
                    responses: (r.responses as Record<string, unknown>) ?? {},
                    reviewedAt: r.created_at as string,
                    callBucket: (r.call_bucket as CallBucket) ?? null,
                    companyName: null, leadId: null, outcome: null,
                    phone: null, stage: null, segment: null,
                    isDecisionMaker: null, dealValue: null,
                    recordingUrl: null, transcriptText: null,
                    experimentId: null, experimentName: null, variantName: null,
                }
            })
            mapped.sort((a, b) => b.score.total - a.score.total)
            return { rows: mapped, fieldDefs: fields }
        }
        return { rows: [], fieldDefs: fields }
    }

    if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: RankedCall[] = data.map((r: any) => {
            const attempt = r.attempts
            const lead = attempt?.leads
            const session = r.call_sessions
            const experiment = attempt?.experiments
            const variant = attempt?.experiment_variants
            const scoreResult = calculateScore(r.responses as Record<string, unknown>, fields)
            return {
                reviewId: r.id as string,
                attemptId: r.attempt_id as string,
                callSessionId: (r.call_session_id as string) ?? null,
                score: scoreResult,
                quickScore: scoreResult.total,
                responses: (r.responses as Record<string, unknown>) ?? {},
                reviewedAt: r.created_at as string,
                callBucket: (r.call_bucket as CallBucket) ?? null,
                companyName: lead?.company ?? null,
                leadId: attempt?.lead_id ?? null,
                outcome: attempt?.outcome ?? null,
                phone: lead?.phone ?? null,
                stage: lead?.stage ?? null,
                segment: lead?.segment ?? null,
                isDecisionMaker: lead?.is_decision_maker ?? null,
                dealValue: lead?.deal_value ?? null,
                recordingUrl: session?.recording_url ?? null,
                transcriptText: session?.transcript_text ?? null,
                experimentId: experiment?.id ?? null,
                experimentName: experiment?.name ?? null,
                variantName: variant?.name ?? null,
            }
        })
        mapped.sort((a, b) => b.score.total - a.score.total)
        return { rows: mapped, fieldDefs: fields }
    }

    return { rows: [], fieldDefs: fields }
}

// ─── Shared Query Hook (single cache for all consumers) ───

export function useRankedCallsQuery() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.rankedCalls(projectId ?? "__none__"),
        queryFn: () => fetchRankedCalls(projectId!),
        enabled: !!projectId,
    })

    const data = useMemo((): RankedCallsData => {
        const rows = query.data?.rows ?? []
        const fieldDefs = query.data?.fieldDefs ?? []
        const topCalls = rows.filter(c => c.callBucket === "top")
        const bottomCalls = rows.filter(c => c.callBucket === "bottom")
        const bucketCounts = { top: topCalls.length, bottom: bottomCalls.length }

        let stats: RankedCallsData["stats"] = null
        if (rows.length > 0) {
            const scores = rows.map(c => c.score.total)
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length
            stats = {
                avgScore: Math.round(avg * 10) / 10,
                totalReviewed: rows.length,
                maxScore: Math.max(...scores),
                minScore: Math.min(...scores),
            }
        }

        return { allRanked: rows, topCalls, bottomCalls, bucketCounts, fieldDefs, stats }
    }, [query.data])

    const refetch = query.refetch

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.rankedCalls(projectId ?? "__none__") })

    return {
        ...data,
        loading: query.isLoading,
        refetch,
        invalidate,
    }
}

"use client"

import { useState, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"

export interface CallReview {
    id: string
    callSessionId: string | null
    attemptId: string | null
    reviewType: "quick" | "deep"
    // Quick fields
    tags: string[]
    marketInsight: string | null
    promoteToPlaybook: boolean
    // Deep fields
    scoreOpening: number | null
    scoreDiscovery: number | null
    scoreControl: number | null
    scoreObjections: number | null
    scoreClose: number | null
    scoreNextStep: number | null
    totalScore: number | null
    whatWorked: string | null
    whatFailed: string | null
    coachingNotes: string | null
    // Meta
    createdAt: string
    projectId: string
}

interface QuickReviewInput {
    attemptId: string
    callSessionId?: string
    tags: string[]
    marketInsight?: string
    promoteToPlaybook: boolean
}

interface DeepReviewInput {
    attemptId: string
    callSessionId?: string
    scoreOpening: number
    scoreDiscovery: number
    scoreControl: number
    scoreObjections: number
    scoreClose: number
    scoreNextStep: number
    whatWorked?: string
    whatFailed?: string
    coachingNotes?: string
}

function mapRow(row: Record<string, unknown>): CallReview {
    return {
        id: row.id as string,
        callSessionId: (row.call_session_id ?? null) as string | null,
        attemptId: (row.attempt_id ?? null) as string | null,
        reviewType: row.review_type as "quick" | "deep",
        tags: (row.tags ?? []) as string[],
        marketInsight: (row.market_insight ?? null) as string | null,
        promoteToPlaybook: (row.promote_to_playbook ?? false) as boolean,
        scoreOpening: (row.score_opening ?? null) as number | null,
        scoreDiscovery: (row.score_discovery ?? null) as number | null,
        scoreControl: (row.score_control ?? null) as number | null,
        scoreObjections: (row.score_objections ?? null) as number | null,
        scoreClose: (row.score_close ?? null) as number | null,
        scoreNextStep: (row.score_next_step ?? null) as number | null,
        totalScore: (row.total_score ?? null) as number | null,
        whatWorked: (row.what_worked ?? null) as string | null,
        whatFailed: (row.what_failed ?? null) as string | null,
        coachingNotes: (row.coaching_notes ?? null) as string | null,
        createdAt: (row.created_at ?? new Date().toISOString()) as string,
        projectId: row.project_id as string,
    }
}

export function useCallReviews() {
    const projectId = useProjectId()
    const [saving, setSaving] = useState(false)

    const saveQuickReview = useCallback(async (input: QuickReviewInput): Promise<CallReview | null> => {
        if (!projectId) return null
        setSaving(true)
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("call_reviews")
                .insert([{
                    attempt_id: input.attemptId,
                    call_session_id: input.callSessionId || null,
                    review_type: "quick",
                    tags: input.tags,
                    market_insight: input.marketInsight || null,
                    promote_to_playbook: input.promoteToPlaybook,
                    project_id: projectId,
                }])
                .select()
                .single()

            if (error) {
                console.error("[useCallReviews] Quick save failed:", error.message)
                return null
            }
            return data ? mapRow(data as Record<string, unknown>) : null
        } finally {
            setSaving(false)
        }
    }, [projectId])

    const saveDeepReview = useCallback(async (input: DeepReviewInput): Promise<CallReview | null> => {
        if (!projectId) return null
        setSaving(true)
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("call_reviews")
                .insert([{
                    attempt_id: input.attemptId,
                    call_session_id: input.callSessionId || null,
                    review_type: "deep",
                    score_opening: input.scoreOpening,
                    score_discovery: input.scoreDiscovery,
                    score_control: input.scoreControl,
                    score_objections: input.scoreObjections,
                    score_close: input.scoreClose,
                    score_next_step: input.scoreNextStep,
                    what_worked: input.whatWorked || null,
                    what_failed: input.whatFailed || null,
                    coaching_notes: input.coachingNotes || null,
                    project_id: projectId,
                }])
                .select()
                .single()

            if (error) {
                console.error("[useCallReviews] Deep save failed:", error.message)
                return null
            }
            return data ? mapRow(data as Record<string, unknown>) : null
        } finally {
            setSaving(false)
        }
    }, [projectId])

    return { saveQuickReview, saveDeepReview, saving }
}

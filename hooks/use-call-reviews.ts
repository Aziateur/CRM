"use client"

import { useState, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"

// ─── Types ───

export interface EvidenceSnippet {
    fieldKey: string
    text: string
    startTs?: number | null
    endTs?: number | null
    transcriptLines?: number[]
}

export interface QuickReviewInput {
    attemptId: string
    callSessionId?: string
    tags: string[]
    marketInsight?: string
    promoteToPlaybook: boolean
    evidenceVerified: boolean
}

export interface DeepReviewInput {
    attemptId: string
    callSessionId?: string
    templateId: string
    templateVersion: number
    responses: Record<string, unknown>        // field_key → value (score number, text string, etc.)
    evidenceSnippets?: EvidenceSnippet[]
    evidenceVerified: boolean
}

// Legacy deep review input (backward compat during transition)
export interface LegacyDeepReviewInput {
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

// ─── Hook ───

export function useCallReviews() {
    const projectId = useProjectId()
    const [saving, setSaving] = useState(false)

    const saveQuickReview = useCallback(
        async (input: QuickReviewInput) => {
            if (!projectId) return null
            setSaving(true)
            try {
                const supabase = getSupabase()
                const { data, error } = await supabase
                    .from("call_reviews")
                    .insert([
                        {
                            attempt_id: input.attemptId,
                            call_session_id: input.callSessionId || null,
                            review_type: "quick",
                            tags: input.tags,
                            market_insight: input.marketInsight || null,
                            promote_to_playbook: input.promoteToPlaybook,
                            evidence_verified: input.evidenceVerified,
                            project_id: projectId,
                        },
                    ])
                    .select()
                    .single()

                if (error) {
                    console.error("[useCallReviews] Quick save failed:", error.message)
                    return null
                }
                return data
            } finally {
                setSaving(false)
            }
        },
        [projectId],
    )

    // Template-driven deep review save
    const saveDeepReview = useCallback(
        async (input: DeepReviewInput) => {
            if (!projectId) return null
            setSaving(true)
            try {
                const supabase = getSupabase()

                // Also write the legacy score columns for backward compat with analytics
                const responses = input.responses
                const legacyScores: Record<string, unknown> = {}
                const legacyMap: Record<string, string> = {
                    opening: "score_opening",
                    discovery: "score_discovery",
                    control: "score_control",
                    objections: "score_objections",
                    close: "score_close",
                    next_step: "score_next_step",
                }
                for (const [key, col] of Object.entries(legacyMap)) {
                    if (typeof responses[key] === "number") {
                        legacyScores[col] = responses[key]
                    }
                }
                if (typeof responses["what_worked"] === "string") {
                    legacyScores["what_worked"] = responses["what_worked"]
                }
                if (typeof responses["what_failed"] === "string") {
                    legacyScores["what_failed"] = responses["what_failed"]
                }
                if (typeof responses["coaching_notes"] === "string") {
                    legacyScores["coaching_notes"] = responses["coaching_notes"]
                }

                const { data, error } = await supabase
                    .from("call_reviews")
                    .insert([
                        {
                            attempt_id: input.attemptId,
                            call_session_id: input.callSessionId || null,
                            review_type: "deep",
                            template_id: input.templateId,
                            template_version: input.templateVersion,
                            responses: input.responses,
                            evidence_snippets: input.evidenceSnippets ?? [],
                            evidence_verified: input.evidenceVerified,
                            ...legacyScores,
                            project_id: projectId,
                        },
                    ])
                    .select()
                    .single()

                if (error) {
                    console.error("[useCallReviews] Deep save failed:", error.message)
                    return null
                }
                return data
            } finally {
                setSaving(false)
            }
        },
        [projectId],
    )

    return { saveQuickReview, saveDeepReview, saving }
}

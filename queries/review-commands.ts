"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import type { CallBucket, RankedCall } from "@/queries/ranked-calls"

// ─── Types ───

export type DecisionType = "rule_draft" | "experiment" | "drill" | "no_decision"

export interface EvidenceSnippet {
    fieldKey: string
    text: string
    startTs?: number | null
    endTs?: number | null
    transcriptLines?: number[]
}

export interface CreateQuickReviewInput {
    attemptId: string
    callSessionId?: string
    tags: string[]
    marketInsight?: string
    promoteToPlaybook: boolean
    evidenceVerified: boolean
    decisionType?: DecisionType
    decisionPayload?: Record<string, unknown>
    templateId?: string
    templateVersion?: number
    responses?: Record<string, unknown>
    callBucket?: CallBucket
}

export interface CreateDeepReviewInput {
    attemptId: string
    callSessionId?: string
    templateId: string
    templateVersion: number
    responses: Record<string, unknown>
    evidenceSnippets?: EvidenceSnippet[]
    evidenceVerified: boolean
    decisionType: DecisionType
    decisionPayload: Record<string, unknown>
}

export interface SetBucketInput {
    reviewId: string
    bucket: CallBucket
}

// ─── Mutation: Create Quick Review ───

export function useCreateQuickReview() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateQuickReviewInput) => {
            if (!projectId) throw new Error("No project selected")
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
                    evidence_verified: input.evidenceVerified,
                    decision_type: input.decisionType || null,
                    decision_payload: input.decisionPayload || {},
                    template_id: input.templateId || null,
                    template_version: input.templateVersion || null,
                    responses: input.responses || null,
                    call_bucket: input.callBucket || null,
                    project_id: projectId,
                }])
                .select()
                .single()

            if (error) {
                console.error("[createQuickReview] failed:", error.message)
                throw new Error(error.message)
            }
            return data
        },
        onSuccess: () => {
            // Invalidate ranked calls → triggers automatic refetch → table + counts update
            queryClient.invalidateQueries({ queryKey: queryKeys.rankedCalls(projectId ?? "") })
        },
    })
}

// ─── Mutation: Set Review Bucket ───

export function useSetReviewBucket() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ reviewId, bucket }: SetBucketInput) => {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("call_reviews")
                .update({ call_bucket: bucket })
                .eq("id", reviewId)

            if (error) {
                console.error("[setReviewBucket] failed:", error.message, error.details, error.hint, error.code)
                throw new Error(error.message)
            }
            return { reviewId, bucket }
        },
        // Optimistic update: patch the specific row in cache immediately
        onMutate: async ({ reviewId, bucket }) => {
            const key = queryKeys.rankedCalls(projectId ?? "")
            await queryClient.cancelQueries({ queryKey: key })
            const previous = queryClient.getQueryData(key)

            queryClient.setQueryData(key, (old: { rows: RankedCall[]; fieldDefs: unknown } | undefined) => {
                if (!old) return old
                return {
                    ...old,
                    rows: old.rows.map(c =>
                        c.reviewId === reviewId ? { ...c, callBucket: bucket } : c
                    ),
                }
            })

            return { previous }
        },
        onError: (_err, _vars, context) => {
            // Rollback on error
            if (context?.previous) {
                queryClient.setQueryData(
                    queryKeys.rankedCalls(projectId ?? ""),
                    context.previous,
                )
            }
            alert(`Failed to update bucket: ${_err.message}`)
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: queryKeys.rankedCalls(projectId ?? "") })
        },
    })
}

// ─── Mutation: Create Deep Review ───

export function useCreateDeepReview() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateDeepReviewInput) => {
            if (!projectId) throw new Error("No project selected")
            const supabase = getSupabase()

            // Write legacy score columns for backward compat
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
            if (typeof responses["what_worked"] === "string") legacyScores["what_worked"] = responses["what_worked"]
            if (typeof responses["what_failed"] === "string") legacyScores["what_failed"] = responses["what_failed"]
            if (typeof responses["coaching_notes"] === "string") legacyScores["coaching_notes"] = responses["coaching_notes"]

            const { data, error } = await supabase
                .from("call_reviews")
                .insert([{
                    attempt_id: input.attemptId,
                    call_session_id: input.callSessionId || null,
                    review_type: "deep",
                    template_id: input.templateId,
                    template_version: input.templateVersion,
                    responses: input.responses,
                    evidence_snippets: input.evidenceSnippets ?? [],
                    evidence_verified: input.evidenceVerified,
                    decision_type: input.decisionType,
                    decision_payload: input.decisionPayload,
                    ...legacyScores,
                    project_id: projectId,
                }])
                .select()
                .single()

            if (error) {
                console.error("[createDeepReview] failed:", error.message)
                throw new Error(error.message)
            }
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rankedCalls(projectId ?? "") })
        },
    })
}

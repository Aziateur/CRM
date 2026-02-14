"use client"

import { useState, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"

// ─── Types ───

export interface PromotionInput {
    attemptId: string
    callSessionId?: string
    snippetText?: string
    timestampStart?: number
    timestampEnd?: number
    // Path A: create new rule
    newRule?: {
        ifWhen: string
        thenAction: string
        because: string
        confidence: "hypothesis" | "tested" | "proven"
    }
    // Path B: attach to existing rule
    existingRuleId?: string
    // Optional: link to the review that triggered this
    sourceReviewId?: string
}

export interface ActiveRule {
    id: string
    ifWhen: string
    thenAction: string
    confidence: string
}

// ─── Hook ───

export function usePlaybookPromotion() {
    const projectId = useProjectId()
    const [promoting, setPromoting] = useState(false)

    // Fetch active rules for "Attach to Existing" dropdown
    const fetchActiveRules = useCallback(async (): Promise<ActiveRule[]> => {
        if (!projectId) return []
        const supabase = getSupabase()
        const { data } = await supabase
            .from("rules")
            .select("id, if_when, then_action, confidence")
            .eq("project_id", projectId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })

        if (!data) return []
        return (data as Record<string, unknown>[]).map((r) => ({
            id: r.id as string,
            ifWhen: (r.if_when || "") as string,
            thenAction: (r.then_action || "") as string,
            confidence: (r.confidence || "hypothesis") as string,
        }))
    }, [projectId])

    // Promote: create rule or link evidence
    const promote = useCallback(
        async (input: PromotionInput): Promise<{ ruleId: string; evidenceId: string } | null> => {
            if (!projectId) return null
            setPromoting(true)
            try {
                const supabase = getSupabase()
                let ruleId: string

                if (input.newRule) {
                    // Path A: create a new draft rule
                    const { data: ruleData, error: ruleErr } = await supabase
                        .from("rules")
                        .insert({
                            if_when: input.newRule.ifWhen,
                            then_action: input.newRule.thenAction,
                            because: input.newRule.because,
                            confidence: input.newRule.confidence,
                            is_active: true,
                            source_review_id: input.sourceReviewId || null,
                            project_id: projectId,
                        })
                        .select("id")
                        .single()

                    if (ruleErr || !ruleData) {
                        console.error("[usePlaybookPromotion] Rule creation failed:", ruleErr?.message)
                        return null
                    }
                    ruleId = (ruleData as Record<string, unknown>).id as string
                } else if (input.existingRuleId) {
                    ruleId = input.existingRuleId
                } else {
                    console.error("[usePlaybookPromotion] No rule specified")
                    return null
                }

                // Create evidence link (idempotent via UNIQUE constraint on rule_id+attempt_id)
                const { data: evData, error: evErr } = await supabase
                    .from("playbook_evidence")
                    .upsert(
                        {
                            rule_id: ruleId,
                            attempt_id: input.attemptId,
                            call_session_id: input.callSessionId || null,
                            snippet_text: input.snippetText || null,
                            timestamp_start: input.timestampStart || null,
                            timestamp_end: input.timestampEnd || null,
                            project_id: projectId,
                        },
                        { onConflict: "rule_id,attempt_id" },
                    )
                    .select("id")
                    .single()

                if (evErr || !evData) {
                    console.error("[usePlaybookPromotion] Evidence link failed:", evErr?.message)
                    return null
                }

                return {
                    ruleId,
                    evidenceId: (evData as Record<string, unknown>).id as string,
                }
            } finally {
                setPromoting(false)
            }
        },
        [projectId],
    )

    return { promote, fetchActiveRules, promoting }
}

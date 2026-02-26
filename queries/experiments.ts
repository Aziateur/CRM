"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"

// ─── Types (re-exported for all consumers) ───

export interface ExperimentVariant {
    id: string
    experimentId: string
    name: string
    description: string
    isControl: boolean
    protocol: string
}

export type ExperimentStatus = "draft" | "active" | "paused" | "completed"
export type ExperimentMetric = "dm_engagement" | "meeting_set" | "follow_up_accepted" | "custom"
export type ConclusionType = "adopt" | "iterate" | "discard"

export interface Experiment {
    id: string
    name: string
    hypothesis: string
    primaryMetric: ExperimentMetric
    successDefinition: string
    sampleSizeTarget: number
    status: ExperimentStatus
    scope: Record<string, unknown>
    protocol: string
    conclusion: string | null
    conclusionType: ConclusionType | null
    winnerVariantId: string | null
    promotedRuleId: string | null
    sourceReviewId: string | null
    projectId: string
    createdAt: string
    completedAt: string | null
    variants: ExperimentVariant[]
}

export interface CreateExperimentInput {
    name: string
    hypothesis: string
    primaryMetric: ExperimentMetric
    successDefinition?: string
    sampleSizeTarget?: number
    scope?: Record<string, unknown>
    protocol?: string
    sourceReviewId?: string
    variants: { name: string; description?: string; isControl: boolean; protocol?: string }[]
}

export interface ExperimentStats {
    total: number
    byVariant: { variantId: string; variantName: string; isControl: boolean; count: number }[]
}

// ─── Fetcher ───

async function fetchExperiments(projectId: string): Promise<Experiment[]> {
    const supabase = getSupabase()

    const { data: exps, error } = await supabase
        .from("experiments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

    if (error) {
        console.error("[experiments] fetch failed:", error.message)
        return []
    }

    const expIds = (exps ?? []).map((e: Record<string, unknown>) => e.id as string)
    let variants: Record<string, unknown>[] = []
    if (expIds.length > 0) {
        const { data: v } = await supabase
            .from("experiment_variants")
            .select("*")
            .in("experiment_id", expIds)
        if (v) variants = v
    }

    return (exps ?? []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        name: e.name as string,
        hypothesis: (e.hypothesis as string) || "",
        primaryMetric: (e.primary_metric as ExperimentMetric) || "dm_engagement",
        successDefinition: (e.success_definition as string) || "",
        sampleSizeTarget: (e.sample_size_target as number) || 100,
        status: (e.status as ExperimentStatus) || "draft",
        scope: (e.scope as Record<string, unknown>) || {},
        protocol: (e.protocol as string) || "",
        conclusion: (e.conclusion as string) || null,
        conclusionType: (e.conclusion_type as ConclusionType) || null,
        winnerVariantId: (e.winner_variant_id as string) || null,
        promotedRuleId: (e.promoted_rule_id as string) || null,
        sourceReviewId: (e.source_review_id as string) || null,
        projectId: e.project_id as string,
        createdAt: e.created_at as string,
        completedAt: (e.completed_at as string) || null,
        variants: variants
            .filter((v: Record<string, unknown>) => v.experiment_id === e.id)
            .map((v: Record<string, unknown>) => ({
                id: v.id as string,
                experimentId: v.experiment_id as string,
                name: v.name as string,
                description: (v.description as string) || "",
                isControl: (v.is_control as boolean) || false,
                protocol: (v.protocol as string) || "",
            })),
    }))
}

async function fetchExperimentStats(experimentId: string): Promise<ExperimentStats | null> {
    const supabase = getSupabase()

    const { data: variants } = await supabase
        .from("experiment_variants")
        .select("id, name, is_control")
        .eq("experiment_id", experimentId)

    if (!variants || variants.length === 0) return null

    const { data, error } = await supabase
        .from("attempts")
        .select("variant_id")
        .eq("experiment_id", experimentId)

    if (error || !data) return null

    const total = data.length
    const byVariant = variants.map((v: Record<string, unknown>) => ({
        variantId: v.id as string,
        variantName: v.name as string,
        isControl: (v.is_control as boolean) || false,
        count: data.filter((a: Record<string, unknown>) => a.variant_id === v.id).length,
    }))

    return { total, byVariant }
}

async function fetchExperimentAttempts(experimentId: string) {
    const supabase = getSupabase()

    const { data: variants } = await supabase
        .from("experiment_variants")
        .select("id, name, is_control")
        .eq("experiment_id", experimentId)

    if (!variants || variants.length === 0) return null

    const { data: attemptRows, error } = await supabase
        .from("attempts")
        .select(`
            id, outcome, dm_reached, timestamp, experiment_id, variant_id,
            leads!attempts_lead_id_fkey ( company, phone, stage, segment )
        `)
        .eq("experiment_id", experimentId)
        .order("timestamp", { ascending: false })

    if (error || !attemptRows) return null

    const variantMap = new Map(variants.map((v: Record<string, unknown>) => [v.id as string, {
        name: v.name as string,
        isControl: (v.is_control as boolean) || false,
    }]))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = attemptRows.map((a: any) => ({
        id: a.id as string,
        outcome: a.outcome as string | null,
        dmReached: (a.dm_reached as boolean) || false,
        timestamp: a.timestamp as string,
        variantId: a.variant_id as string | null,
        variantName: variantMap.get(a.variant_id)?.name ?? "Unassigned",
        isControl: variantMap.get(a.variant_id)?.isControl ?? false,
        company: a.leads?.company ?? null,
        phone: a.leads?.phone ?? null,
        stage: a.leads?.stage ?? null,
        segment: a.leads?.segment ?? null,
    }))

    const variantStats = variants.map((v: Record<string, unknown>) => {
        const vAttempts = mapped.filter(a => a.variantId === v.id)
        const dmReached = vAttempts.filter(a => a.dmReached).length
        const interested = vAttempts.filter(a =>
            a.outcome === "Interested" || a.outcome === "Meeting Set"
        ).length
        return {
            variantId: v.id as string,
            variantName: v.name as string,
            isControl: (v.is_control as boolean) || false,
            total: vAttempts.length,
            dmReached,
            dmReachRate: vAttempts.length > 0 ? Math.round((dmReached / vAttempts.length) * 100) : 0,
            interested,
            interestRate: dmReached > 0 ? Math.round((interested / dmReached) * 100) : 0,
        }
    })

    return { attempts: mapped, variantStats, total: mapped.length }
}

// ─── Shared Query Hooks ───

export function useExperimentsQuery() {
    const projectId = useProjectId()

    const query = useQuery({
        queryKey: queryKeys.experiments(projectId ?? "__none__"),
        queryFn: () => fetchExperiments(projectId!),
        enabled: !!projectId,
    })

    const experiments = query.data ?? []
    const activeExperiments = useMemo(() =>
        experiments.filter(e => e.status === "active"),
        [experiments]
    )

    return {
        experiments,
        activeExperiments,
        loading: query.isLoading,
        refetch: query.refetch,
    }
}

export function useExperimentStatsQuery(experimentId: string | null) {
    return useQuery({
        queryKey: queryKeys.experimentStats(experimentId ?? "__none__"),
        queryFn: () => fetchExperimentStats(experimentId!),
        enabled: !!experimentId,
    })
}

/**
 * Fetch stats for all visible experiments (replaces the fetchAllStats pattern).
 */
export function useGetExperimentStats() {
    return {
        getStats: fetchExperimentStats,
    }
}

/**
 * Fetch attempt data when expanding an experiment.
 */
export function useGetExperimentAttempts() {
    return {
        getAttempts: fetchExperimentAttempts,
    }
}

// ─── Mutations ───

export function useCreateExperiment() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateExperimentInput): Promise<Experiment> => {
            if (!projectId) throw new Error("No project selected")
            const supabase = getSupabase()

            const { data: exp, error } = await supabase
                .from("experiments")
                .insert([{
                    name: input.name,
                    hypothesis: input.hypothesis,
                    primary_metric: input.primaryMetric,
                    success_definition: input.successDefinition || "",
                    sample_size_target: input.sampleSizeTarget || 100,
                    scope: input.scope || {},
                    protocol: input.protocol || "",
                    source_review_id: input.sourceReviewId || null,
                    project_id: projectId,
                    status: "active",
                    active: true,
                }])
                .select()
                .single()

            if (error || !exp) {
                throw new Error(error?.message || "Unknown error creating experiment")
            }

            const variantRows = input.variants.map(v => ({
                experiment_id: exp.id,
                name: v.name,
                description: v.description || "",
                is_control: v.isControl,
                protocol: v.protocol || "",
                project_id: projectId,
            }))

            const { data: vars } = await supabase
                .from("experiment_variants")
                .insert(variantRows)
                .select()

            const result: Experiment = {
                id: exp.id,
                name: exp.name,
                hypothesis: exp.hypothesis || "",
                primaryMetric: exp.primary_metric || "dm_engagement",
                successDefinition: exp.success_definition || "",
                sampleSizeTarget: exp.sample_size_target || 100,
                status: "active",
                scope: exp.scope || {},
                protocol: exp.protocol || "",
                conclusion: null,
                conclusionType: null,
                winnerVariantId: null,
                promotedRuleId: null,
                sourceReviewId: exp.source_review_id || null,
                projectId: exp.project_id,
                createdAt: exp.created_at,
                completedAt: null,
                variants: (vars ?? []).map((v: Record<string, unknown>) => ({
                    id: v.id as string,
                    experimentId: v.experiment_id as string,
                    name: v.name as string,
                    description: (v.description as string) || "",
                    isControl: (v.is_control as boolean) || false,
                    protocol: (v.protocol as string) || "",
                })),
            }

            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.experiments(projectId ?? "") })
        },
    })
}

export function useUpdateExperimentStatus() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: {
            id: string
            status: ExperimentStatus
            conclusion?: string
            conclusionType?: ConclusionType
        }) => {
            const supabase = getSupabase()
            const update: Record<string, unknown> = { status: params.status }
            if (params.conclusion) update.conclusion = params.conclusion
            if (params.conclusionType) update.conclusion_type = params.conclusionType
            if (params.status === "completed") update.completed_at = new Date().toISOString()

            const { error } = await supabase
                .from("experiments")
                .update(update)
                .eq("id", params.id)

            if (error) throw new Error(error.message)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.experiments(projectId ?? "") })
        },
    })
}

/**
 * Conclude an experiment with full conclusion data:
 * winner variant, summary, optional rule promotion.
 */
export function useConcludeExperiment() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: {
            experimentId: string
            winnerVariantId: string | null
            conclusionType: ConclusionType
            conclusionSummary: string
        }) => {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("experiments")
                .update({
                    status: "completed" as ExperimentStatus,
                    completed_at: new Date().toISOString(),
                    winner_variant_id: params.winnerVariantId,
                    conclusion_type: params.conclusionType,
                    conclusion: params.conclusionSummary,
                })
                .eq("id", params.experimentId)

            if (error) throw new Error(error.message)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.experiments(projectId ?? "") })
        },
    })
}

/**
 * Promote an experiment conclusion to a playbook rule.
 * Creates the rule and links it back to the experiment.
 */
export function usePromoteExperimentToRule() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: {
            experimentId: string
            ifWhen: string
            thenAction: string
            because: string
            confidence: "hypothesis" | "tested" | "proven"
        }) => {
            if (!projectId) throw new Error("No project selected")
            const supabase = getSupabase()

            // 1. Create the rule
            const { data: rule, error: ruleErr } = await supabase
                .from("rules")
                .insert({
                    if_when: params.ifWhen,
                    then_action: params.thenAction,
                    because: params.because,
                    confidence: params.confidence,
                    is_active: true,
                    source_experiment_id: params.experimentId,
                    project_id: projectId,
                })
                .select("id")
                .single()

            if (ruleErr || !rule) throw new Error(ruleErr?.message || "Failed to create rule")

            // 2. Link rule back to experiment
            await supabase
                .from("experiments")
                .update({ promoted_rule_id: rule.id })
                .eq("id", params.experimentId)

            return { ruleId: rule.id as string }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.experiments(projectId ?? "") })
        },
    })
}

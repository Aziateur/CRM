"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import { getSupabase } from "@/lib/supabase"
import {
    type Investigation,
    type InvestigationStatus,
    type Priority,
    type DeploymentReceiptEntry,
    type SignalStatus,
    INVESTIGATION_STATUSES,
    SIGNAL_STATUSES,
} from "@/lib/investigations"
import type { ScriptInboxItem } from "@/hooks/use-playbook-engine"

// ─── Row Mapper ───

function rowToInvestigation(row: Record<string, unknown>): Investigation {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        title: row.title as string,
        status: (row.status as InvestigationStatus) ?? INVESTIGATION_STATUSES.OPEN,
        hypothesis: (row.hypothesis as string) ?? null,
        scratchpad: (row.scratchpad as string) ?? null,
        priority: (row.priority as Priority) ?? "medium",
        deploymentReceipt: (row.deployment_receipt as DeploymentReceiptEntry[]) ?? null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        crystallizedAt: (row.crystallized_at as string) ?? null,
        signalCount: (row.signal_count as number) ?? undefined,
    }
}

// ─── List Investigations ───

export function useInvestigations(statusFilter?: InvestigationStatus) {
    const projectId = useProjectId()
    const queryClient = useQueryClient()
    const supabase = getSupabase()

    const query = useQuery({
        queryKey: queryKeys.investigations(projectId ?? "", statusFilter),
        queryFn: async () => {
            // Fetch investigations with signal count via subquery
            let q = supabase
                .from("investigations")
                .select("*, script_inbox(count)")
                .eq("project_id", projectId!)
                .order("created_at", { ascending: false })
            if (statusFilter) q = q.eq("status", statusFilter)
            const { data, error } = await q
            if (error) throw error
            return (data ?? []).map((row: Record<string, unknown>) => {
                // script_inbox(count) returns [{count: N}]
                const countArr = row.script_inbox as Array<{ count: number }> | null
                const signalCount = countArr?.[0]?.count ?? 0
                return { ...rowToInvestigation(row), signalCount }
            })
        },
        enabled: !!projectId,
        staleTime: 15_000,
    })

    // ─── Create Investigation ───
    const createInvestigation = useMutation({
        mutationFn: async (input: { title: string; priority?: Priority }) => {
            const { data, error } = await supabase
                .from("investigations")
                .insert({
                    project_id: projectId!,
                    title: input.title.trim(),
                    priority: input.priority ?? "medium",
                })
                .select("*")
                .single()
            if (error) throw error
            return rowToInvestigation(data)
        },
        onSuccess: () => invalidateAll(queryClient, projectId),
    })

    return {
        investigations: query.data ?? [],
        openCount: (query.data ?? []).filter(
            i => i.status === INVESTIGATION_STATUSES.OPEN
        ).length,
        isLoading: query.isLoading,
        createInvestigation,
    }
}

// ─── Single Investigation Detail (with attached signals) ───

export function useInvestigation(investigationId: string | null) {
    const projectId = useProjectId()
    const queryClient = useQueryClient()
    const supabase = getSupabase()

    // Fetch the investigation
    const investigationQuery = useQuery({
        queryKey: queryKeys.investigation(investigationId ?? ""),
        queryFn: async () => {
            const { data, error } = await supabase
                .from("investigations")
                .select("*")
                .eq("id", investigationId!)
                .single()
            if (error) throw error
            return rowToInvestigation(data)
        },
        enabled: !!investigationId,
        staleTime: 10_000,
    })

    // Fetch attached signals
    const signalsQuery = useQuery({
        queryKey: [...queryKeys.investigation(investigationId ?? ""), "signals"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("script_inbox")
                .select("*")
                .eq("investigation_id", investigationId!)
                .order("created_at", { ascending: false })
            if (error) throw error
            // Map using the same pattern as use-playbook-engine
            return (data ?? []).map((row: Record<string, unknown>) => ({
                id: row.id as string,
                projectId: row.project_id as string,
                sourceAttemptId: (row.source_attempt_id as string) ?? null,
                sourceRepNote: (row.source_rep_note as string) ?? null,
                rawTranscript: row.raw_transcript as string,
                targetScriptId: (row.target_script_id as string) ?? null,
                targetSectionId: (row.target_section_id as string) ?? null,
                status: (row.status as SignalStatus) ?? SIGNAL_STATUSES.INCUBATING,
                synthesizedText: (row.synthesized_text as string) ?? null,
                reviewedBy: (row.reviewed_by as string) ?? null,
                reviewedAt: (row.reviewed_at as string) ?? null,
                createdAt: row.created_at as string,
                investigationId: (row.investigation_id as string) ?? null,
                pillar: null,
                prescriptionType: null,
                prescriptionId: null,
            })) as ScriptInboxItem[]
        },
        enabled: !!investigationId,
        staleTime: 10_000,
    })

    // ─── Update Scratchpad (debounced call from UI) ───
    const updateScratchpad = useMutation({
        mutationFn: async ({ scratchpad }: { scratchpad: string }) => {
            const { error } = await supabase
                .from("investigations")
                .update({ scratchpad, updated_at: new Date().toISOString() })
                .eq("id", investigationId!)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.investigation(investigationId ?? ""),
            })
        },
    })

    // ─── Update Hypothesis ───
    const updateHypothesis = useMutation({
        mutationFn: async ({ hypothesis }: { hypothesis: string }) => {
            const { error } = await supabase
                .from("investigations")
                .update({ hypothesis, updated_at: new Date().toISOString() })
                .eq("id", investigationId!)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.investigation(investigationId ?? ""),
            })
        },
    })

    // ─── Update Title ───
    const updateTitle = useMutation({
        mutationFn: async ({ title }: { title: string }) => {
            const { error } = await supabase
                .from("investigations")
                .update({ title: title.trim(), updated_at: new Date().toISOString() })
                .eq("id", investigationId!)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.investigation(investigationId ?? ""),
            })
            invalidateAll(queryClient, projectId)
        },
    })

    // ─── Update Priority ───
    const updatePriority = useMutation({
        mutationFn: async ({ priority }: { priority: Priority }) => {
            const { error } = await supabase
                .from("investigations")
                .update({ priority, updated_at: new Date().toISOString() })
                .eq("id", investigationId!)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.investigation(investigationId ?? ""),
            })
            invalidateAll(queryClient, projectId)
        },
    })

    // ─── Unpin a signal (send it back to inbox) ───
    const unpinSignal = useMutation({
        mutationFn: async (signalId: string) => {
            const { error } = await supabase
                .from("script_inbox")
                .update({
                    status: SIGNAL_STATUSES.PENDING,
                    investigation_id: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", signalId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.investigation(investigationId ?? ""),
            })
            queryClient.invalidateQueries({
                queryKey: queryKeys.scriptInbox(projectId ?? "", "pending"),
            })
            invalidateAll(queryClient, projectId)
        },
    })

    // ─── Crystallize & Deploy ───
    const crystallize = useMutation({
        mutationFn: async ({ receipt }: { receipt: DeploymentReceiptEntry[] }) => {
            // 1. Archive the investigation
            const { error: invError } = await supabase
                .from("investigations")
                .update({
                    status: INVESTIGATION_STATUSES.CRYSTALLIZED,
                    deployment_receipt: receipt,
                    crystallized_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", investigationId!)
            if (invError) throw invError

            // 2. Mark all attached signals as deployed
            const { error: sigError } = await supabase
                .from("script_inbox")
                .update({
                    status: SIGNAL_STATUSES.DEPLOYED,
                    reviewed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("investigation_id", investigationId!)
            if (sigError) throw sigError
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.investigation(investigationId ?? ""),
            })
            invalidateAll(queryClient, projectId)
        },
    })

    // ─── Delete investigation (only if open) ───
    const deleteInvestigation = useMutation({
        mutationFn: async () => {
            // Unpin all signals first
            await supabase
                .from("script_inbox")
                .update({
                    status: SIGNAL_STATUSES.PENDING,
                    investigation_id: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("investigation_id", investigationId!)

            const { error } = await supabase
                .from("investigations")
                .delete()
                .eq("id", investigationId!)
            if (error) throw error
        },
        onSuccess: () => {
            invalidateAll(queryClient, projectId)
            queryClient.invalidateQueries({
                queryKey: queryKeys.scriptInbox(projectId ?? "", "pending"),
            })
        },
    })

    return {
        investigation: investigationQuery.data ?? null,
        signals: signalsQuery.data ?? [],
        isLoading: investigationQuery.isLoading || signalsQuery.isLoading,
        updateScratchpad,
        updateHypothesis,
        updateTitle,
        updatePriority,
        unpinSignal,
        crystallize,
        deleteInvestigation,
    }
}

// ─── Shared invalidation ───

function invalidateAll(
    queryClient: ReturnType<typeof useQueryClient>,
    projectId: string | null,
) {
    queryClient.invalidateQueries({
        queryKey: queryKeys.investigations(projectId ?? ""),
    })
}

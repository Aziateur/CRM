"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import { getSupabase } from "@/lib/supabase"
import {
    type SignalStatus,
    type PillarId,
    type InboxPrescriptionType as PrescriptionType,
    SIGNAL_STATUSES,
} from "@/lib/investigations"

// ─── Types ───

export interface Drill {
    id: string
    projectId: string
    name: string
    triggerType: string
    instructions: string
    script: string | null
    durationCount: number
    successMetric: string
    isActive: boolean
    createdAt: string
}

export interface StopSignal {
    id: string
    projectId: string
    name: string
    description: string
    triggerCondition: string
    threshold: number
    windowSize: number
    recommendedDrillId: string | null
    isActive: boolean
}

export type InboxPillar = PillarId
export type InboxPrescriptionType = PrescriptionType

export interface ScriptInboxItem {
    id: string
    projectId: string
    sourceAttemptId: string | null
    sourceRepNote: string | null
    rawTranscript: string
    targetScriptId: string | null
    targetSectionId: string | null
    status: SignalStatus
    synthesizedText: string | null
    reviewedBy: string | null
    reviewedAt: string | null
    createdAt: string
    investigationId: string | null
    // ─── 4-Pillar diagnostic fields ───
    pillar: InboxPillar | null
    prescriptionType: InboxPrescriptionType | null
    prescriptionId: string | null
}

// ─── Row mappers ───

function rowToDrill(row: Record<string, unknown>): Drill {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        name: row.name as string,
        triggerType: (row.trigger_type as string) ?? "manual",
        instructions: row.instructions as string,
        script: (row.script as string) ?? null,
        durationCount: (row.duration_count as number) ?? 10,
        successMetric: (row.success_metric as string) ?? "",
        isActive: (row.is_active as boolean) ?? true,
        createdAt: row.created_at as string,
    }
}

function rowToSignal(row: Record<string, unknown>): StopSignal {
    return {
        id: row.id as string,
        projectId: (row.project_id as string) ?? "",
        name: row.name as string,
        description: (row.description as string) ?? "",
        triggerCondition: (row.trigger_condition as string) ?? "",
        threshold: (row.threshold as number) ?? 5,
        windowSize: (row.window_size as number) ?? 30,
        recommendedDrillId: (row.recommended_drill_id as string) ?? null,
        isActive: (row.is_active as boolean) ?? true,
    }
}

function rowToInboxItem(row: Record<string, unknown>): ScriptInboxItem {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        sourceAttemptId: (row.source_attempt_id as string) ?? null,
        sourceRepNote: (row.source_rep_note as string) ?? null,
        rawTranscript: row.raw_transcript as string,
        targetScriptId: (row.target_script_id as string) ?? null,
        targetSectionId: (row.target_section_id as string) ?? null,
        status: (row.status as SignalStatus) ?? SIGNAL_STATUSES.PENDING,
        synthesizedText: (row.synthesized_text as string) ?? null,
        reviewedBy: (row.reviewed_by as string) ?? null,
        reviewedAt: (row.reviewed_at as string) ?? null,
        createdAt: row.created_at as string,
        investigationId: (row.investigation_id as string) ?? null,
        // ─── 4-Pillar diagnostic fields ───
        pillar: (row.pillar as InboxPillar) ?? null,
        prescriptionType: (row.prescription_type as InboxPrescriptionType) ?? null,
        prescriptionId: (row.prescription_id as string) ?? null,
    }
}

// ─── Drills Hook ───

export function useDrills() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()
    const supabase = getSupabase()

    const query = useQuery({
        queryKey: queryKeys.drills(projectId ?? ""),
        queryFn: async () => {
            const { data, error } = await supabase
                .from("drills")
                .select("*")
                .eq("project_id", projectId!)
                .order("created_at", { ascending: false })
            if (error) throw error
            return (data ?? []).map(rowToDrill)
        },
        enabled: !!projectId,
        staleTime: 30_000,
    })

    const addDrill = useMutation({
        mutationFn: async (input: {
            name: string
            triggerType?: string
            instructions: string
            script?: string
            durationCount?: number
            successMetric: string
        }) => {
            const { data, error } = await supabase
                .from("drills")
                .insert({
                    project_id: projectId!,
                    name: input.name,
                    trigger_type: input.triggerType ?? "manual",
                    instructions: input.instructions,
                    script: input.script ?? null,
                    duration_count: input.durationCount ?? 10,
                    success_metric: input.successMetric,
                    is_active: true,
                })
                .select("*")
                .single()
            if (error) throw error
            return rowToDrill(data)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.drills(projectId ?? "") }),
    })

    const editDrill = useMutation({
        mutationFn: async ({ id, updates }: {
            id: string
            updates: Partial<Pick<Drill, "name" | "triggerType" | "instructions" | "script" | "durationCount" | "successMetric" | "isActive">>
        }) => {
            const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
            if (updates.name !== undefined) row.name = updates.name
            if (updates.triggerType !== undefined) row.trigger_type = updates.triggerType
            if (updates.instructions !== undefined) row.instructions = updates.instructions
            if (updates.script !== undefined) row.script = updates.script
            if (updates.durationCount !== undefined) row.duration_count = updates.durationCount
            if (updates.successMetric !== undefined) row.success_metric = updates.successMetric
            if (updates.isActive !== undefined) row.is_active = updates.isActive

            const { data, error } = await supabase
                .from("drills")
                .update(row)
                .eq("id", id)
                .select("*")
                .single()
            if (error) throw error
            return rowToDrill(data)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.drills(projectId ?? "") }),
    })

    const removeDrill = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("drills").delete().eq("id", id)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.drills(projectId ?? "") }),
    })

    return {
        drills: query.data ?? [],
        isLoading: query.isLoading,
        addDrill,
        editDrill,
        removeDrill,
    }
}

// ─── Stop Signals Hook ───

export function useStopSignals() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()
    const supabase = getSupabase()

    const query = useQuery({
        queryKey: queryKeys.stopSignals(projectId ?? ""),
        queryFn: async () => {
            const { data, error } = await supabase
                .from("stop_signals")
                .select("*")
                .eq("project_id", projectId!)
                .order("created_at", { ascending: false })
            if (error) throw error
            return (data ?? []).map(rowToSignal)
        },
        enabled: !!projectId,
        staleTime: 30_000,
    })

    const addSignal = useMutation({
        mutationFn: async (input: {
            name: string
            description?: string
            triggerCondition: string
            threshold?: number
            windowSize?: number
            recommendedDrillId?: string | null
        }) => {
            const { data, error } = await supabase
                .from("stop_signals")
                .insert({
                    project_id: projectId!,
                    name: input.name,
                    description: input.description ?? "",
                    trigger_condition: input.triggerCondition,
                    threshold: input.threshold ?? 5,
                    window_size: input.windowSize ?? 30,
                    recommended_drill_id: input.recommendedDrillId ?? null,
                    is_active: true,
                })
                .select("*")
                .single()
            if (error) throw error
            return rowToSignal(data)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stopSignals(projectId ?? "") }),
    })

    const editSignal = useMutation({
        mutationFn: async ({ id, updates }: {
            id: string
            updates: Partial<Pick<StopSignal, "name" | "description" | "triggerCondition" | "threshold" | "windowSize" | "recommendedDrillId" | "isActive">>
        }) => {
            const row: Record<string, unknown> = {}
            if (updates.name !== undefined) row.name = updates.name
            if (updates.description !== undefined) row.description = updates.description
            if (updates.triggerCondition !== undefined) row.trigger_condition = updates.triggerCondition
            if (updates.threshold !== undefined) row.threshold = updates.threshold
            if (updates.windowSize !== undefined) row.window_size = updates.windowSize
            if (updates.recommendedDrillId !== undefined) row.recommended_drill_id = updates.recommendedDrillId
            if (updates.isActive !== undefined) row.is_active = updates.isActive

            const { data, error } = await supabase
                .from("stop_signals")
                .update(row)
                .eq("id", id)
                .select("*")
                .single()
            if (error) throw error
            return rowToSignal(data)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stopSignals(projectId ?? "") }),
    })

    const removeSignal = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("stop_signals").delete().eq("id", id)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stopSignals(projectId ?? "") }),
    })

    return {
        signals: query.data ?? [],
        isLoading: query.isLoading,
        addSignal,
        editSignal,
        removeSignal,
    }
}

// ─── Script Inbox Hook ───

export function useScriptInbox(statusFilter?: ScriptInboxItem["status"]) {
    const projectId = useProjectId()
    const queryClient = useQueryClient()
    const supabase = getSupabase()

    const query = useQuery({
        queryKey: queryKeys.scriptInbox(projectId ?? "", statusFilter ?? "all"),
        queryFn: async () => {
            let q = supabase
                .from("script_inbox")
                .select("*")
                .eq("project_id", projectId!)
                .order("created_at", { ascending: false })
            if (statusFilter) q = q.eq("status", statusFilter)
            const { data, error } = await q
            if (error) throw error
            return (data ?? []).map(rowToInboxItem)
        },
        enabled: !!projectId,
        staleTime: 15_000,
    })

    const addToInbox = useMutation({
        mutationFn: async (input: {
            rawTranscript: string
            sourceRepNote?: string
            sourceAttemptId?: string
            targetScriptId?: string
            targetSectionId?: string
        }) => {
            const { data, error } = await supabase
                .from("script_inbox")
                .insert({
                    project_id: projectId!,
                    raw_transcript: input.rawTranscript,
                    source_rep_note: input.sourceRepNote ?? null,
                    source_attempt_id: input.sourceAttemptId ?? null,
                    target_script_id: input.targetScriptId ?? null,
                    target_section_id: input.targetSectionId ?? null,
                    status: "pending",
                })
                .select("*")
                .single()
            if (error) throw error
            return rowToInboxItem(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scriptInbox(projectId ?? "", "pending") })
            queryClient.invalidateQueries({ queryKey: queryKeys.scriptInbox(projectId ?? "", "all") })
        },
    })

    const updateInboxItem = useMutation({
        mutationFn: async ({ id, updates }: {
            id: string
            updates: Partial<Pick<ScriptInboxItem, "synthesizedText" | "status" | "targetScriptId" | "targetSectionId">>
        }) => {
            const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
            if (updates.synthesizedText !== undefined) row.synthesized_text = updates.synthesizedText
            if (updates.status !== undefined) row.status = updates.status
            if (updates.targetScriptId !== undefined) row.target_script_id = updates.targetScriptId
            if (updates.targetSectionId !== undefined) row.target_section_id = updates.targetSectionId

            const { data, error } = await supabase
                .from("script_inbox")
                .update(row)
                .eq("id", id)
                .select("*")
                .single()
            if (error) throw error
            return rowToInboxItem(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scriptInbox(projectId ?? "", "pending") })
            queryClient.invalidateQueries({ queryKey: queryKeys.scriptInbox(projectId ?? "", "all") })
        },
    })

    // ─── resolveInboxItem — the single authoritative write path for all 4-Pillar triage decisions ───
    // Writes: status, pillar, prescription_type, prescription_id, reviewed_at
    // Called by every PrescriptionForm variant after successfully writing to its destination.
    const resolveInboxItem = useMutation({
        mutationFn: async ({
            id,
            status = SIGNAL_STATUSES.DEPLOYED as SignalStatus,
            pillar,
            prescriptionType,
            prescriptionId,
            synthesizedText,
        }: {
            id: string
            status?: ScriptInboxItem["status"]
            pillar: InboxPillar
            prescriptionType: InboxPrescriptionType
            prescriptionId?: string
            synthesizedText?: string
        }) => {
            const { data, error } = await supabase
                .from("script_inbox")
                .update({
                    status,
                    pillar,
                    prescription_type: prescriptionType,
                    prescription_id: prescriptionId ?? null,
                    synthesized_text: synthesizedText ?? null,
                    reviewed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .select("*")
                .single()
            if (error) throw error
            return rowToInboxItem(data)
        },
        onSuccess: () => {
            // Bust both the "pending" slice (removes item from queue)
            // and the "all" slice (updates the audit log view)
            queryClient.invalidateQueries({ queryKey: queryKeys.scriptInbox(projectId ?? "", "pending") })
            queryClient.invalidateQueries({ queryKey: queryKeys.scriptInbox(projectId ?? "", "all") })
        },
    })

    // ─── Incubate: pin signal to an investigation ───
    const incubateSignal = useMutation({
        mutationFn: async ({ id, investigationId }: { id: string; investigationId: string }) => {
            const { data, error } = await supabase
                .from("script_inbox")
                .update({
                    status: SIGNAL_STATUSES.INCUBATING,
                    investigation_id: investigationId,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .select("*")
                .single()
            if (error) throw error
            return rowToInboxItem(data)
        },
        onSuccess: () => invalidateAll(),
    })

    // ─── Discard: kill noise ───
    const discardSignal = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("script_inbox")
                .update({
                    status: SIGNAL_STATUSES.DISCARDED,
                    reviewed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
            if (error) throw error
        },
        onSuccess: () => invalidateAll(),
    })

    // ─── Quick Deploy: fast-track a single-pillar fix ───
    const quickDeploySignal = useMutation({
        mutationFn: async ({
            id,
            pillar,
            prescriptionType,
            prescriptionId,
            synthesizedText,
        }: {
            id: string
            pillar: InboxPillar
            prescriptionType: InboxPrescriptionType
            prescriptionId?: string
            synthesizedText?: string
        }) => {
            const { data, error } = await supabase
                .from("script_inbox")
                .update({
                    status: SIGNAL_STATUSES.QUICK_DEPLOYED,
                    pillar,
                    prescription_type: prescriptionType,
                    prescription_id: prescriptionId ?? null,
                    synthesized_text: synthesizedText ?? null,
                    reviewed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .select("*")
                .single()
            if (error) throw error
            return rowToInboxItem(data)
        },
        onSuccess: () => invalidateAll(),
    })

    function invalidateAll() {
        queryClient.invalidateQueries({ queryKey: queryKeys.scriptInbox(projectId ?? "", "pending") })
        queryClient.invalidateQueries({ queryKey: queryKeys.scriptInbox(projectId ?? "", "all") })
    }

    return {
        items: query.data ?? [],
        pendingCount: (query.data ?? []).filter(i => i.status === SIGNAL_STATUSES.PENDING).length,
        isLoading: query.isLoading,
        addToInbox,
        updateInboxItem,
        resolveInboxItem,
        incubateSignal,
        discardSignal,
        quickDeploySignal,
    }
}

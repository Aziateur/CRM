"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import {
    fetchScripts,
    createScript,
    updateScript,
    deleteScript,
    fetchScriptSections,
    createScriptSection,
    updateScriptSection,
    deleteScriptSection,
    reorderScriptSections,
    type KbScript,
    type KbScriptSection,
} from "@/lib/scripts"

export function useScripts() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.scripts(projectId ?? ""),
        queryFn: () => fetchScripts(projectId!),
        enabled: !!projectId,
        staleTime: 30_000,
    })

    const addScript = useMutation({
        mutationFn: (input: {
            title: string
            description?: string
            segmentId?: string | null
            stageId?: string | null
            isPinned?: boolean
            tags?: string[]
        }) => createScript(projectId!, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scripts(projectId ?? "") })
        },
    })

    const editScript = useMutation({
        mutationFn: ({ id, updates }: {
            id: string
            updates: Partial<Pick<KbScript, "title" | "description" | "summary" | "segmentId" | "stageId" | "isPinned" | "tags" | "sortOrder" | "isActive" | "timesUsed">>
        }) => updateScript(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scripts(projectId ?? "") })
        },
    })

    const removeScript = useMutation({
        mutationFn: (id: string) => deleteScript(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scripts(projectId ?? "") })
        },
    })

    return {
        scripts: query.data ?? [],
        activeScripts: (query.data ?? []).filter((s) => s.isActive),
        isLoading: query.isLoading,
        addScript,
        editScript,
        removeScript,
    }
}

// ─── Script Sections Hook ───

export function useScriptSections(scriptId: string | null) {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.scriptSections(scriptId ?? ""),
        queryFn: () => fetchScriptSections(scriptId!),
        enabled: !!scriptId,
        staleTime: 30_000,
    })

    const addSection = useMutation({
        mutationFn: (input: {
            sectionTypeId: string
            title?: string
            content?: string
            sortOrder?: number
            metadata?: Record<string, unknown>
        }) => createScriptSection(projectId!, scriptId!, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scriptSections(scriptId ?? "") })
        },
    })

    const editSection = useMutation({
        mutationFn: ({ id, updates }: {
            id: string
            updates: Partial<Pick<KbScriptSection, "title" | "content" | "sortOrder" | "isActive" | "sectionTypeId" | "metadata">>
        }) => updateScriptSection(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scriptSections(scriptId ?? "") })
        },
    })

    const removeSection = useMutation({
        mutationFn: (id: string) => deleteScriptSection(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scriptSections(scriptId ?? "") })
        },
    })

    const reorderSections = useMutation({
        mutationFn: (sectionIds: string[]) => reorderScriptSections(sectionIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scriptSections(scriptId ?? "") })
        },
    })

    return {
        sections: query.data ?? [],
        activeSections: (query.data ?? []).filter((s) => s.isActive),
        isLoading: query.isLoading,
        addSection,
        editSection,
        removeSection,
        reorderSections,
    }
}

export type { KbScript, KbScriptSection }

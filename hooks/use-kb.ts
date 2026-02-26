"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import {
    fetchKbCategories,
    fetchKbEntries,
    createKbCategory,
    updateKbCategory,
    deleteKbCategory,
    createKbEntry,
    updateKbEntry,
    deleteKbEntry,
    createKbEntryPart,
    updateKbEntryPart,
    deleteKbEntryPart,
    type KbCategory,
    type KbEntry,
    type KbEntryPart,
    type DisplayMode,
} from "@/lib/kb"

// ─── Categories ───

export function useKbCategories() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.kbCategories(projectId ?? ""),
        queryFn: () => fetchKbCategories(projectId!),
        enabled: !!projectId,
        staleTime: 60_000,
    })

    const addCategory = useMutation({
        mutationFn: (input: { name: string; icon?: string; displayMode?: DisplayMode }) =>
            createKbCategory(projectId!, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.kbCategories(projectId ?? "") })
        },
    })

    const editCategory = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<KbCategory, "name" | "icon" | "displayMode" | "isActive" | "showInPrep" | "sortOrder">> }) =>
            updateKbCategory(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.kbCategories(projectId ?? "") })
        },
    })

    const removeCategory = useMutation({
        mutationFn: (id: string) => deleteKbCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.kbCategories(projectId ?? "") })
            queryClient.invalidateQueries({ queryKey: queryKeys.kbEntries(projectId ?? "") })
        },
    })

    return {
        categories: query.data ?? [],
        activeCategories: (query.data ?? []).filter(c => c.isActive),
        prepCategories: (query.data ?? []).filter(c => c.isActive && c.showInPrep),
        isLoading: query.isLoading,
        addCategory,
        editCategory,
        removeCategory,
    }
}

// ─── Entries ───

export function useKbEntries() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.kbEntries(projectId ?? ""),
        queryFn: () => fetchKbEntries(projectId!),
        enabled: !!projectId,
        staleTime: 30_000,
    })

    const addEntry = useMutation({
        mutationFn: (input: {
            categoryId: string
            title: string
            content?: string
            tags?: string[]
            segmentFilter?: string | null
            stageFilter?: string | null
            industryFilter?: string | null
            sourceAttemptIds?: string[]
        }) => createKbEntry(projectId!, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.kbEntries(projectId ?? "") })
        },
    })

    const editEntry = useMutation({
        mutationFn: ({ id, updates }: {
            id: string
            updates: Partial<Pick<KbEntry, "title" | "content" | "tags" | "segmentFilter" | "stageFilter" | "industryFilter" | "sourceAttemptIds" | "isPinned" | "sortOrder" | "categoryId">>
        }) => updateKbEntry(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.kbEntries(projectId ?? "") })
        },
    })

    const removeEntry = useMutation({
        mutationFn: (id: string) => deleteKbEntry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.kbEntries(projectId ?? "") })
        },
    })

    // ─── Parts ───

    const addPart = useMutation({
        mutationFn: ({ entryId, title, content }: { entryId: string; title: string; content?: string }) =>
            createKbEntryPart(entryId, { title, content }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.kbEntries(projectId ?? "") })
        },
    })

    const editPart = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<KbEntryPart, "title" | "content" | "sortOrder">> }) =>
            updateKbEntryPart(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.kbEntries(projectId ?? "") })
        },
    })

    const removePart = useMutation({
        mutationFn: (id: string) => deleteKbEntryPart(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.kbEntries(projectId ?? "") })
        },
    })

    return {
        entries: query.data ?? [],
        isLoading: query.isLoading,
        addEntry,
        editEntry,
        removeEntry,
        addPart,
        editPart,
        removePart,
    }
}

// ─── Convenience: entries filtered for Call Prep ───

export function useKbForPrep(segment?: string, stage?: string) {
    const { entries } = useKbEntries()
    const { prepCategories } = useKbCategories()

    const prepCategoryIds = new Set(prepCategories.map(c => c.id))

    const filtered = entries.filter(entry => {
        // Must belong to a prep-visible category
        if (!prepCategoryIds.has(entry.categoryId)) return false
        // Pinned entries always show
        if (entry.isPinned) return true
        // Filter by segment/stage if set on the entry
        if (entry.segmentFilter && segment && entry.segmentFilter !== segment) return false
        if (entry.stageFilter && stage && entry.stageFilter !== stage) return false
        // No filters = show everywhere
        return true
    })

    return { prepEntries: filtered, prepCategories }
}

export type { KbCategory, KbEntry, KbEntryPart, DisplayMode }

"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import {
    fetchSegmentEntries,
    fetchPinnedSegmentEntries,
    createSegmentEntry,
    updateSegmentEntry,
    deleteSegmentEntry,
    type SegmentEntry,
} from "@/lib/segment-entries"

export function useSegmentEntries(segmentId: string | null) {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.segmentEntries(projectId ?? "", segmentId ?? ""),
        queryFn: () => fetchSegmentEntries(projectId!, segmentId!),
        enabled: !!projectId && !!segmentId,
        staleTime: 30_000,
    })

    const addEntry = useMutation({
        mutationFn: (input: {
            sectionTypeId: string
            title?: string
            content: string
            source?: string
            tags?: string[]
            isPinned?: boolean
        }) => createSegmentEntry(projectId!, {
            segmentId: segmentId!,
            ...input,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.segmentEntries(projectId ?? "", segmentId ?? "") })
        },
    })

    const editEntry = useMutation({
        mutationFn: ({ id, updates }: {
            id: string
            updates: Partial<Pick<SegmentEntry, "title" | "content" | "source" | "tags" | "isPinned" | "sortOrder">>
        }) => updateSegmentEntry(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.segmentEntries(projectId ?? "", segmentId ?? "") })
        },
    })

    const removeEntry = useMutation({
        mutationFn: (id: string) => deleteSegmentEntry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.segmentEntries(projectId ?? "", segmentId ?? "") })
        },
    })

    return {
        entries: query.data ?? [],
        isLoading: query.isLoading,
        addEntry,
        editEntry,
        removeEntry,
    }
}

export type { SegmentEntry }

// ─── Hook: all pinned segment entries project-wide (pre-call briefing) ───

export function usePinnedSegmentEntries() {
    const projectId = useProjectId()

    const query = useQuery({
        queryKey: queryKeys.pinnedSegmentEntries(projectId ?? ""),
        queryFn: () => fetchPinnedSegmentEntries(projectId!),
        enabled: !!projectId,
        staleTime: 60_000,
    })

    return {
        entries: query.data ?? [],
        isLoading: query.isLoading,
    }
}

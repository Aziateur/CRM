"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectId } from "@/hooks/use-project-id"
import { useCategories } from "@/hooks/use-categories"
import { queryKeys } from "@/lib/query-keys"
import {
    fetchIntelEntries,
    fetchSegmentIntel,
    fetchOfferEntries,
    createIntelEntry,
    updateIntelEntry,
    upsertSingleValue,
    deleteIntelEntry,
    type IntelEntry,
    type Altitude,
} from "@/lib/intel"

// ─── Intel Entries (altitude-scoped) ───

export function useIntelEntries(altitude: Altitude, scopeId: string | null) {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: [...queryKeys.base(projectId ?? ""), "intel", altitude, scopeId],
        queryFn: () => fetchIntelEntries(projectId!, altitude, scopeId!),
        enabled: !!projectId && !!scopeId,
        staleTime: 30_000,
    })

    const addEntry = useMutation({
        mutationFn: (input: {
            intelCategoryId: string
            title?: string | null
            content: string
            industryId?: string
            segmentId?: string
            tags?: string[]
            source?: string
            sourceAttemptIds?: string[]
        }) =>
            createIntelEntry(projectId!, {
                altitude,
                industryId: input.industryId ?? (altitude === 1 ? scopeId! : undefined),
                segmentId: input.segmentId ?? (altitude !== 1 ? scopeId! : undefined),
                ...input,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.base(projectId ?? ""), "intel"],
            })
        },
    })

    const editEntry = useMutation({
        mutationFn: ({
            id,
            updates,
        }: {
            id: string
            updates: Partial<Pick<IntelEntry, "title" | "content" | "tags" | "source" | "isPinned" | "sortOrder">>
        }) => updateIntelEntry(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.base(projectId ?? ""), "intel"],
            })
        },
    })

    const removeEntry = useMutation({
        mutationFn: (id: string) => deleteIntelEntry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.base(projectId ?? ""), "intel"],
            })
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

// ─── Segment Intel (altitude 2 + 3 combined) ───

export function useSegmentIntel(segmentId: string | null) {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: [...queryKeys.base(projectId ?? ""), "intel", "segment-all", segmentId],
        queryFn: () => fetchSegmentIntel(projectId!, segmentId!),
        enabled: !!projectId && !!segmentId,
        staleTime: 30_000,
    })

    const addEntry = useMutation({
        mutationFn: (input: {
            altitude: Altitude
            intelCategoryId: string
            title?: string | null
            content: string
            tags?: string[]
            source?: string
            sourceAttemptIds?: string[]
        }) => {
            const { altitude: alt, ...rest } = input
            return createIntelEntry(projectId!, {
                altitude: alt,
                segmentId: segmentId!,
                ...rest,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.base(projectId ?? ""), "intel"],
            })
        },
    })

    const editEntry = useMutation({
        mutationFn: ({
            id,
            updates,
        }: {
            id: string
            updates: Partial<Pick<IntelEntry, "title" | "content" | "tags" | "source" | "isPinned" | "sortOrder">>
        }) => updateIntelEntry(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.base(projectId ?? ""), "intel"],
            })
        },
    })

    const removeEntry = useMutation({
        mutationFn: (id: string) => deleteIntelEntry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.base(projectId ?? ""), "intel"],
            })
        },
    })

    // Upsert single-value (firmographic field)
    const saveSingleValue = useMutation({
        mutationFn: ({ intelCategoryId, value }: { intelCategoryId: string; value: string }) =>
            upsertSingleValue(projectId!, segmentId!, intelCategoryId, value),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.base(projectId ?? ""), "intel"],
            })
        },
    })

    return {
        entries: query.data ?? [],
        isLoading: query.isLoading,
        addEntry,
        editEntry,
        removeEntry,
        saveSingleValue,
    }
}

// ─── Intel Categories by Altitude ───

export function useIntelCategories(altitude?: Altitude) {
    const { activeCategories } = useCategories("intel_category")

    if (altitude === undefined) {
        return { categories: activeCategories }
    }

    const filtered = activeCategories.filter(c => {
        // Use the first-class altitude column (falls back to metadata for compat)
        const catAlt = c.altitude ?? c.metadata?.altitude
        return Number(catAlt) === altitude
    })

    const singleValue = filtered.filter(c => c.cardinality === "single")
    const multiEntry = filtered.filter(c => c.cardinality !== "single")

    return { categories: filtered, singleValue, multiEntry }
}

// ─── Industries ───

export function useIndustries() {
    const { activeCategories } = useCategories("industry")
    return { industries: activeCategories }
}

export type { IntelEntry, Altitude }

// ─── Offer Levels ───

export function useOfferLevels() {
    const { activeCategories: levels } = useCategories("offer_level")
    return { levels }
}

// ─── Offer Entries (grouped by offer_category, filtered by offer_level) ───

export function useOfferEntries(offerLevelId?: string) {
    const projectId = useProjectId()
    const queryClient = useQueryClient()
    const { activeCategories: offerCategories } = useCategories("offer_category")
    const categoryIds = offerCategories.map(c => c.id)

    const query = useQuery({
        queryKey: queryKeys.intelEntries(projectId ?? "", `offer-${offerLevelId ?? "all"}`),
        queryFn: () => fetchOfferEntries(projectId!, categoryIds, offerLevelId),
        enabled: !!projectId && categoryIds.length > 0,
        staleTime: 60_000,
    })

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.intelEntries(projectId ?? "", `offer-${offerLevelId ?? "all"}`) })

    return {
        entries: query.data ?? [],
        offerCategories,
        isLoading: query.isLoading,
        invalidate,
    }
}

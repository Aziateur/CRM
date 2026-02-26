"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import {
    fetchFrictionCategories,
    fetchFrictionLogs,
    createFrictionLog,
    createFrictionCategory,
    updateFrictionCategory,
    deleteFrictionCategory,
    type FrictionCategory,
    type FrictionLog,
    type CreateFrictionLogInput,
} from "@/lib/friction"

// ─── Categories Hook ───

export function useFrictionCategories() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.frictionCategories(projectId ?? ""),
        queryFn: () => fetchFrictionCategories(projectId!),
        enabled: !!projectId,
        staleTime: 60_000,
    })

    const addCategory = useMutation({
        mutationFn: ({ name, icon }: { name: string; icon?: string }) =>
            createFrictionCategory(projectId!, name, icon),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.frictionCategories(projectId ?? "") })
        },
    })

    const editCategory = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: { name?: string; icon?: string; isActive?: boolean; sortOrder?: number } }) =>
            updateFrictionCategory(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.frictionCategories(projectId ?? "") })
        },
    })

    const removeCategory = useMutation({
        mutationFn: (id: string) => deleteFrictionCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.frictionCategories(projectId ?? "") })
        },
    })

    return {
        categories: query.data ?? [],
        activeCategories: (query.data ?? []).filter(c => c.isActive),
        isLoading: query.isLoading,
        addCategory,
        editCategory,
        removeCategory,
    }
}

// ─── Friction Logs Hook ───

export function useFrictionLogs() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.frictionLogs(projectId ?? ""),
        queryFn: () => fetchFrictionLogs(projectId!),
        enabled: !!projectId,
        staleTime: 30_000,
    })

    const logFriction = useMutation({
        mutationFn: (input: Omit<CreateFrictionLogInput, "projectId">) =>
            createFrictionLog({ ...input, projectId: projectId! }),
        onMutate: async (input) => {
            const key = queryKeys.frictionLogs(projectId ?? "")
            await queryClient.cancelQueries({ queryKey: key })
            const previous = queryClient.getQueryData<FrictionLog[]>(key)

            // Optimistic: prepend a placeholder
            queryClient.setQueryData<FrictionLog[]>(key, (old = []) => [{
                id: `optimistic-${Date.now()}`,
                attemptId: input.attemptId ?? null,
                categoryId: input.categoryId,
                note: input.note ?? null,
                rootCauseId: input.rootCauseId ?? null,
                affectedComponent: null,
                resolutionAction: null,
                resolvedAt: null,
                projectId: projectId!,
                createdAt: new Date().toISOString(),
            }, ...old])

            return { previous }
        },
        onError: (_err, _input, context) => {
            if (context?.previous) {
                queryClient.setQueryData(
                    queryKeys.frictionLogs(projectId ?? ""),
                    context.previous,
                )
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.frictionLogs(projectId ?? "") })
        },
    })

    return {
        logs: query.data ?? [],
        isLoading: query.isLoading,
        logFriction,
    }
}

export type { FrictionCategory, FrictionLog }

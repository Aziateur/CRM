"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import {
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchTabConfig,
    updateTabConfig,
    type Category,
    type TabConfig,
} from "@/lib/categories"

// ─── Generic Categories Hook ───

export function useCategories(categoryType: string) {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.categories(projectId ?? "", categoryType),
        queryFn: () => fetchCategories(projectId!, categoryType),
        enabled: !!projectId,
        staleTime: 60_000,
    })

    const addCategory = useMutation({
        mutationFn: (input: { name: string; icon?: string; color?: string; description?: string; metadata?: Record<string, unknown> }) =>
            createCategory(projectId!, { ...input, categoryType }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.categories(projectId ?? "", categoryType) })
        },
    })

    const editCategory = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<Category, "name" | "icon" | "color" | "description" | "sortOrder" | "isActive" | "metadata">> }) =>
            updateCategory(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.categories(projectId ?? "", categoryType) })
        },
    })

    const removeCategory = useMutation({
        mutationFn: (id: string) => deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.categories(projectId ?? "", categoryType) })
        },
    })

    return {
        categories: query.data ?? [],
        activeCategories: (query.data ?? []).filter((c) => c.isActive),
        isLoading: query.isLoading,
        addCategory,
        editCategory,
        removeCategory,
    }
}

// ─── Tab Config Hook ───

export function useTabConfig() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.tabConfig(projectId ?? ""),
        queryFn: () => fetchTabConfig(projectId!),
        enabled: !!projectId,
        staleTime: 120_000,
    })

    const editTab = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<TabConfig, "label" | "sortOrder" | "isVisible">> }) =>
            updateTabConfig(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tabConfig(projectId ?? "") })
        },
    })

    const visibleTabs = (query.data ?? []).filter((t) => t.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)

    return {
        tabs: query.data ?? [],
        visibleTabs,
        isLoading: query.isLoading,
        editTab,
        getLabel: (slug: string) => {
            const tab = (query.data ?? []).find((t) => t.slug === slug)
            return tab?.label ?? slug
        },
    }
}

export type { Category, TabConfig }

"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import {
    fetchMetricDefinitions,
    createMetricDefinition,
    updateMetricDefinition,
    deleteMetricDefinition,
    fetchDashboardWidgets,
    createDashboardWidget,
    updateDashboardWidget,
    deleteDashboardWidget,
    fetchMetricGoals,
    createMetricGoal,
    updateMetricGoal,
    deleteMetricGoal,
    type MetricDefinition,
    type DashboardWidget,
    type MetricGoal,
} from "@/lib/metrics"

// ─── Metric Definitions Hook ───

export function useMetricDefinitions() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.metricDefinitions(projectId ?? ""),
        queryFn: () => fetchMetricDefinitions(projectId!),
        enabled: !!projectId,
        staleTime: 60_000,
    })

    const addMetric = useMutation({
        mutationFn: (input: {
            name: string
            slug: string
            description?: string
            unit?: string
            aggregation?: MetricDefinition["aggregation"]
            source?: MetricDefinition["source"]
            formula?: string
            color?: string
            icon?: string
        }) => createMetricDefinition(projectId!, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.metricDefinitions(projectId ?? "") })
        },
    })

    const editMetric = useMutation({
        mutationFn: ({ id, updates }: {
            id: string
            updates: Partial<Pick<MetricDefinition, "name" | "slug" | "description" | "unit" | "aggregation" | "source" | "formula" | "color" | "icon" | "isActive" | "sortOrder">>
        }) => updateMetricDefinition(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.metricDefinitions(projectId ?? "") })
        },
    })

    const removeMetric = useMutation({
        mutationFn: (id: string) => deleteMetricDefinition(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.metricDefinitions(projectId ?? "") })
        },
    })

    return {
        metrics: query.data ?? [],
        activeMetrics: (query.data ?? []).filter(m => m.isActive),
        isLoading: query.isLoading,
        addMetric,
        editMetric,
        removeMetric,
    }
}

// ─── Dashboard Widgets Hook ───

export function useDashboardWidgets() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.dashboardWidgets(projectId ?? ""),
        queryFn: () => fetchDashboardWidgets(projectId!),
        enabled: !!projectId,
        staleTime: 60_000,
    })

    const addWidget = useMutation({
        mutationFn: (input: {
            metricId?: string
            widgetType?: DashboardWidget["widgetType"]
            title: string
            description?: string
            span?: number
            config?: Record<string, unknown>
        }) => createDashboardWidget(projectId!, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardWidgets(projectId ?? "") })
        },
    })

    const editWidget = useMutation({
        mutationFn: ({ id, updates }: {
            id: string
            updates: Partial<Pick<DashboardWidget, "metricId" | "widgetType" | "title" | "description" | "span" | "sortOrder" | "config" | "isActive">>
        }) => updateDashboardWidget(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardWidgets(projectId ?? "") })
        },
    })

    const removeWidget = useMutation({
        mutationFn: (id: string) => deleteDashboardWidget(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardWidgets(projectId ?? "") })
        },
    })

    return {
        widgets: query.data ?? [],
        activeWidgets: (query.data ?? []).filter(w => w.isActive),
        isLoading: query.isLoading,
        addWidget,
        editWidget,
        removeWidget,
    }
}

// ─── Metric Goals Hook ───

export function useMetricGoals() {
    const projectId = useProjectId()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: queryKeys.metricGoals(projectId ?? ""),
        queryFn: () => fetchMetricGoals(projectId!),
        enabled: !!projectId,
        staleTime: 60_000,
    })

    const addGoal = useMutation({
        mutationFn: (input: {
            metricId: string
            period?: MetricGoal["period"]
            targetValue: number
            startDate: string
            endDate?: string
            notes?: string
        }) => createMetricGoal(projectId!, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.metricGoals(projectId ?? "") })
        },
    })

    const editGoal = useMutation({
        mutationFn: ({ id, updates }: {
            id: string
            updates: Partial<Pick<MetricGoal, "targetValue" | "period" | "startDate" | "endDate" | "notes">>
        }) => updateMetricGoal(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.metricGoals(projectId ?? "") })
        },
    })

    const removeGoal = useMutation({
        mutationFn: (id: string) => deleteMetricGoal(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.metricGoals(projectId ?? "") })
        },
    })

    return {
        goals: query.data ?? [],
        isLoading: query.isLoading,
        addGoal,
        editGoal,
        removeGoal,
    }
}

export type { MetricDefinition, DashboardWidget, MetricGoal }

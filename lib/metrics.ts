import { getSupabase } from "@/lib/supabase"

// ─── Types ───

export interface MetricDefinition {
    id: string
    projectId: string
    name: string
    slug: string
    description: string | null
    unit: string
    aggregation: "sum" | "avg" | "count" | "min" | "max" | "latest"
    source: "manual" | "computed" | "derived"
    formula: string | null
    color: string | null
    icon: string
    isActive: boolean
    sortOrder: number
    metadata: Record<string, unknown>
    createdAt: string
    updatedAt: string
}

export interface DashboardWidget {
    id: string
    projectId: string
    metricId: string | null
    widgetType: "kpi" | "chart_line" | "chart_bar" | "chart_pie" | "distribution" | "sparkline" | "table"
    title: string
    description: string | null
    span: number
    sortOrder: number
    config: Record<string, unknown>
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface MetricGoal {
    id: string
    projectId: string
    metricId: string
    period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
    targetValue: number
    startDate: string
    endDate: string | null
    notes: string | null
    createdAt: string
    updatedAt: string
}

// ─── Row mappers ───

function rowToMetric(row: Record<string, unknown>): MetricDefinition {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        name: row.name as string,
        slug: row.slug as string,
        description: (row.description as string) ?? null,
        unit: (row.unit as string) ?? "%",
        aggregation: (row.aggregation as MetricDefinition["aggregation"]) ?? "avg",
        source: (row.source as MetricDefinition["source"]) ?? "manual",
        formula: (row.formula as string) ?? null,
        color: (row.color as string) ?? null,
        icon: (row.icon as string) ?? "bar-chart",
        isActive: (row.is_active as boolean) ?? true,
        sortOrder: (row.sort_order as number) ?? 0,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }
}

function rowToWidget(row: Record<string, unknown>): DashboardWidget {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        metricId: (row.metric_id as string) ?? null,
        widgetType: (row.widget_type as DashboardWidget["widgetType"]) ?? "kpi",
        title: row.title as string,
        description: (row.description as string) ?? null,
        span: (row.span as number) ?? 1,
        sortOrder: (row.sort_order as number) ?? 0,
        config: (row.config as Record<string, unknown>) ?? {},
        isActive: (row.is_active as boolean) ?? true,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }
}

function rowToGoal(row: Record<string, unknown>): MetricGoal {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        metricId: row.metric_id as string,
        period: (row.period as MetricGoal["period"]) ?? "monthly",
        targetValue: (row.target_value as number) ?? 0,
        startDate: row.start_date as string,
        endDate: (row.end_date as string) ?? null,
        notes: (row.notes as string) ?? null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }
}

// ─── Metric Definitions CRUD ───

export async function fetchMetricDefinitions(projectId: string): Promise<MetricDefinition[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("metric_definitions")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
    if (error) throw error
    return (data ?? []).map(rowToMetric)
}

export async function createMetricDefinition(
    projectId: string,
    input: {
        name: string
        slug: string
        description?: string
        unit?: string
        aggregation?: MetricDefinition["aggregation"]
        source?: MetricDefinition["source"]
        formula?: string
        color?: string
        icon?: string
    }
): Promise<MetricDefinition> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("metric_definitions")
        .insert({
            project_id: projectId,
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            unit: input.unit ?? "%",
            aggregation: input.aggregation ?? "avg",
            source: input.source ?? "manual",
            formula: input.formula ?? null,
            color: input.color ?? null,
            icon: input.icon ?? "bar-chart",
        })
        .select("*")
        .single()
    if (error) throw error
    return rowToMetric(data)
}

export async function updateMetricDefinition(
    id: string,
    updates: Partial<Pick<MetricDefinition, "name" | "slug" | "description" | "unit" | "aggregation" | "source" | "formula" | "color" | "icon" | "isActive" | "sortOrder">>
): Promise<MetricDefinition> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.name !== undefined) row.name = updates.name
    if (updates.slug !== undefined) row.slug = updates.slug
    if (updates.description !== undefined) row.description = updates.description
    if (updates.unit !== undefined) row.unit = updates.unit
    if (updates.aggregation !== undefined) row.aggregation = updates.aggregation
    if (updates.source !== undefined) row.source = updates.source
    if (updates.formula !== undefined) row.formula = updates.formula
    if (updates.color !== undefined) row.color = updates.color
    if (updates.icon !== undefined) row.icon = updates.icon
    if (updates.isActive !== undefined) row.is_active = updates.isActive
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder

    const { data, error } = await supabase
        .from("metric_definitions")
        .update(row)
        .eq("id", id)
        .select("*")
        .single()
    if (error) throw error
    return rowToMetric(data)
}

export async function deleteMetricDefinition(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from("metric_definitions").delete().eq("id", id)
    if (error) throw error
}

// ─── Dashboard Widgets CRUD ───

export async function fetchDashboardWidgets(projectId: string): Promise<DashboardWidget[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("dashboard_widgets")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
    if (error) throw error
    return (data ?? []).map(rowToWidget)
}

export async function createDashboardWidget(
    projectId: string,
    input: {
        metricId?: string
        widgetType?: DashboardWidget["widgetType"]
        title: string
        description?: string
        span?: number
        config?: Record<string, unknown>
    }
): Promise<DashboardWidget> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("dashboard_widgets")
        .insert({
            project_id: projectId,
            metric_id: input.metricId ?? null,
            widget_type: input.widgetType ?? "kpi",
            title: input.title,
            description: input.description ?? null,
            span: input.span ?? 1,
            config: input.config ?? {},
        })
        .select("*")
        .single()
    if (error) throw error
    return rowToWidget(data)
}

export async function updateDashboardWidget(
    id: string,
    updates: Partial<Pick<DashboardWidget, "metricId" | "widgetType" | "title" | "description" | "span" | "sortOrder" | "config" | "isActive">>
): Promise<DashboardWidget> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.metricId !== undefined) row.metric_id = updates.metricId
    if (updates.widgetType !== undefined) row.widget_type = updates.widgetType
    if (updates.title !== undefined) row.title = updates.title
    if (updates.description !== undefined) row.description = updates.description
    if (updates.span !== undefined) row.span = updates.span
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder
    if (updates.config !== undefined) row.config = updates.config
    if (updates.isActive !== undefined) row.is_active = updates.isActive

    const { data, error } = await supabase
        .from("dashboard_widgets")
        .update(row)
        .eq("id", id)
        .select("*")
        .single()
    if (error) throw error
    return rowToWidget(data)
}

export async function deleteDashboardWidget(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from("dashboard_widgets").delete().eq("id", id)
    if (error) throw error
}

// ─── Metric Goals CRUD ───

export async function fetchMetricGoals(projectId: string): Promise<MetricGoal[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("metric_goals")
        .select("*")
        .eq("project_id", projectId)
        .order("start_date", { ascending: false })
    if (error) throw error
    return (data ?? []).map(rowToGoal)
}

export async function createMetricGoal(
    projectId: string,
    input: {
        metricId: string
        period?: MetricGoal["period"]
        targetValue: number
        startDate: string
        endDate?: string
        notes?: string
    }
): Promise<MetricGoal> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("metric_goals")
        .insert({
            project_id: projectId,
            metric_id: input.metricId,
            period: input.period ?? "monthly",
            target_value: input.targetValue,
            start_date: input.startDate,
            end_date: input.endDate ?? null,
            notes: input.notes ?? null,
        })
        .select("*")
        .single()
    if (error) throw error
    return rowToGoal(data)
}

export async function updateMetricGoal(
    id: string,
    updates: Partial<Pick<MetricGoal, "targetValue" | "period" | "startDate" | "endDate" | "notes">>
): Promise<MetricGoal> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.targetValue !== undefined) row.target_value = updates.targetValue
    if (updates.period !== undefined) row.period = updates.period
    if (updates.startDate !== undefined) row.start_date = updates.startDate
    if (updates.endDate !== undefined) row.end_date = updates.endDate
    if (updates.notes !== undefined) row.notes = updates.notes

    const { data, error } = await supabase
        .from("metric_goals")
        .update(row)
        .eq("id", id)
        .select("*")
        .single()
    if (error) throw error
    return rowToGoal(data)
}

export async function deleteMetricGoal(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from("metric_goals").delete().eq("id", id)
    if (error) throw error
}

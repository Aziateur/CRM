"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Lead, Attempt, PipelineStage, Task } from "@/lib/store"
import { OUTCOMES, DEFAULT_STAGE } from "@/lib/store"
import { useDashboardWidgets, useMetricDefinitions } from "@/hooks/use-metrics"
import { Phone, Users, TrendingUp, Calendar, ListTodo, Activity } from "lucide-react"

interface DashboardWidgetsProps {
  leads: Lead[]
  attempts: Attempt[]
  stages: PipelineStage[]
  tasks?: Task[]
  sessionStartedAt?: string | null
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PipelineFunnel({
  leads,
  attempts,
  stages,
}: {
  leads: Lead[]
  attempts: Attempt[]
  stages: PipelineStage[]
}) {
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of stages) counts[s.name] = 0
    for (const lead of leads) {
      const stage = lead.stage || DEFAULT_STAGE
      if (counts[stage] !== undefined) counts[stage]++
      else counts[stage] = 1
    }
    return stages.map((s) => ({ ...s, count: counts[s.name] ?? 0 }))
  }, [leads, attempts, stages])

  const maxCount = Math.max(...stageCounts.map((s) => s.count), 1)

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          {stageCounts.map((stage) => (
            <div key={stage.id} className="flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-bold tabular-nums">{stage.count}</span>
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    backgroundColor: stage.color,
                    height: `${Math.max((stage.count / maxCount) * 80, 4)}px`,
                    opacity: stage.count > 0 ? 1 : 0.3,
                  }}
                />
                <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full">{stage.name}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardWidgets({ leads, attempts, stages, tasks }: DashboardWidgetsProps) {
  const { widgets } = useDashboardWidgets()
  const { metrics: customMetrics } = useMetricDefinitions()

  const metricMap = useMemo(
    () => new Map(customMetrics.map((m) => [m.id, m])),
    [customMetrics]
  )

  const metrics = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const weekAttempts = attempts.filter((a) => new Date(a.timestamp) >= weekAgo)
    const monthAttempts = attempts.filter((a) => new Date(a.timestamp) >= monthAgo)

    const weekConnects = weekAttempts.filter((a) => a.outcome !== OUTCOMES.NO_CONNECT.value).length
    const weekMeetings = weekAttempts.filter((a) => a.outcome === OUTCOMES.MEETING_SET.value).length
    const monthMeetings = monthAttempts.filter((a) => a.outcome === OUTCOMES.MEETING_SET.value).length

    const connectRate = weekAttempts.length > 0
      ? Math.round((weekConnects / weekAttempts.length) * 100)
      : 0

    const monthConnects = monthAttempts.filter((a) => a.outcome !== OUTCOMES.NO_CONNECT.value).length
    const monthConnectRate = monthAttempts.length > 0
      ? Math.round((monthConnects / monthAttempts.length) * 100)
      : 0

    const pendingTasks = tasks?.length ?? 0
    const overdueTasks = (tasks ?? []).filter(
      (t) => new Date(t.dueAt) < new Date(new Date().toDateString())
    ).length

    return {
      totalLeads: leads.length,
      callsThisWeek: weekAttempts.length,
      callsThisMonth: monthAttempts.length,
      connectRate,
      monthConnectRate,
      weekMeetings,
      monthMeetings,
      pendingTasks,
      overdueTasks,
    }
  }, [leads, attempts, tasks])

  // DB-driven custom widgets (sorted by position)
  const activeWidgets = useMemo(
    () => widgets.filter(w => w.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [widgets]
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          title="Total Leads"
          value={metrics.totalLeads}
          icon={Users}
        />
        <MetricCard
          title="Calls This Week"
          value={metrics.callsThisWeek}
          subtitle={`${metrics.callsThisMonth} this month`}
          icon={Phone}
        />
        <MetricCard
          title="Connect Rate"
          value={`${metrics.connectRate}%`}
          subtitle={`${metrics.monthConnectRate}% this month`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Meetings"
          value={metrics.weekMeetings}
          subtitle={`${metrics.monthMeetings} this month`}
          icon={Calendar}
        />
        <MetricCard
          title="Pending Tasks"
          value={metrics.pendingTasks}
          subtitle={metrics.overdueTasks > 0 ? `${metrics.overdueTasks} overdue` : undefined}
          icon={ListTodo}
        />
      </div>

      {/* DB-configured custom widgets */}
      {activeWidgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {activeWidgets.map(widget => {
            const metric = widget.metricId ? metricMap.get(widget.metricId) : null
            return (
              <Card key={widget.id} className="relative overflow-hidden">
                {metric?.color && (
                  <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: metric.color }} />
                )}
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {widget.title ?? metric?.name ?? "Widget"}
                      </p>
                      <p className="text-2xl font-bold tabular-nums mt-0.5">—</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {metric?.unit ?? widget.widgetType}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <PipelineFunnel leads={leads} attempts={attempts} stages={stages} />
    </div>
  )
}

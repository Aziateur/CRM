"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Lead, Attempt, PipelineStage, Task } from "@/lib/store"
import { getEffectiveStage } from "@/lib/store"
import { Phone, Users, TrendingUp, Calendar, ClipboardList, Zap } from "lucide-react"

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
      const stage = getEffectiveStage(lead, attempts)
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

export function DashboardWidgets({ leads, attempts, stages, tasks, sessionStartedAt }: DashboardWidgetsProps) {
  const metrics = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const todayAttempts = attempts.filter((a) => new Date(a.timestamp) >= today)
    const weekAttempts = attempts.filter((a) => new Date(a.timestamp) >= weekAgo)

    const todayDM = todayAttempts.filter((a) => a.dmReached).length
    const todayMeetings = todayAttempts.filter((a) => a.outcome === "Meeting set").length

    const weekConnects = weekAttempts.filter((a) => a.outcome !== "No connect").length
    const weekMeetings = weekAttempts.filter((a) => a.outcome === "Meeting set").length

    const connectRate = weekAttempts.length > 0
      ? Math.round((weekConnects / weekAttempts.length) * 100)
      : 0

    // Task metrics
    const pendingTasks = (tasks || []).filter((t) => !t.completedAt)
    const overdueTasks = pendingTasks.filter((t) => new Date(t.dueAt) < today)
    const dueTodayTasks = pendingTasks.filter((t) => {
      const d = new Date(t.dueAt)
      return d >= today && d < todayEnd
    })

    // Pace: calls/hr in active session
    let pace: number | null = null
    if (sessionStartedAt) {
      const sessionStart = new Date(sessionStartedAt)
      const hoursElapsed = (now.getTime() - sessionStart.getTime()) / (1000 * 60 * 60)
      if (hoursElapsed >= 0.01 && todayAttempts.length > 0) {
        pace = Math.round((todayAttempts.length / hoursElapsed) * 10) / 10
      }
    }

    return {
      totalLeads: leads.length,
      callsToday: todayAttempts.length,
      dmToday: todayDM,
      meetingsToday: todayMeetings,
      callsThisWeek: weekAttempts.length,
      connectRate,
      weekMeetings,
      tasksDueToday: dueTodayTasks.length,
      tasksOverdue: overdueTasks.length,
      pace,
    }
  }, [leads, attempts, tasks, sessionStartedAt])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Calls Today"
          value={metrics.callsToday}
          subtitle={`${metrics.dmToday} DM reached`}
          icon={Phone}
        />
        <MetricCard
          title="Meetings"
          value={metrics.meetingsToday}
          subtitle={`${metrics.weekMeetings} this week`}
          icon={Calendar}
        />
        <MetricCard
          title="Connect Rate"
          value={`${metrics.connectRate}%`}
          subtitle={`${metrics.callsThisWeek} calls this week`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Tasks Due"
          value={metrics.tasksDueToday + metrics.tasksOverdue}
          subtitle={metrics.tasksOverdue > 0 ? `${metrics.tasksOverdue} overdue` : "all on track"}
          icon={ClipboardList}
        />
        <MetricCard
          title="Total Leads"
          value={metrics.totalLeads}
          icon={Users}
        />
        <MetricCard
          title="Pace"
          value={metrics.pace ? `${metrics.pace}/hr` : "—"}
          subtitle={metrics.pace ? "calls per hour" : "no active session"}
          icon={Zap}
        />
      </div>
      <PipelineFunnel leads={leads} attempts={attempts} stages={stages} />
    </div>
  )
}

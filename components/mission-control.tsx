"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Target, TrendingUp, AlertTriangle, Settings2, Check } from "lucide-react"
import type { Attempt, Task } from "@/lib/store"
import {
  getMissionControlConfig,
  setMissionControlConfig,
  getPeriodStart,
  getPeriodTotalDays,
  getDaysElapsed,
  getGoalLabel,
  getPeriodLabel,
  type MissionControlConfig,
  type GoalPeriod,
  type GoalMetricType,
} from "@/lib/mission-control"

interface MissionControlProps {
  attempts: Attempt[]
  tasks: Task[]
}

export function MissionControl({ attempts, tasks }: MissionControlProps) {
  const [config, setConfig] = useState<MissionControlConfig>(getMissionControlConfig)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Persist config changes
  const updateConfig = (updates: Partial<MissionControlConfig>) => {
    const next = { ...config, ...updates }
    setConfig(next)
    setMissionControlConfig(next)
  }

  const updateGoalMetric = (type: GoalMetricType) => {
    const goalMetric = type === "attempt_outcome"
      ? { type, outcomes: ["Meeting set"] as string[] }
      : { type }
    updateConfig({ goalMetric })
  }

  // Compute achieved
  const { achieved, remaining, needPerDay, paceStatus, periodLabel, goalLabel } = useMemo(() => {
    const periodStart = getPeriodStart(config.period)
    const totalDays = getPeriodTotalDays(config.period)
    const elapsed = getDaysElapsed(config.period)

    let achieved = 0

    switch (config.goalMetric.type) {
      case "attempt_outcome": {
        const outcomes = config.goalMetric.outcomes || ["Meeting set"]
        achieved = attempts.filter((a) => {
          if (new Date(a.timestamp) < periodStart) return false
          return outcomes.includes(a.outcome)
        }).length
        break
      }
      case "attempt_count": {
        achieved = attempts.filter((a) => new Date(a.timestamp) >= periodStart).length
        break
      }
      case "task_completed": {
        achieved = tasks.filter((t) => {
          if (!t.completedAt) return false
          return new Date(t.completedAt) >= periodStart
        }).length
        break
      }
    }

    const remaining = Math.max(config.target - achieved, 0)
    const remainingDays = Math.max(totalDays - elapsed + 1, 1)
    const needPerDay = remaining > 0 ? Math.round((remaining / remainingDays) * 10) / 10 : 0

    // Status
    let paceStatus: "done" | "on_track" | "tight" | "behind" = "on_track"
    if (remaining === 0) {
      paceStatus = "done"
    } else if (config.target > 0) {
      const projected = elapsed > 0 ? (achieved / elapsed) * totalDays : 0
      if (projected >= config.target) paceStatus = "on_track"
      else if (projected >= config.target * 0.7) paceStatus = "tight"
      else paceStatus = "behind"
    }

    return {
      achieved,
      remaining,
      needPerDay,
      paceStatus,
      periodLabel: getPeriodLabel(config.period),
      goalLabel: getGoalLabel(config),
    }
  }, [attempts, tasks, config])

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return tasks.filter((t) => !t.completedAt && new Date(t.dueAt) < today)
  }, [tasks])

  const progress = config.target > 0 ? Math.min((achieved / config.target) * 100, 100) : 0

  const paceColor = {
    done: "text-green-600",
    on_track: "text-green-600",
    tight: "text-amber-600",
    behind: "text-red-600",
  }[paceStatus]

  const paceBg = {
    done: "bg-green-50 border-green-200",
    on_track: "bg-green-50 border-green-200",
    tight: "bg-amber-50 border-amber-200",
    behind: "bg-red-50 border-red-200",
  }[paceStatus]

  const paceMessage = {
    done: "Goal reached",
    on_track: `On track — need ${needPerDay}/day`,
    tight: `Tight — need ${needPerDay}/day`,
    behind: `Behind — need ${needPerDay}/day`,
  }[paceStatus]

  const integrityColor = overdueTasks.length === 0 ? "text-green-600" : "text-red-600"
  const integrityBg = overdueTasks.length === 0
    ? "bg-green-50 border-green-200"
    : "bg-red-50 border-red-200"

  return (
    <Card className="mb-4">
      <CardContent className="pt-4 pb-3">
        <div className="grid grid-cols-3 gap-4">
          {/* Cell 1: Goal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {goalLabel}
                </span>
              </div>
              <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Settings2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Goal metric</Label>
                      <Select
                        value={config.goalMetric.type}
                        onValueChange={(v) => updateGoalMetric(v as GoalMetricType)}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="attempt_outcome">Meetings booked</SelectItem>
                          <SelectItem value="attempt_count">Total calls</SelectItem>
                          <SelectItem value="task_completed">Tasks completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Period</Label>
                      <Select
                        value={config.period}
                        onValueChange={(v) => updateConfig({ period: v as GoalPeriod })}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iso_week">This week (Mon–Sun)</SelectItem>
                          <SelectItem value="rolling_7">Rolling 7 days</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Target</Label>
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        className="h-8 text-xs mt-1"
                        value={config.target}
                        onChange={(e) => {
                          const n = parseInt(e.target.value)
                          if (n > 0) updateConfig({ target: n })
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setSettingsOpen(false)}
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">{achieved}</span>
              <span className="text-sm text-muted-foreground">/ {config.target}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{periodLabel}</p>
          </div>

          {/* Cell 2: Pace */}
          <div className={`rounded-lg border p-3 ${paceBg}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className={`h-3.5 w-3.5 ${paceColor}`} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pace</span>
            </div>
            <p className={`text-sm font-medium ${paceColor}`}>
              {paceMessage}
            </p>
            {remaining > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {remaining} more to hit target
              </p>
            )}
          </div>

          {/* Cell 3: Integrity */}
          <div className={`rounded-lg border p-3 ${integrityBg}`}>
            <div className="flex items-center gap-1.5 mb-1">
              {overdueTasks.length === 0
                ? <Check className="h-3.5 w-3.5 text-green-600" />
                : <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              }
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Integrity</span>
            </div>
            {overdueTasks.length === 0 ? (
              <p className="text-sm font-medium text-green-600">Clean</p>
            ) : (
              <>
                <p className="text-sm font-medium text-red-600">
                  {overdueTasks.length} overdue
                </p>
                <div className="mt-1 space-y-0.5">
                  {overdueTasks.slice(0, 3).map((t) => (
                    <p key={t.id} className="text-[10px] text-red-600 truncate">
                      {t.title}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

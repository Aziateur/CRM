"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Target, TrendingUp, AlertTriangle, Check, Settings2 } from "lucide-react"
import type { Attempt, Task } from "@/lib/store"
import { useFramework } from "@/hooks/use-framework"
import {
  getPeriodRange,
  getRemainingDays,
  getPeriodTotalDays,
  getGoalLabel,
  getPeriodLabel,
  type GoalCounterKey,
} from "@/lib/framework"
import { countSignals } from "@/lib/signals"

interface MissionControlProps {
  attempts: Attempt[]
  tasks: Task[]
}

export function MissionControl({ attempts, tasks }: MissionControlProps) {
  const { framework, activePhase, activeFocusLever, setActivePhase, setTarget } = useFramework()
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetDraft, setTargetDraft] = useState("")
  const targetInputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (editingTarget && targetInputRef.current) {
      targetInputRef.current.focus()
      targetInputRef.current.select()
    }
  }, [editingTarget])

  // Compute achieved count
  const { achieved, remaining, needPerDay, paceStatus } = useMemo(() => {
    const { start, end } = getPeriodRange(activePhase.period)
    const totalDays = getPeriodTotalDays(activePhase.period)
    const remainingDays = getRemainingDays(activePhase.period)

    // Get period attempt IDs
    const periodAttempts = attempts.filter(a => {
      const ts = new Date(a.timestamp)
      return ts >= start && ts < end
    })
    const periodAttemptIds = periodAttempts.map(a => a.id)

    let achieved = 0
    const counterKey: GoalCounterKey = activePhase.goalCounterKey

    switch (counterKey) {
      case "focus_practiced":
      case "new_truth_gained":
      case "icp_validated":
        // Count from localStorage signals
        achieved = countSignals(periodAttemptIds, counterKey)
        break
      case "meetings_set":
        // Count from actual attempt outcomes
        achieved = periodAttempts.filter(a => a.outcome === "Meeting set").length
        break
    }

    const remaining = Math.max(activePhase.target - achieved, 0)
    const needPerDay = remaining > 0 ? Math.ceil((remaining / remainingDays) * 10) / 10 : 0

    // Pace status
    let paceStatus: "done" | "on_track" | "tight" | "behind" = "on_track"
    if (remaining === 0) {
      paceStatus = "done"
    } else if (activePhase.target > 0) {
      const normalPerDay = activePhase.target / totalDays
      if (needPerDay <= normalPerDay) paceStatus = "on_track"
      else if (needPerDay <= normalPerDay * 2) paceStatus = "tight"
      else paceStatus = "behind"
    }

    return { achieved, remaining, needPerDay, paceStatus }
  }, [attempts, activePhase])

  // Overdue tasks
  const overdueCount = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return tasks.filter(t => !t.completedAt && t.dueAt && new Date(t.dueAt) < today).length
  }, [tasks])

  const progress = activePhase.target > 0 ? Math.min((achieved / activePhase.target) * 100, 100) : 0

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
    on_track: `On track \u2014 need ${needPerDay}/day`,
    tight: `Tight \u2014 need ${needPerDay}/day`,
    behind: `Behind \u2014 need ${needPerDay}/day`,
  }[paceStatus]

  const integrityColor = overdueCount === 0 ? "text-green-600" : "text-red-600"
  const integrityBg = overdueCount === 0
    ? "bg-green-50 border-green-200"
    : "bg-red-50 border-red-200"

  const handleTargetSave = () => {
    const n = parseInt(targetDraft)
    if (n > 0 && n <= 999) {
      setTarget(activePhase.key, n)
    }
    setEditingTarget(false)
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-4 pb-3">
        {/* Controls row */}
        <div className="flex items-center gap-2 mb-3">
          <Select value={framework.activePhaseKey} onValueChange={setActivePhase}>
            <SelectTrigger className="h-7 w-auto text-xs gap-1 px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {framework.phases.map(p => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-muted-foreground">
            Focus: {activeFocusLever.label}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {getPeriodLabel(activePhase.period)}
          </span>
          <a href="/settings" className="text-muted-foreground hover:text-foreground">
            <Settings2 className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* 3-cell strip */}
        <div className="grid grid-cols-3 gap-4">
          {/* Cell 1: Goal */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {getGoalLabel(activePhase.goalCounterKey)}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">{achieved}</span>
              <span className="text-sm text-muted-foreground">/</span>
              {editingTarget ? (
                <Input
                  ref={targetInputRef}
                  type="number"
                  min={1}
                  max={999}
                  className="h-6 w-14 text-sm px-1"
                  value={targetDraft}
                  onChange={e => setTargetDraft(e.target.value)}
                  onBlur={handleTargetSave}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleTargetSave()
                    if (e.key === "Escape") setEditingTarget(false)
                  }}
                />
              ) : (
                <button
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline tabular-nums"
                  onClick={() => {
                    setTargetDraft(activePhase.target.toString())
                    setEditingTarget(true)
                  }}
                >
                  {activePhase.target}
                </button>
              )}
            </div>
            <Progress value={progress} className="h-1.5" />
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

          {/* Cell 3: Follow-up Quality */}
          <div className={`rounded-lg border p-3 ${integrityBg}`}>
            <div className="flex items-center gap-1.5 mb-1">
              {overdueCount === 0
                ? <Check className="h-3.5 w-3.5 text-green-600" />
                : <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              }
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Follow-ups</span>
            </div>
            {overdueCount === 0 ? (
              <p className="text-sm font-medium text-green-600">Clean</p>
            ) : (
              <p className={`text-sm font-medium ${integrityColor}`}>
                {overdueCount} overdue
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

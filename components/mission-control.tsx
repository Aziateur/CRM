"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Target, TrendingUp, AlertTriangle, Check, Settings2, Info } from "lucide-react"
import type { Attempt, Task } from "@/lib/store"
import { useFramework } from "@/hooks/use-framework"
import {
  getPeriodRange,
  getRemainingDays,
  getPeriodTotalDays,
  getPeriodLabel,
} from "@/lib/framework"
import { countSignals } from "@/lib/signals"

interface MissionControlProps {
  attempts: Attempt[]
  tasks: Task[]
}

export function MissionControl({ attempts, tasks }: MissionControlProps) {
  const {
    framework,
    activePhase,
    activeFocusLever,
    practiceMarker,
    translationMarker,
    setActivePhase,
    setTarget,
  } = useFramework()

  const [editingTarget, setEditingTarget] = useState(false)
  const [targetDraft, setTargetDraft] = useState("")
  const targetInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingTarget && targetInputRef.current) {
      targetInputRef.current.focus()
      targetInputRef.current.select()
    }
  }, [editingTarget])

  // Compute the scoreboard: reps, practice, translation, goalAchieved
  const scoreboard = useMemo(() => {
    const { start, end } = getPeriodRange(activePhase.period)
    const totalDays = getPeriodTotalDays(activePhase.period)
    const remainingDays = getRemainingDays(activePhase.period)

    // Reps = all attempts in period (not filtered by phase)
    const periodAttempts = attempts.filter(a => {
      const ts = new Date(a.timestamp)
      return ts >= start && ts < end
    })
    const reps = periodAttempts.length
    const periodAttemptIds = periodAttempts.map(a => a.id)

    // Practice count (from signals)
    const practiceCount = activePhase.practiceMarkerKey
      ? countSignals(periodAttemptIds, activePhase.practiceMarkerKey)
      : null

    // Translation count (from signals or outcomes)
    let translationCount: number | null = null
    if (activePhase.targetMetric === "outcome_meetings") {
      translationCount = periodAttempts.filter(a => a.outcome === "Meeting set").length
    } else if (activePhase.translationMarkerKey) {
      translationCount = countSignals(periodAttemptIds, activePhase.translationMarkerKey)
    }

    // What does the target count?
    let goalAchieved = 0
    switch (activePhase.targetMetric) {
      case "reps":
        goalAchieved = reps
        break
      case "practice":
        goalAchieved = practiceCount ?? 0
        break
      case "translation":
        goalAchieved = translationCount ?? 0
        break
      case "outcome_meetings":
        goalAchieved = translationCount ?? 0
        break
    }

    const remaining = Math.max(activePhase.target - goalAchieved, 0)
    const needPerDay = remaining > 0 ? Math.ceil((remaining / remainingDays) * 10) / 10 : 0

    let paceStatus: "done" | "on_track" | "tight" | "behind" = "on_track"
    if (remaining === 0 && activePhase.target > 0) {
      paceStatus = "done"
    } else if (activePhase.target > 0) {
      const normalPerDay = activePhase.target / totalDays
      if (needPerDay <= normalPerDay) paceStatus = "on_track"
      else if (needPerDay <= normalPerDay * 2) paceStatus = "tight"
      else paceStatus = "behind"
    }

    // Check if signals are mostly empty (historical calls unscored)
    const hasAnySignals = practiceCount !== null && practiceCount > 0

    return {
      reps,
      practiceCount,
      translationCount,
      goalAchieved,
      remaining,
      needPerDay,
      paceStatus,
      hasAnySignals,
    }
  }, [attempts, activePhase])

  // Overdue tasks
  const overdueCount = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return tasks.filter(t => !t.completedAt && t.dueAt && new Date(t.dueAt) < today).length
  }, [tasks])

  const progress = activePhase.target > 0
    ? Math.min((scoreboard.goalAchieved / activePhase.target) * 100, 100) : 0

  const paceColor = {
    done: "text-green-600", on_track: "text-green-600",
    tight: "text-amber-600", behind: "text-red-600",
  }[scoreboard.paceStatus]

  const paceBg = {
    done: "bg-green-50 border-green-200", on_track: "bg-green-50 border-green-200",
    tight: "bg-amber-50 border-amber-200", behind: "bg-red-50 border-red-200",
  }[scoreboard.paceStatus]

  const paceMessage = {
    done: "Goal reached",
    on_track: `On track — need ${scoreboard.needPerDay}/day`,
    tight: `Tight — need ${scoreboard.needPerDay}/day`,
    behind: `Behind — need ${scoreboard.needPerDay}/day`,
  }[scoreboard.paceStatus]

  const handleTargetSave = () => {
    const n = parseInt(targetDraft)
    if (n > 0 && n <= 999) setTarget(activePhase.key, n)
    setEditingTarget(false)
  }

  // Target metric label
  const targetMetricLabel = {
    reps: "Reps",
    practice: practiceMarker?.label || "Practice",
    translation: translationMarker?.label || "Translation",
    outcome_meetings: "Meetings",
  }[activePhase.targetMetric]

  return (
    <TooltipProvider>
      <Card className="mb-4">
        <CardContent className="pt-4 pb-3">
          {/* Header: Phase + WHY/DO + period */}
          <div className="flex items-start gap-2 mb-3">
            <Select value={framework.activePhaseKey} onValueChange={setActivePhase}>
              <SelectTrigger className="h-7 w-auto text-xs gap-1 px-2 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {framework.phases.map(p => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">
                <span className="font-medium">Why:</span> {activePhase.why}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                <span className="font-medium">Do:</span> {activePhase.do_}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-muted-foreground">
                {getPeriodLabel(activePhase.period)}
              </span>
              <a href="/settings" className="text-muted-foreground hover:text-foreground">
                <Settings2 className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* 3-cell strip */}
          <div className="grid grid-cols-3 gap-4">
            {/* Cell 1: Goal + Scoreboard */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {targetMetricLabel}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    <p className="text-xs font-medium mb-1">Win: {activePhase.win}</p>
                    {activePhase.exitCriteria && (
                      <p className="text-xs text-muted-foreground">Switch when: {activePhase.exitCriteria}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Big number: achieved / target */}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">{scoreboard.goalAchieved}</span>
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

              {/* Scoreboard: reps / practice / translation — always visible */}
              <div className="space-y-0.5 pt-1">
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  Reps: {scoreboard.reps}
                </p>
                {scoreboard.practiceCount !== null && (
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {practiceMarker?.label || "Practice"}: {scoreboard.practiceCount} / {scoreboard.reps}
                  </p>
                )}
                {scoreboard.translationCount !== null && (
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {activePhase.targetMetric === "outcome_meetings"
                      ? "Meetings"
                      : (translationMarker?.label || "Translation")
                    }: {scoreboard.translationCount} / {scoreboard.reps}
                  </p>
                )}
              </div>
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
              {scoreboard.remaining > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {scoreboard.remaining} more to hit target
                </p>
              )}
              {/* "Starts now" message for empty signals */}
              {!scoreboard.hasAnySignals && scoreboard.reps > 0 && scoreboard.practiceCount !== null && (
                <p className="text-[10px] text-amber-600 mt-2">
                  Signals start from now — older calls are unscored
                </p>
              )}
            </div>

            {/* Cell 3: Follow-up Quality */}
            <div className={`rounded-lg border p-3 ${
              overdueCount === 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}>
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
                <>
                  <p className="text-sm font-medium text-red-600">
                    {overdueCount} overdue
                  </p>
                  <p className="text-[10px] text-red-600 mt-1">Fix these first</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

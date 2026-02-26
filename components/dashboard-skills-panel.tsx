"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Target, Zap, Trophy, CheckCircle2, ArrowRight } from "lucide-react"
import type { Attempt } from "@/lib/store"
import { OUTCOMES } from "@/lib/store"
import { useFramework } from "@/hooks/use-framework"
import { useSignals } from "@/hooks/use-signals"
import { useAttempts } from "@/hooks/use-attempts"
import { getPeriodRange, getPeriodLabel } from "@/lib/framework"

function Pct({ n, d }: { n: number; d: number }) {
    if (d === 0) return <span className="text-muted-foreground">—</span>
    return <span>{Math.round((n / d) * 100)}%</span>
}

export function DashboardSkillsPanel() {
    const { framework, activePhase, activeFocusLever, actionMarker, winMarker } = useFramework()
    const { countSignals } = useSignals()
    const { attempts } = useAttempts()

    const stats = useMemo(() => {
        const { start, end } = getPeriodRange(activePhase.period)
        const periodAttempts = attempts.filter(a => {
            const ts = new Date(a.timestamp)
            return ts >= start && ts < end
        })
        const calls = periodAttempts.length
        const ids = periodAttempts.map(a => a.id)
        const connects = periodAttempts.filter(a => a.dmReached).length

        const actionCount = activePhase.actionMarkerKey
            ? countSignals(ids, activePhase.actionMarkerKey)
            : null

        let winCount: number | null = null
        if (activePhase.primaryGoal === "outcome_meetings") {
            winCount = periodAttempts.filter(a => a.outcome === OUTCOMES.MEETING_SET.value).length
        } else if (activePhase.winMarkerKey) {
            winCount = countSignals(ids, activePhase.winMarkerKey)
        }

        let goalAchieved = 0
        switch (activePhase.primaryGoal) {
            case "reps": goalAchieved = calls; break
            case "action": goalAchieved = actionCount ?? 0; break
            case "win": goalAchieved = winCount ?? 0; break
            case "outcome_meetings": goalAchieved = winCount ?? 0; break
        }

        return { calls, connects, actionCount, winCount, goalAchieved, ids }
    }, [attempts, activePhase, countSignals])

    const progress = activePhase.target > 0
        ? Math.min((stats.goalAchieved / activePhase.target) * 100, 100) : 0

    const goalLabel = {
        reps: "Calls",
        action: actionMarker?.label || "Actions",
        win: winMarker?.label || "Wins",
        outcome_meetings: "Meetings",
    }[activePhase.primaryGoal]

    return (
        <div className="space-y-4">
            {/* Active Phase */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Active Phase
                        </CardTitle>
                        <Badge variant="secondary" className="text-[10px]">
                            {getPeriodLabel(activePhase.period)}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <h3 className="text-lg font-semibold">{activePhase.label}</h3>
                    <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Why:</span> {activePhase.whyText}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Do:</span> {activePhase.doText}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Win:</span> {activePhase.winText}
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="flex items-baseline justify-between mb-1.5">
                            <span className="text-xs font-medium">{goalLabel} Progress</span>
                            <span className="text-sm font-bold tabular-nums">
                                {stats.goalAchieved} / {activePhase.target}
                            </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        {stats.calls === 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                                No calls yet this period. Start dialing to see progress.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Marker Rates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Calls */}
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-blue-500" />
                            <span className="text-xs font-medium text-muted-foreground">Calls</span>
                        </div>
                        <p className="text-2xl font-bold tabular-nums">{stats.calls}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {stats.connects} connects ({stats.calls > 0 ? Math.round((stats.connects / stats.calls) * 100) : 0}%)
                        </p>
                    </CardContent>
                </Card>

                {/* Action Rate */}
                {actionMarker && (
                    <Card>
                        <CardContent className="pt-4 pb-3">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-xs font-medium text-muted-foreground">{actionMarker.label}</span>
                            </div>
                            <p className="text-2xl font-bold tabular-nums">
                                <Pct n={stats.actionCount ?? 0} d={stats.calls} />
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {stats.actionCount ?? 0} / {stats.calls} calls
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Win Rate */}
                {(winMarker || activePhase.primaryGoal === "outcome_meetings") && (
                    <Card>
                        <CardContent className="pt-4 pb-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Trophy className="h-4 w-4 text-amber-500" />
                                <span className="text-xs font-medium text-muted-foreground">
                                    {activePhase.primaryGoal === "outcome_meetings" ? "Meetings" : winMarker?.label || "Wins"}
                                </span>
                            </div>
                            <p className="text-2xl font-bold tabular-nums">
                                <Pct n={stats.winCount ?? 0} d={stats.connects > 0 ? stats.connects : stats.calls} />
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {stats.winCount ?? 0} / {stats.connects > 0 ? `${stats.connects} connects` : `${stats.calls} calls`}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Focus Lever + Exit Criteria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Active Lever */}
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <span className="text-xs font-medium text-muted-foreground">Focus Lever</span>
                        <p className="text-sm font-semibold mt-1">{activeFocusLever.label}</p>
                        {activeFocusLever.prompt && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{activeFocusLever.prompt}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Exit Criteria */}
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <span className="text-xs font-medium text-muted-foreground">Exit Criteria</span>
                        {activePhase.exitCriteria ? (
                            <p className="text-sm mt-1">{activePhase.exitCriteria}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground mt-1 italic">Not set</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Phase Roadmap */}
            <Card>
                <CardContent className="pt-4 pb-3">
                    <span className="text-xs font-medium text-muted-foreground mb-2 block">Phase Roadmap</span>
                    <div className="flex items-center gap-1 flex-wrap">
                        {framework.phases.map((phase, i) => (
                            <div key={phase.key} className="flex items-center gap-1">
                                <Badge
                                    variant={phase.key === activePhase.key ? "default" : "outline"}
                                    className={`text-xs ${phase.key === activePhase.key ? "" : "text-muted-foreground"}`}
                                >
                                    {phase.label}
                                </Badge>
                                {i < framework.phases.length - 1 && (
                                    <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

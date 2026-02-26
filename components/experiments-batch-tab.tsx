"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ExperimentDashboard } from "@/components/experiment-dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Beaker,
    Pause,
    Play,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    FlaskConical,
    Target,
    TrendingUp,
    Phone,
    Search,
    BookOpen,
    Users,
    RefreshCw,
    XCircle,
} from "lucide-react"
import {
    useExperimentsQuery,
    useUpdateExperimentStatus,
    useGetExperimentStats,
    useGetExperimentAttempts,
    type Experiment,
    type ConclusionType,
    type ExperimentStats,
} from "@/queries/experiments"
import { CreateExperimentModal } from "@/components/create-experiment-modal"

// ─── Types ───

interface ExperimentAttempt {
    id: string
    outcome: string | null
    dmReached: boolean
    timestamp: string
    variantId: string | null
    variantName: string
    isControl: boolean
    company: string | null
    phone: string | null
    stage: string | null
    segment: string | null
}

interface VariantStat {
    variantId: string
    variantName: string
    isControl: boolean
    total: number
    dmReached: number
    dmReachRate: number
    interested: number
    interestRate: number
}

interface ExperimentsBatchTabProps {
    refetchTrigger?: number
    /** Called when user wants to review calls from an experiment in Quick Batch */
    onReviewCalls?: (experimentId: string) => void
    /** Called when user wants to deep-dive calls from an experiment */
    onDeepDiveCalls?: (experimentId: string, label: string) => void
}

export function ExperimentsBatchTab({ refetchTrigger = 0, onReviewCalls, onDeepDiveCalls }: ExperimentsBatchTabProps) {
    const {
        experiments,
        activeExperiments,
        refetch,
    } = useExperimentsQuery()
    const updateStatus = useUpdateExperimentStatus()
    const { getStats: getExperimentStats } = useGetExperimentStats()
    const { getAttempts: getExperimentAttempts } = useGetExperimentAttempts()

    // Dashboard detail view
    const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null)
    const selectedExperiment = useMemo(() =>
        experiments.find(e => e.id === selectedExperimentId) ?? null,
        [experiments, selectedExperimentId]
    )

    const pauseExperiment = (id: string) =>
        updateStatus.mutateAsync({ id, status: "paused" })
    const activateExperiment = (id: string) =>
        updateStatus.mutateAsync({ id, status: "active" })
    const completeExperiment = (id: string, conclusion: string, conclusionType: ConclusionType) =>
        updateStatus.mutateAsync({ id, status: "completed", conclusion, conclusionType })

    const [stats, setStats] = useState<Record<string, ExperimentStats>>({})
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [attemptData, setAttemptData] = useState<{
        attempts: ExperimentAttempt[]
        variantStats: VariantStat[]
        total: number
    } | null>(null)
    const [attemptLoading, setAttemptLoading] = useState(false)

    // Conclude state
    const [concluding, setConcluding] = useState<string | null>(null)
    const [conclusionText, setConclusionText] = useState("")
    const [conclusionType, setConclusionType] = useState<ConclusionType | null>(null)

    // Visible experiments: active, paused, recently completed
    const visibleExperiments = useMemo(() => experiments.filter(e =>
        e.status === "active" || e.status === "paused" ||
        (e.status === "completed" && e.completedAt &&
            Date.now() - new Date(e.completedAt).getTime() < 14 * 86400000)
    ), [experiments])

    // Fetch stats for all visible experiments
    const fetchAllStats = useCallback(async () => {
        const result: Record<string, ExperimentStats> = {}
        for (const exp of visibleExperiments) {
            const s = await getExperimentStats(exp.id)
            if (s) result[exp.id] = s
        }
        setStats(result)
    }, [visibleExperiments.map(e => e.id).join(","), getExperimentStats]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (visibleExperiments.length > 0) fetchAllStats()
    }, [fetchAllStats]) // eslint-disable-line react-hooks/exhaustive-deps

    // Refetch on trigger
    useEffect(() => {
        if (refetchTrigger > 0) {
            refetch().then(() => fetchAllStats())
        }
    }, [refetchTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

    // Load attempt data when an experiment is expanded
    const handleExpand = useCallback(async (expId: string) => {
        if (expandedId === expId) {
            setExpandedId(null)
            setAttemptData(null)
            return
        }
        setExpandedId(expId)
        setAttemptLoading(true)
        try {
            const data = await getExperimentAttempts(expId)
            setAttemptData(data)
        } finally {
            setAttemptLoading(false)
        }
    }, [expandedId, getExperimentAttempts])

    const handleConclude = async (expId: string) => {
        if (!conclusionType || !conclusionText.trim()) return
        await completeExperiment(expId, conclusionText.trim(), conclusionType)
        setConcluding(null)
        setConclusionText("")
        setConclusionType(null)
        fetchAllStats()
    }

    return (
        <div className="space-y-6">
            {/* ─── Detail view: full experiment dashboard ─── */}
            {selectedExperiment ? (
                <ExperimentDashboard
                    experiment={selectedExperiment}
                    onBack={() => setSelectedExperimentId(null)}
                    onReviewCalls={onReviewCalls}
                    onDeepDiveCalls={onDeepDiveCalls}
                />
            ) : (
                <>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <FlaskConical className="h-5 w-5 text-purple-600" />
                                Experiment Batches
                            </h2>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Track A/B tests, compare variants, and conclude experiments
                            </p>
                        </div>
                        <CreateExperimentModal
                            onCreated={() => refetch().then(() => fetchAllStats())}
                            onCancel={() => { }}
                        />
                    </div>

                    {/* Stats summary */}
                    {visibleExperiments.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                            <Card className="border-purple-200/50">
                                <CardContent className="p-4 text-center">
                                    <p className="text-2xl font-bold text-purple-600">{activeExperiments.length}</p>
                                    <p className="text-xs text-muted-foreground">Active Experiments</p>
                                </CardContent>
                            </Card>
                            <Card className="border-blue-200/50">
                                <CardContent className="p-4 text-center">
                                    <p className="text-2xl font-bold text-blue-600">
                                        {Object.values(stats).reduce((acc, s) => acc + s.total, 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Total Calls in Experiments</p>
                                </CardContent>
                            </Card>
                            <Card className="border-green-200/50">
                                <CardContent className="p-4 text-center">
                                    <p className="text-2xl font-bold text-green-600">
                                        {experiments.filter(e => e.status === "completed").length}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Concluded</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Experiment cards */}
                    {visibleExperiments.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Beaker className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                <h3 className="font-semibold">No Experiments Yet</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Create an experiment to start A/B testing your call approach
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {visibleExperiments.map(exp => {
                                const s = stats[exp.id]
                                const total = s?.total ?? 0
                                const progress = Math.min(100, Math.round((total / exp.sampleSizeTarget) * 100))
                                const isReady = total >= exp.sampleSizeTarget
                                const isExpanded = expandedId === exp.id
                                const isConcluding = concluding === exp.id

                                return (
                                    <Card
                                        key={exp.id}
                                        className={`border-purple-200/50 transition-all ${exp.status === "completed" ? "opacity-70" : ""}`}
                                    >
                                        <CardContent className="p-4 space-y-3">
                                            {/* Header row */}
                                            <div className="flex items-center justify-between">
                                                <button
                                                    className="flex items-center gap-2 text-left flex-1 group"
                                                    onClick={() => setSelectedExperimentId(exp.id)}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    <Beaker className="h-4 w-4 text-purple-600" />
                                                    <span className="font-medium text-sm group-hover:text-purple-700 transition-colors">
                                                        {exp.name}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] ${exp.status === "active" ? "border-green-300 text-green-700" :
                                                            exp.status === "paused" ? "border-yellow-300 text-yellow-700" :
                                                                exp.status === "completed" ? "border-blue-300 text-blue-700" : ""
                                                            }`}
                                                    >
                                                        {exp.status}
                                                    </Badge>
                                                    {isReady && exp.status !== "completed" && (
                                                        <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">
                                                            Ready for conclusion
                                                        </Badge>
                                                    )}
                                                </button>
                                                {exp.status !== "completed" && (
                                                    <div className="flex items-center gap-1">
                                                        {exp.status === "active" ? (
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1"
                                                                onClick={() => pauseExperiment(exp.id)}>
                                                                <Pause className="h-3 w-3" /> Pause
                                                            </Button>
                                                        ) : exp.status === "paused" ? (
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1"
                                                                onClick={() => activateExperiment(exp.id)}>
                                                                <Play className="h-3 w-3" /> Resume
                                                            </Button>
                                                        ) : null}
                                                        <Button variant="outline" size="sm" className="h-6 text-xs gap-1"
                                                            onClick={() => setConcluding(exp.id)}>
                                                            <CheckCircle2 className="h-3 w-3" /> Conclude
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Hypothesis */}
                                            <p className="text-xs text-muted-foreground">{exp.hypothesis}</p>

                                            {/* Progress bar */}
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Progress</span>
                                                    <span className="font-medium tabular-nums">{total} / {exp.sampleSizeTarget}</span>
                                                </div>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${isReady ? "bg-green-500" : "bg-purple-500"}`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Quick actions: Review calls */}
                                            {total > 0 && (
                                                <div className="flex gap-1">
                                                    {onReviewCalls && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 text-xs gap-1 text-purple-700 border-purple-300 hover:bg-purple-50"
                                                            onClick={() => onReviewCalls(exp.id)}
                                                        >
                                                            <Search className="h-3 w-3" />
                                                            Review Calls
                                                        </Button>
                                                    )}
                                                    {onDeepDiveCalls && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 text-xs gap-1"
                                                            onClick={() => onDeepDiveCalls(exp.id, exp.name)}
                                                        >
                                                            <BookOpen className="h-3 w-3" />
                                                            Deep Dive
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Variant breakdown (compact) */}
                                            {s && s.byVariant.length > 0 && !isExpanded && (
                                                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${s.byVariant.length}, 1fr)` }}>
                                                    {s.byVariant.map(v => (
                                                        <div key={v.variantId} className={`p-2 rounded border text-center ${v.isControl ? "bg-blue-50/50 border-blue-200" : "bg-purple-50/50 border-purple-200"
                                                            }`}>
                                                            <p className="text-[10px] font-medium text-muted-foreground">{v.variantName}</p>
                                                            <p className="text-lg font-bold tabular-nums">{v.count}</p>
                                                            <p className="text-[10px] text-muted-foreground">calls</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* ─── Expanded: detailed variant stats + attempt table ─── */}
                                            {isExpanded && (
                                                <div className="space-y-4 pt-2 border-t">
                                                    {attemptLoading ? (
                                                        <div className="text-center py-6 text-sm text-muted-foreground">
                                                            Loading experiment data…
                                                        </div>
                                                    ) : attemptData ? (
                                                        <>
                                                            {/* Variant comparison cards */}
                                                            <div className="grid gap-3" style={{
                                                                gridTemplateColumns: `repeat(${attemptData.variantStats.length}, 1fr)`
                                                            }}>
                                                                {attemptData.variantStats.map(vs => (
                                                                    <Card key={vs.variantId} className={`${vs.isControl
                                                                        ? "border-blue-200 bg-blue-50/30"
                                                                        : "border-purple-200 bg-purple-50/30"
                                                                        }`}>
                                                                        <CardContent className="p-3 space-y-2">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-xs font-semibold">{vs.variantName}</span>
                                                                                {vs.isControl && (
                                                                                    <Badge variant="outline" className="text-[9px] h-4 border-blue-300 text-blue-600">
                                                                                        Control
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-2 text-center">
                                                                                <div>
                                                                                    <p className="text-xl font-bold tabular-nums">{vs.total}</p>
                                                                                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                                                                        <Phone className="h-2.5 w-2.5" /> Calls
                                                                                    </p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-xl font-bold tabular-nums">{vs.dmReachRate}%</p>
                                                                                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                                                                        <Users className="h-2.5 w-2.5" /> DM Reach
                                                                                    </p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-xl font-bold tabular-nums">{vs.interested}</p>
                                                                                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                                                                        <Target className="h-2.5 w-2.5" /> Interested
                                                                                    </p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-xl font-bold tabular-nums">{vs.interestRate}%</p>
                                                                                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                                                                        <TrendingUp className="h-2.5 w-2.5" /> Int. Rate
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </CardContent>
                                                                    </Card>
                                                                ))}
                                                            </div>

                                                            {/* Attempts table */}
                                                            {attemptData.attempts.length > 0 && (
                                                                <div className="border rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
                                                                    <table className="w-full text-sm">
                                                                        <thead className="sticky top-0 z-10">
                                                                            <tr className="border-b bg-muted/80 backdrop-blur">
                                                                                <th className="p-2 text-left text-xs font-medium text-muted-foreground">Company</th>
                                                                                <th className="p-2 text-left text-xs font-medium text-muted-foreground">Variant</th>
                                                                                <th className="p-2 text-left text-xs font-medium text-muted-foreground">Outcome</th>
                                                                                <th className="p-2 text-center text-xs font-medium text-muted-foreground">DM</th>
                                                                                <th className="p-2 text-left text-xs font-medium text-muted-foreground">Stage</th>
                                                                                <th className="p-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {attemptData.attempts.map(a => (
                                                                                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                                                                                    <td className="p-2 text-xs font-medium">{a.company || "—"}</td>
                                                                                    <td className="p-2">
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className={`text-[10px] ${a.isControl
                                                                                                ? "border-blue-200 text-blue-700"
                                                                                                : "border-purple-200 text-purple-700"
                                                                                                }`}
                                                                                        >
                                                                                            {a.variantName}
                                                                                        </Badge>
                                                                                    </td>
                                                                                    <td className="p-2 text-xs">{a.outcome || "—"}</td>
                                                                                    <td className="p-2 text-center">
                                                                                        {a.dmReached ? (
                                                                                            <span className="text-green-600 text-xs font-semibold">✓</span>
                                                                                        ) : (
                                                                                            <span className="text-muted-foreground text-xs">—</span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="p-2 text-xs text-muted-foreground">{a.stage || "—"}</td>
                                                                                    <td className="p-2 text-xs text-muted-foreground tabular-nums">
                                                                                        {new Date(a.timestamp).toLocaleDateString()}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}

                                                            {attemptData.attempts.length === 0 && (
                                                                <div className="text-center py-6 text-sm text-muted-foreground">
                                                                    No calls have been tagged with this experiment yet.
                                                                    Start a dial session with this experiment selected.
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-center py-6 text-sm text-muted-foreground">
                                                            No variant data available
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Completed conclusion */}
                                            {exp.status === "completed" && exp.conclusion && (
                                                <div className={`p-2 rounded text-xs ${exp.conclusionType === "adopt" ? "bg-green-50 border border-green-200" :
                                                    exp.conclusionType === "iterate" ? "bg-yellow-50 border border-yellow-200" :
                                                        "bg-red-50 border border-red-200"
                                                    }`}>
                                                    <span className="font-medium">
                                                        {exp.conclusionType === "adopt" ? "Adopted" :
                                                            exp.conclusionType === "iterate" ? "Iterating" : "Discarded"}:
                                                    </span>{" "}
                                                    {exp.conclusion}
                                                </div>
                                            )}

                                            {/* Conclusion form */}
                                            {isConcluding && (
                                                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                                                    <Label className="text-xs font-medium">Conclude Experiment</Label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {([
                                                            { value: "adopt" as const, label: "Adopt", desc: "Promote to playbook" },
                                                            { value: "iterate" as const, label: "Iterate", desc: "Refine & retest" },
                                                            { value: "discard" as const, label: "Discard", desc: "Didn't work" },
                                                        ]).map(opt => (
                                                            <button
                                                                key={opt.value}
                                                                type="button"
                                                                onClick={() => setConclusionType(opt.value)}
                                                                className={`p-2 rounded-lg border-2 text-left transition-all text-xs ${conclusionType === opt.value
                                                                    ? "border-purple-500 bg-purple-50"
                                                                    : "border-border hover:border-purple-300"
                                                                    }`}
                                                            >
                                                                <p className="font-medium">{opt.label}</p>
                                                                <p className="text-muted-foreground text-[10px]">{opt.desc}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <Textarea
                                                        className="text-sm resize-none"
                                                        rows={2}
                                                        placeholder="What did you learn? What's the takeaway?"
                                                        value={conclusionText}
                                                        onChange={e => setConclusionText(e.target.value)}
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" className="h-7 text-xs"
                                                            onClick={() => { setConcluding(null); setConclusionType(null); setConclusionText("") }}>
                                                            Cancel
                                                        </Button>
                                                        <Button size="sm" className="h-7 text-xs gap-1"
                                                            disabled={!conclusionType || !conclusionText.trim()}
                                                            onClick={() => handleConclude(exp.id)}>
                                                            <CheckCircle2 className="h-3 w-3" /> Finalize
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

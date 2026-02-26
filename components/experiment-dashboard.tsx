"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    ArrowLeft,
    Beaker,
    Trophy,
    TrendingUp,
    Users,
    CheckCircle2,
    BookOpen,
    Sparkles,
    Phone,
    ArrowUpRight,
    ArrowDownRight,
    Pause,
    Play,
    X,
} from "lucide-react"
import {
    type Experiment,
    type ExperimentVariant,
    type ConclusionType,
    useExperimentStatsQuery,
    useGetExperimentAttempts,
    useUpdateExperimentStatus,
    useConcludeExperiment,
    usePromoteExperimentToRule,
} from "@/queries/experiments"
import { OUTCOMES } from "@/lib/store"

// ─── Variant stat type (from attempts fetcher) ───
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

interface AttemptRow {
    id: string
    outcome: string | null
    dmReached: boolean
    timestamp: string
    variantId: string | null
    variantName: string
    isControl: boolean
    company: string | null
}

interface ExperimentDashboardProps {
    experiment: Experiment
    onBack: () => void
    onReviewCalls?: (experimentId: string) => void
    onDeepDiveCalls?: (experimentId: string, label: string) => void
}

export function ExperimentDashboard({
    experiment,
    onBack,
    onReviewCalls,
    onDeepDiveCalls,
}: ExperimentDashboardProps) {
    const { data: stats, isLoading: statsLoading } = useExperimentStatsQuery(experiment.id)
    const { getAttempts } = useGetExperimentAttempts()
    const updateStatus = useUpdateExperimentStatus()
    const concludeExperiment = useConcludeExperiment()
    const promoteToRule = usePromoteExperimentToRule()

    // Detailed data (attempts + variant stats)
    const [variantStats, setVariantStats] = useState<VariantStat[]>([])
    const [attempts, setAttempts] = useState<AttemptRow[]>([])
    const [loadingDetail, setLoadingDetail] = useState(true)

    // Conclusion form
    const [showConclude, setShowConclude] = useState(false)
    const [winnerVariantId, setWinnerVariantId] = useState<string | null>(null)
    const [conclusionType, setConclusionType] = useState<ConclusionType>("adopt")
    const [conclusionSummary, setConclusionSummary] = useState("")

    // Promote to playbook form
    const [showPromote, setShowPromote] = useState(false)
    const [promoteIfWhen, setPromoteIfWhen] = useState("")
    const [promoteThen, setPromoteThen] = useState("")
    const [promoteBecause, setPromoteBecause] = useState("")
    const [promoted, setPromoted] = useState(!!experiment.promotedRuleId)

    // Load detailed data on mount
    useEffect(() => {
        const loadDetail = async () => {
            setLoadingDetail(true)
            const result = await getAttempts(experiment.id)
            if (result) {
                setVariantStats(result.variantStats)
                setAttempts(result.attempts)
            }
            setLoadingDetail(false)
        }
        loadDetail()
    }, [experiment.id, getAttempts])

    const total = stats?.total ?? 0
    const progress = Math.min(100, Math.round((total / experiment.sampleSizeTarget) * 100))
    const isReady = total >= experiment.sampleSizeTarget
    const isCompleted = experiment.status === "completed"
    const winnerVariant = experiment.winnerVariantId
        ? experiment.variants.find(v => v.id === experiment.winnerVariantId)
        : null

    // Pre-fill promote form from experiment data
    const handleShowPromote = () => {
        setPromoteIfWhen(experiment.hypothesis)
        const winner = winnerVariant || experiment.variants.find(v => !v.isControl)
        setPromoteThen(winner?.protocol || winner?.description || "")
        // Auto-build "because" from stats
        const bestStat = variantStats.find(v => v.variantId === experiment.winnerVariantId)
        const controlStat = variantStats.find(v => v.isControl)
        if (bestStat && controlStat) {
            setPromoteBecause(
                `${bestStat.variantName} achieved ${bestStat.dmReachRate}% DM reach (${bestStat.dmReached}/${bestStat.total}) ` +
                `vs Control's ${controlStat.dmReachRate}% (${controlStat.dmReached}/${controlStat.total}). ` +
                `Interest rate: ${bestStat.interestRate}% vs ${controlStat.interestRate}%.`
            )
        }
        setShowPromote(true)
    }

    const handleConclude = async () => {
        await concludeExperiment.mutateAsync({
            experimentId: experiment.id,
            winnerVariantId,
            conclusionType,
            conclusionSummary,
        })
        setShowConclude(false)
    }

    const handlePromote = async () => {
        await promoteToRule.mutateAsync({
            experimentId: experiment.id,
            ifWhen: promoteIfWhen,
            thenAction: promoteThen,
            because: promoteBecause,
            confidence: experiment.conclusionType === "adopt" ? "proven" : "tested",
        })
        setPromoted(true)
        setShowPromote(false)
    }

    return (
        <div className="space-y-6">
            {/* Back + Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-border" />
                    <Beaker className="h-5 w-5 text-purple-600" />
                    <h2 className="text-lg font-semibold">{experiment.name}</h2>
                    <Badge
                        variant="outline"
                        className={`text-xs ${experiment.status === "active" ? "border-green-300 text-green-700" :
                            experiment.status === "paused" ? "border-yellow-300 text-yellow-700" :
                                experiment.status === "completed" ? "border-blue-300 text-blue-700" : ""
                            }`}
                    >
                        {experiment.status}
                    </Badge>
                    {isReady && !isCompleted && (
                        <Badge className="text-xs bg-green-100 text-green-700 border-green-300">
                            Ready for conclusion
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {onReviewCalls && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onReviewCalls(experiment.id)}>
                            <BookOpen className="h-3.5 w-3.5" />
                            Review Calls
                        </Button>
                    )}
                    {!isCompleted && experiment.status === "active" && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                            onClick={() => updateStatus.mutate({ id: experiment.id, status: "paused" })}>
                            <Pause className="h-3.5 w-3.5" />
                            Pause
                        </Button>
                    )}
                    {!isCompleted && experiment.status === "paused" && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                            onClick={() => updateStatus.mutate({ id: experiment.id, status: "active" })}>
                            <Play className="h-3.5 w-3.5" />
                            Resume
                        </Button>
                    )}
                    {!isCompleted && (
                        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowConclude(true)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Conclude
                        </Button>
                    )}
                </div>
            </div>

            {/* Hypothesis */}
            <Card className="border-purple-200/50 bg-purple-50/30">
                <CardContent className="py-4">
                    <p className="text-sm">
                        <span className="font-medium text-purple-700">Hypothesis:</span>{" "}
                        {experiment.hypothesis}
                    </p>
                    {experiment.successDefinition && (
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Success:</span> {experiment.successDefinition}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-3">
                <Card>
                    <CardContent className="py-4 text-center">
                        <p className="text-xs text-muted-foreground font-medium">Total Calls</p>
                        <p className="text-2xl font-bold tabular-nums mt-1">{total}</p>
                        <p className="text-xs text-muted-foreground">/ {experiment.sampleSizeTarget} target</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 text-center">
                        <p className="text-xs text-muted-foreground font-medium">Progress</p>
                        <p className="text-2xl font-bold tabular-nums mt-1">{progress}%</p>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                            <div
                                className={`h-full rounded-full transition-all ${isReady ? "bg-green-500" : "bg-purple-500"}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 text-center">
                        <p className="text-xs text-muted-foreground font-medium">Variants</p>
                        <p className="text-2xl font-bold tabular-nums mt-1">{experiment.variants.length}</p>
                        <p className="text-xs text-muted-foreground">{experiment.variants.filter(v => v.isControl).length} control</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 text-center">
                        <p className="text-xs text-muted-foreground font-medium">Duration</p>
                        <p className="text-2xl font-bold tabular-nums mt-1">
                            {Math.ceil((Date.now() - new Date(experiment.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d
                        </p>
                        <p className="text-xs text-muted-foreground">since created</p>
                    </CardContent>
                </Card>
            </div>

            {/* Variant Comparison */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        Variant Comparison
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingDetail ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Loading variant stats…</p>
                    ) : variantStats.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2 font-medium text-muted-foreground">Variant</th>
                                        <th className="text-center p-2 font-medium text-muted-foreground">Calls</th>
                                        <th className="text-center p-2 font-medium text-muted-foreground">DM Reached</th>
                                        <th className="text-center p-2 font-medium text-muted-foreground">DM Rate</th>
                                        <th className="text-center p-2 font-medium text-muted-foreground">Interested</th>
                                        <th className="text-center p-2 font-medium text-muted-foreground">Interest Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {variantStats.map((v) => {
                                        const isWinner = experiment.winnerVariantId === v.variantId
                                        const controlStat = variantStats.find(s => s.isControl)
                                        const dmDelta = controlStat && !v.isControl ? v.dmReachRate - controlStat.dmReachRate : null
                                        return (
                                            <tr key={v.variantId} className={`border-b last:border-0 ${isWinner ? "bg-green-50/50" : ""}`}>
                                                <td className="p-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{v.variantName}</span>
                                                        {v.isControl && (
                                                            <Badge variant="outline" className="text-[10px]">Control</Badge>
                                                        )}
                                                        {isWinner && (
                                                            <Badge className="text-[10px] bg-green-100 text-green-700">
                                                                <Trophy className="h-2.5 w-2.5 mr-0.5" /> Winner
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-center p-2 tabular-nums font-medium">{v.total}</td>
                                                <td className="text-center p-2 tabular-nums">{v.dmReached}</td>
                                                <td className="text-center p-2">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span className="tabular-nums font-medium">{v.dmReachRate}%</span>
                                                        {dmDelta !== null && (
                                                            <span className={`text-xs flex items-center ${dmDelta > 0 ? "text-green-600" : dmDelta < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                                                                {dmDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : dmDelta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                                                                {dmDelta > 0 ? "+" : ""}{dmDelta}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-center p-2 tabular-nums">{v.interested}</td>
                                                <td className="text-center p-2 tabular-nums font-medium">{v.interestRate}%</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Conclusion Panel (completed experiments) */}
            {isCompleted && experiment.conclusion && (
                <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            Conclusion
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Badge className={`${experiment.conclusionType === "adopt" ? "bg-green-100 text-green-700" :
                                experiment.conclusionType === "iterate" ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-700"
                                }`}>
                                {experiment.conclusionType === "adopt" ? "Adopt" :
                                    experiment.conclusionType === "iterate" ? "Iterate" : "Discard"}
                            </Badge>
                            {winnerVariant && (
                                <span className="text-sm">
                                    Winner: <span className="font-medium">{winnerVariant.name}</span>
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">{experiment.conclusion}</p>
                        {/* Promote to knowledge base */}
                        {!promoted && experiment.conclusionType !== "discard" && (
                            <Button variant="outline" size="sm" className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50"
                                onClick={handleShowPromote}>
                                <BookOpen className="h-3.5 w-3.5" />
                                Promote to Playbook
                            </Button>
                        )}
                        {promoted && (
                            <div className="flex items-center gap-2 text-sm text-green-700">
                                <Sparkles className="h-4 w-4" />
                                <span>Promoted to playbook rule</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Call Timeline */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            Recent Calls ({attempts.length})
                        </CardTitle>
                        {onDeepDiveCalls && attempts.length > 0 && (
                            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7"
                                onClick={() => onDeepDiveCalls(experiment.id, experiment.name)}>
                                <BookOpen className="h-3 w-3" />
                                Deep Dive Experiment
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingDetail ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Loading calls…</p>
                    ) : attempts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No calls recorded yet</p>
                    ) : (
                        <div className="max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-card">
                                    <tr className="border-b">
                                        <th className="text-left p-2 font-medium text-muted-foreground">Company</th>
                                        <th className="text-left p-2 font-medium text-muted-foreground">Variant</th>
                                        <th className="text-left p-2 font-medium text-muted-foreground">Outcome</th>
                                        <th className="text-center p-2 font-medium text-muted-foreground">DM</th>
                                        <th className="text-right p-2 font-medium text-muted-foreground">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attempts.slice(0, 50).map((a) => (
                                        <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="p-2 font-medium">{a.company || "Unknown"}</td>
                                            <td className="p-2">
                                                <Badge variant="outline" className={`text-[10px] ${a.isControl ? "border-blue-200 text-blue-600" : "border-purple-200 text-purple-600"}`}>
                                                    {a.variantName}
                                                </Badge>
                                            </td>
                                            <td className="p-2">
                                                <Badge variant={
                                                    a.outcome === OUTCOMES.MEETING_SET.value ? "default" :
                                                        a.outcome?.includes("interest") ? "secondary" : "outline"
                                                } className="text-[10px]">
                                                    {a.outcome || "—"}
                                                </Badge>
                                            </td>
                                            <td className="text-center p-2">
                                                {a.dmReached ? "✓" : "—"}
                                            </td>
                                            <td className="text-right p-2 text-xs text-muted-foreground tabular-nums">
                                                {new Date(a.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── Conclude Dialog (inline) ─── */}
            {showConclude && (
                <Card className="border-2 border-purple-400 shadow-lg">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-purple-600" />
                                Conclude Experiment
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowConclude(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <CardDescription>Record your findings and decide what to do next</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Decision type */}
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Decision</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    { value: "adopt" as ConclusionType, label: "Adopt", desc: "Use this approach going forward" },
                                    { value: "iterate" as ConclusionType, label: "Iterate", desc: "Needs more testing or refinement" },
                                    { value: "discard" as ConclusionType, label: "Discard", desc: "Didn't work, revert to control" },
                                ]).map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setConclusionType(opt.value)}
                                        className={`p-3 rounded-lg border-2 text-left transition-all ${conclusionType === opt.value
                                            ? "border-purple-500 bg-purple-50"
                                            : "border-border hover:border-purple-300"
                                            }`}
                                    >
                                        <p className="font-medium text-sm">{opt.label}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Winner variant */}
                        {conclusionType !== "discard" && (
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Winning Variant</Label>
                                <div className="flex gap-2">
                                    {experiment.variants.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => setWinnerVariantId(v.id)}
                                            className={`flex-1 p-2 rounded-lg border-2 text-center transition-all ${winnerVariantId === v.id
                                                ? "border-green-500 bg-green-50"
                                                : "border-border hover:border-green-300"
                                                }`}
                                        >
                                            <p className="font-medium text-sm">{v.name}</p>
                                            {v.isControl && <p className="text-[10px] text-muted-foreground">Control</p>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Conclusion Summary *</Label>
                            <Textarea
                                value={conclusionSummary}
                                onChange={(e) => setConclusionSummary(e.target.value)}
                                placeholder="What did you learn? What should the team know?"
                                rows={3}
                                className="resize-none"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowConclude(false)}>Cancel</Button>
                            <Button
                                onClick={handleConclude}
                                disabled={!conclusionSummary.trim() || concludeExperiment.isPending}
                            >
                                {concludeExperiment.isPending ? "Saving…" : "Conclude Experiment"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ─── Promote to Playbook Dialog (inline) ─── */}
            {showPromote && (
                <Card className="border-2 border-purple-400 shadow-lg">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-purple-600" />
                                Promote to Playbook
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowPromote(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <CardDescription>
                            Create a playbook rule from this experiment&apos;s findings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">If / When</Label>
                            <Input
                                value={promoteIfWhen}
                                onChange={(e) => setPromoteIfWhen(e.target.value)}
                                placeholder="When should this rule apply?"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Then do this</Label>
                            <Input
                                value={promoteThen}
                                onChange={(e) => setPromoteThen(e.target.value)}
                                placeholder="What should the team do?"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Because (evidence)</Label>
                            <Textarea
                                value={promoteBecause}
                                onChange={(e) => setPromoteBecause(e.target.value)}
                                placeholder="Why does this work? Stats will be pre-filled."
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowPromote(false)}>Cancel</Button>
                            <Button
                                onClick={handlePromote}
                                disabled={!promoteIfWhen.trim() || !promoteThen.trim() || promoteToRule.isPending}
                            >
                                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                {promoteToRule.isPending ? "Creating…" : "Create Rule"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

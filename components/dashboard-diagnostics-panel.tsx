"use client"

import { useState, useMemo } from "react"
import { useFrictionLogs, useFrictionCategories } from "@/hooks/use-friction"
import { useScripts } from "@/hooks/use-scripts"
import { useCategories } from "@/hooks/use-categories"
import { useMetricDefinitions, useMetricGoals } from "@/hooks/use-metrics"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Activity,
    TrendingUp,
    TrendingDown,
    Minus,
    Clock,
    BarChart3,
    Target,
    Zap,
    AlertTriangle,
    FileText,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    Settings2,
    ChevronDown,
    ChevronRight,
} from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"
import type { MetricDefinition } from "@/lib/metrics"

// ─── Utility ───

function groupByPeriod<T extends { createdAt: string }>(items: T[], days: number): T[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return items.filter((i) => new Date(i.createdAt).getTime() >= cutoff)
}

function percentChange(current: number, previous: number): { value: number; direction: "up" | "down" | "flat" } {
    if (previous === 0 && current === 0) return { value: 0, direction: "flat" }
    if (previous === 0) return { value: 100, direction: "up" }
    const change = ((current - previous) / previous) * 100
    return {
        value: Math.abs(Math.round(change)),
        direction: change > 2 ? "up" : change < -2 ? "down" : "flat",
    }
}

const TrendIcon = ({ dir }: { dir: "up" | "down" | "flat" }) => {
    if (dir === "up") return <TrendingUp className="h-3 w-3 text-green-500" />
    if (dir === "down") return <TrendingDown className="h-3 w-3 text-red-500" />
    return <Minus className="h-3 w-3 text-muted-foreground" />
}

// ─── KPI Card ───

function KpiCard({ title, value, subtitle, icon: Icon, trend, goal, color }: {
    title: string
    value: string | number
    subtitle?: string
    icon: React.ComponentType<{ className?: string }>
    trend?: { value: number; direction: "up" | "down" | "flat" }
    goal?: { target: number; current: number }
    color?: string
}) {
    const goalPercent = goal ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : null

    return (
        <Card className="relative overflow-hidden">
            {color && (
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
            )}
            <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Icon className="h-3 w-3" />
                            {title}
                        </p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1">
                            <TrendIcon dir={trend.direction} />
                            <span className="text-xs text-muted-foreground">{trend.value}%</span>
                        </div>
                    )}
                </div>
                {goalPercent !== null && (
                    <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>Goal: {goal!.target}</span>
                            <span>{goalPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${goalPercent}%`,
                                    backgroundColor: goalPercent >= 100 ? "hsl(142, 76%, 36%)" : goalPercent >= 70 ? "hsl(47, 100%, 50%)" : "hsl(0, 84%, 60%)",
                                }}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Distribution Bar ───

function DistributionBar<T extends { id: string }>({ items, accessor, labelMap }: {
    items: T[]
    accessor: (item: T) => string | null
    labelMap: Map<string, { name: string; icon: string; color: string | null }>
}) {
    const counts = new Map<string, number>()
    items.forEach((i) => {
        const key = accessor(i)
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
    })

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
    const total = items.length || 1

    if (sorted.length === 0) {
        return <p className="text-xs text-muted-foreground italic">No data yet</p>
    }

    return (
        <div className="space-y-2">
            {sorted.slice(0, 6).map(([key, count]) => {
                const info = labelMap.get(key)
                return (
                    <div key={key} className="flex items-center gap-2">
                        <span className="w-5 flex items-center justify-center"><CategoryIcon icon={info?.icon ?? "circle-dot"} className="h-3.5 w-3.5" /></span>
                        <span className="text-xs font-medium w-28 truncate">{info?.name ?? key}</span>
                        <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                            <div
                                className="h-full rounded transition-all"
                                style={{
                                    width: `${(count / total) * 100}%`,
                                    backgroundColor: info?.color ?? "hsl(var(--primary))",
                                    opacity: 0.7,
                                }}
                            />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-12 text-right">{count} ({Math.round((count / total) * 100)}%)</span>
                    </div>
                )
            })}
        </div>
    )
}

// ─── Metric Definition Dialog ───

function MetricDialog({
    open,
    onOpenChange,
    metric,
    onSave,
    isPending,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    metric?: MetricDefinition | null
    onSave: (data: { name: string; slug: string; description?: string; unit?: string; aggregation?: MetricDefinition["aggregation"]; icon?: string; color?: string }) => void
    isPending: boolean
}) {
    const [name, setName] = useState(metric?.name ?? "")
    const [slug, setSlug] = useState(metric?.slug ?? "")
    const [description, setDescription] = useState(metric?.description ?? "")
    const [unit, setUnit] = useState(metric?.unit ?? "%")
    const [aggregation, setAggregation] = useState(metric?.aggregation ?? "avg")
    const [icon, setIcon] = useState(metric?.icon ?? "bar-chart")

    const handleSubmit = () => {
        if (!name.trim()) return
        const autoSlug = slug.trim() || name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
        onSave({
            name: name.trim(),
            slug: autoSlug,
            description: description.trim() || undefined,
            unit,
            aggregation: aggregation as MetricDefinition["aggregation"],
            icon,
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{metric ? "Edit Metric" : "New Metric"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label className="text-xs">Name</Label>
                        <Input className="h-9 mt-1" placeholder="e.g., Connect Rate" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label className="text-xs">Unit</Label>
                            <Input className="h-9 mt-1" placeholder="%, calls, etc." value={unit} onChange={(e) => setUnit(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs">Aggregation</Label>
                            <Select value={aggregation} onValueChange={(v) => setAggregation(v as MetricDefinition["aggregation"])}>
                                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="avg">Average</SelectItem>
                                    <SelectItem value="sum">Sum</SelectItem>
                                    <SelectItem value="count">Count</SelectItem>
                                    <SelectItem value="min">Min</SelectItem>
                                    <SelectItem value="max">Max</SelectItem>
                                    <SelectItem value="latest">Latest</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Icon</Label>
                            <Input className="h-9 mt-1" value={icon} onChange={(e) => setIcon(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Description</Label>
                        <Input className="h-9 mt-1" placeholder="What does this metric track?" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
                        {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        {metric ? "Save" : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Goal Dialog ───

function GoalDialog({ open, onOpenChange, metricName, existingGoal, onSave, isPending }: {
    open: boolean
    onOpenChange: (v: boolean) => void
    metricName: string
    existingGoal?: { id: string; targetValue: number; period: string; notes?: string } | null
    onSave: (data: { targetValue: number; period: string; notes?: string }) => void
    isPending: boolean
}) {
    const [target, setTarget] = useState(existingGoal?.targetValue?.toString() ?? "")
    const [period, setPeriod] = useState(existingGoal?.period ?? "monthly")
    const [notes, setNotes] = useState(existingGoal?.notes ?? "")

    const handleSubmit = () => {
        const val = parseFloat(target)
        if (isNaN(val) || val <= 0) return
        onSave({ targetValue: val, period, notes: notes.trim() || undefined })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>{existingGoal ? "Edit Goal" : "Set Goal"} — {metricName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs">Target Value</Label>
                        <Input className="h-9 mt-1" type="number" min={0} step="any" placeholder="e.g., 80" value={target} onChange={(e) => setTarget(e.target.value)} autoFocus />
                    </div>
                    <div>
                        <Label className="text-xs">Period</Label>
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs">Notes</Label>
                        <Input className="h-9 mt-1" placeholder="Optional context" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!target || parseFloat(target) <= 0 || isPending}>
                        {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        {existingGoal ? "Update" : "Set Goal"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Custom Metrics Section ───

function CustomMetricsSection() {
    const { metrics, activeMetrics, addMetric, editMetric, removeMetric, isLoading } = useMetricDefinitions()
    const { goals, addGoal, editGoal, removeGoal } = useMetricGoals()
    const { toast } = useToast()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [goalDialogMetric, setGoalDialogMetric] = useState<MetricDefinition | null>(null)
    const [editingMetric, setEditingMetric] = useState<MetricDefinition | null>(null)
    const [isOpen, setIsOpen] = useState(true)

    const goalMap = useMemo(() => {
        const map = new Map<string, { id: string; targetValue: number; period: string; notes?: string }>()
        goals.forEach(g => map.set(g.metricId, { id: g.id, targetValue: g.targetValue, period: g.period, notes: g.notes ?? undefined }))
        return map
    }, [goals])

    const handleSave = (data: { name: string; slug: string; description?: string; unit?: string; aggregation?: MetricDefinition["aggregation"]; icon?: string; color?: string }) => {
        addMetric.mutate(data, {
            onSuccess: () => { setDialogOpen(false); toast({ title: "Metric created" }) },
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        })
    }

    const handleEditSave = (data: { name: string; slug: string; description?: string; unit?: string; aggregation?: MetricDefinition["aggregation"]; icon?: string; color?: string }) => {
        if (!editingMetric) return
        editMetric.mutate(
            { id: editingMetric.id, updates: { name: data.name, slug: data.slug, description: data.description, unit: data.unit, aggregation: data.aggregation, icon: data.icon, color: data.color } },
            { onSuccess: () => { setEditingMetric(null); toast({ title: "Metric updated" }) }, onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }) }
        )
    }

    const handleGoalSave = (data: { targetValue: number; period: string; notes?: string }) => {
        if (!goalDialogMetric) return
        const existing = goalMap.get(goalDialogMetric.id)
        if (existing) {
            editGoal.mutate(
                { id: existing.id, updates: { targetValue: data.targetValue, period: data.period as "daily" | "weekly" | "monthly" | "quarterly", notes: data.notes } },
                { onSuccess: () => { setGoalDialogMetric(null); toast({ title: "Goal updated" }) }, onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }) }
            )
        } else {
            const now = new Date().toISOString().split("T")[0]
            addGoal.mutate(
                { metricId: goalDialogMetric.id, targetValue: data.targetValue, period: data.period as "daily" | "weekly" | "monthly" | "quarterly", startDate: now, notes: data.notes },
                { onSuccess: () => { setGoalDialogMetric(null); toast({ title: "Goal set" }) }, onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }) }
            )
        }
    }

    const handleDelete = (metric: MetricDefinition) => {
        if (!confirm(`Delete "${metric.name}"?`)) return
        removeMetric.mutate(metric.id, {
            onSuccess: () => toast({ title: "Metric deleted" }),
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        })
    }

    if (isLoading) return null

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 rounded-lg px-2 py-1.5 transition-colors">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        <Settings2 className="h-4 w-4 text-primary" />
                        Custom Metrics ({activeMetrics.length})
                    </h4>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={(e) => { e.stopPropagation(); setDialogOpen(true) }}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                    </Button>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                {activeMetrics.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                        No custom metrics defined. Add metrics like Connect Rate, Meetings Booked, etc.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        {activeMetrics.map((metric) => {
                            const goal = goalMap.get(metric.id)
                            return (
                                <div key={metric.id} className="group relative">
                                    <KpiCard
                                        title={metric.name}
                                        value="—"
                                        subtitle={`${metric.aggregation} · ${metric.unit}`}
                                        icon={Activity}
                                        color={metric.color ?? undefined}
                                        goal={goal ? { target: goal.targetValue, current: 0 } : undefined}
                                    />
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setGoalDialogMetric(metric)} title="Set Goal">
                                            <Target className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditingMetric(metric)} title="Edit">
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete(metric)} title="Delete">
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CollapsibleContent>

            <MetricDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSave={handleSave}
                isPending={addMetric.isPending}
            />
            {editingMetric && (
                <MetricDialog
                    open={!!editingMetric}
                    onOpenChange={(v) => { if (!v) setEditingMetric(null) }}
                    metric={editingMetric}
                    onSave={handleEditSave}
                    isPending={editMetric.isPending}
                />
            )}
            {goalDialogMetric && (
                <GoalDialog
                    open={!!goalDialogMetric}
                    onOpenChange={(v) => { if (!v) setGoalDialogMetric(null) }}
                    metricName={goalDialogMetric.name}
                    existingGoal={goalMap.get(goalDialogMetric.id) ?? null}
                    onSave={handleGoalSave}
                    isPending={addGoal.isPending || editGoal.isPending}
                />
            )}
        </Collapsible>
    )
}

// ─── Main Diagnostics Panel ───

export function DashboardDiagnosticsPanel() {
    const { logs, isLoading: logsLoading } = useFrictionLogs()
    const { categories: frictionCats } = useFrictionCategories()
    const { scripts, isLoading: scriptsLoading } = useScripts()
    const { activeCategories: rootCauseTypes } = useCategories("root_cause_type")

    const metrics = useMemo(() => {
        const now = Date.now()
        const thisWeek = groupByPeriod(logs, 7)
        const lastWeek = logs.filter((l) => {
            const t = new Date(l.createdAt).getTime()
            return t >= now - 14 * 24 * 60 * 60 * 1000 && t < now - 7 * 24 * 60 * 60 * 1000
        })

        const frictionTrend = percentChange(thisWeek.length, lastWeek.length)
        const totalScripts = scripts.length
        const pinnedScripts = scripts.filter((s) => s.isPinned).length
        const totalUsage = scripts.reduce((sum, s) => sum + s.timesUsed, 0)
        const topScript = [...scripts].sort((a, b) => b.timesUsed - a.timesUsed)[0]

        return { totalFriction: logs.length, weeklyFriction: thisWeek.length, frictionTrend, totalScripts, pinnedScripts, totalUsage, topScript }
    }, [logs, scripts])

    const frictionCatMap = useMemo(
        () => new Map(frictionCats.map((c) => [c.id, { name: c.name, icon: c.icon ?? "circle-dot", color: null }])),
        [frictionCats]
    )

    const rootCauseMap = useMemo(
        () => new Map(rootCauseTypes.map((c) => [c.id, { name: c.name, icon: c.icon, color: c.color }])),
        [rootCauseTypes]
    )

    const isLoading = logsLoading || scriptsLoading

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Built-in KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                    title="Total Friction"
                    value={metrics.totalFriction}
                    subtitle="All time"
                    icon={AlertTriangle}
                />
                <KpiCard
                    title="This Week"
                    value={metrics.weeklyFriction}
                    subtitle="Friction events"
                    icon={Clock}
                    trend={metrics.frictionTrend}
                />
                <KpiCard
                    title="Scripts"
                    value={metrics.totalScripts}
                    subtitle={`${metrics.pinnedScripts} pinned`}
                    icon={FileText}
                />
                <KpiCard
                    title="Script Usage"
                    value={metrics.totalUsage}
                    subtitle={metrics.topScript ? `Top: ${metrics.topScript.title}` : "—"}
                    icon={Zap}
                />
            </div>

            {/* Custom Metrics Section */}
            <CustomMetricsSection />

            {/* Distribution Charts */}
            <div className="grid md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Friction by Category
                        </CardTitle>
                        <CardDescription className="text-xs">Where are you getting stuck?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DistributionBar
                            items={logs}
                            accessor={(l) => l.categoryId}
                            labelMap={frictionCatMap}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Root Cause Analysis
                        </CardTitle>
                        <CardDescription className="text-xs">Why does friction happen?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DistributionBar
                            items={logs.filter((l) => l.rootCauseId)}
                            accessor={(l) => l.rootCauseId}
                            labelMap={rootCauseMap}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Recent Friction Timeline */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Recent Friction (Last 7 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {groupByPeriod(logs, 7).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-4 text-center">No friction this week — great work!</p>
                    ) : (
                        <div className="space-y-1">
                            {groupByPeriod(logs, 7)
                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .slice(0, 10)
                                .map((log) => {
                                    const d = new Date(log.createdAt)
                                    const catInfo = frictionCatMap.get(log.categoryId)
                                    return (
                                        <div key={log.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-muted/50">
                                            <CategoryIcon icon={catInfo?.icon ?? "circle-dot"} className="h-3.5 w-3.5" />
                                            <span className="font-medium">{catInfo?.name ?? "Unknown"}</span>
                                            {log.note && <span className="text-muted-foreground truncate flex-1">— {log.note}</span>}
                                            <span className="text-muted-foreground shrink-0">
                                                {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                            </span>
                                        </div>
                                    )
                                })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

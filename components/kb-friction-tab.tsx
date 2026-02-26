"use client"

import { useState, useMemo } from "react"
import { useFrictionCategories, useFrictionLogs, type FrictionCategory, type FrictionLog } from "@/hooks/use-friction"
import { useCategories } from "@/hooks/use-categories"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { CategoryManager } from "@/components/category-manager"
import {
    AlertTriangle,
    TrendingUp,
    Loader2,
    Search,
    CheckCircle2,
    Clock,
    BarChart3,
    XCircle,
    Filter,
    Plus,
    Zap,
    Phone,
    PenLine,
} from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"

// ─── Friction Stats Card ───

function StatsRow({ logs, categories }: { logs: FrictionLog[]; categories: FrictionCategory[] }) {
    const total = logs.length
    const today = logs.filter((l) => {
        const d = new Date(l.createdAt)
        const now = new Date()
        return d.toDateString() === now.toDateString()
    }).length
    const thisWeek = logs.filter((l) => {
        const d = new Date(l.createdAt)
        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return d >= oneWeekAgo
    }).length

    // Top category
    const catCounts = new Map<string, number>()
    logs.forEach((l) => {
        catCounts.set(l.categoryId, (catCounts.get(l.categoryId) ?? 0) + 1)
    })
    let topCatId = ""
    let topCount = 0
    catCounts.forEach((count, id) => {
        if (count > topCount) { topCatId = id; topCount = count }
    })
    const topCat = categories.find((c) => c.id === topCatId)

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
                <CardContent className="pt-4 pb-3 px-4">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{total}</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-4 pb-3 px-4">
                    <p className="text-xs text-muted-foreground">Today</p>
                    <p className="text-2xl font-bold">{today}</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-4 pb-3 px-4">
                    <p className="text-xs text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold">{thisWeek}</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-4 pb-3 px-4">
                    <p className="text-xs text-muted-foreground">Top Category</p>
                    <div className="flex items-center gap-1.5">
                        {topCat ? (
                            <>
                                <CategoryIcon icon={topCat.icon} className="h-3.5 w-3.5" />
                                <span className="text-sm font-medium truncate">{topCat.name} ({topCount})</span>
                            </>
                        ) : (
                            <span className="text-sm font-medium">—</span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// ─── Category Breakdown ───

function CategoryBreakdown({ logs, categories }: { logs: FrictionLog[]; categories: FrictionCategory[] }) {
    const catCounts = useMemo(() => {
        const m = new Map<string, number>()
        logs.forEach((l) => m.set(l.categoryId, (m.get(l.categoryId) ?? 0) + 1))
        return m
    }, [logs])

    const sorted = [...categories]
        .map((c) => ({ ...c, count: catCounts.get(c.id) ?? 0 }))
        .sort((a, b) => b.count - a.count)

    const maxCount = Math.max(1, ...sorted.map((c) => c.count))

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Category Breakdown
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {sorted.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-3">
                        <span className="w-6 flex items-center justify-center"><CategoryIcon icon={cat.icon ?? "circle-dot"} className="h-4 w-4" /></span>
                        <span className="text-xs font-medium w-32 truncate">{cat.name}</span>
                        <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${(cat.count / maxCount) * 100}%`,
                                    backgroundColor: cat.color ?? "hsl(var(--primary) / 0.6)",
                                }}
                            />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{cat.count}</span>
                    </div>
                ))}
                {sorted.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">No friction logged yet.</p>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Friction Log Row ───

function FrictionLogRow({
    log,
    categoryName,
    categoryIcon,
    rootCauseName,
}: {
    log: FrictionLog
    categoryName: string
    categoryIcon: string
    rootCauseName: string | null
}) {
    const d = new Date(log.createdAt)
    const timeStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    const isResolved = !!log.resolvedAt
    const isFromCall = !!log.attemptId

    return (
        <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-sm ${isResolved ? "opacity-60 bg-muted/20" : ""}`}>
            <div className="shrink-0 mt-0.5 text-lg">
                <CategoryIcon icon={categoryIcon || (isResolved ? "check-circle" : "zap")} className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] h-5">{categoryName}</Badge>
                    {rootCauseName && (
                        <Badge variant="secondary" className="text-[10px] h-5">{rootCauseName}</Badge>
                    )}
                    {isFromCall && (
                        <Badge variant="secondary" className="text-[10px] h-5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            <Phone className="h-3 w-3 inline mr-0.5" /> During call
                        </Badge>
                    )}
                    {!isFromCall && (
                        <Badge variant="secondary" className="text-[10px] h-5 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            <PenLine className="h-3 w-3 inline mr-0.5" /> Manual
                        </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                </div>
                {log.note && <p className="text-xs text-muted-foreground mt-1">{log.note}</p>}
            </div>
        </div>
    )
}

// ─── Standalone Friction Logger Dialog ───

function StandaloneFrictionLogger({
    categories,
    rootCauses,
    onLog,
    isPending,
}: {
    categories: FrictionCategory[]
    rootCauses: { id: string; name: string; icon: string }[]
    onLog: (categoryId: string, rootCauseId?: string, note?: string) => void
    isPending: boolean
}) {
    const [open, setOpen] = useState(false)
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
    const [selectedRootCauseId, setSelectedRootCauseId] = useState<string | null>(null)
    const [note, setNote] = useState("")

    const handleSubmit = () => {
        if (!selectedCategoryId) return
        onLog(selectedCategoryId, selectedRootCauseId ?? undefined, note.trim() || undefined)
        setSelectedCategoryId(null)
        setSelectedRootCauseId(null)
        setNote("")
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={(v) => {
            setOpen(v)
            if (!v) { setSelectedCategoryId(null); setSelectedRootCauseId(null); setNote("") }
        }}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    Log Friction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Log Friction
                    </DialogTitle>
                    <DialogDescription>
                        Record a friction moment — something that went wrong, felt off, or needs improvement.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div>
                        <p className="text-sm font-medium mb-2">What happened?</p>
                        <div className="grid grid-cols-2 gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                    className={`p-3 rounded-lg text-left text-sm font-medium transition-all border ${selectedCategoryId === cat.id
                                        ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400 border-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-600"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent"
                                        }`}
                                >
                                    <span className="mr-1.5 inline-flex"><CategoryIcon icon={cat.icon} className="h-3.5 w-3.5" /></span>
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Root Cause — why it happened */}
                    {selectedCategoryId && rootCauses.length > 0 && (
                        <div>
                            <p className="text-sm font-medium mb-2">Why? <span className="text-xs text-muted-foreground font-normal">(optional — root cause)</span></p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {rootCauses.map((rc) => (
                                    <button
                                        key={rc.id}
                                        type="button"
                                        onClick={() => setSelectedRootCauseId(
                                            selectedRootCauseId === rc.id ? null : rc.id
                                        )}
                                        className={`p-2 rounded-lg text-left text-xs font-medium transition-all border ${selectedRootCauseId === rc.id
                                            ? "bg-blue-100 text-blue-800 ring-1 ring-blue-400 border-blue-400 dark:bg-blue-900/40 dark:text-blue-300"
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted/80 border-transparent"
                                            }`}
                                    >
                                        <span className="mr-1 inline-flex"><CategoryIcon icon={rc.icon} className="h-3.5 w-3.5" /></span>
                                        {rc.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-sm font-medium mb-1.5">Details (optional)</p>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value.slice(0, 200))}
                            placeholder="What specifically happened? What were you trying to do?"
                            className="text-sm resize-none"
                            rows={3}
                            maxLength={200}
                        />
                        <p className="text-[10px] text-muted-foreground text-right mt-1">{note.length}/200</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedCategoryId || isPending}
                        className="gap-1.5"
                    >
                        {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Zap className="h-3.5 w-3.5" />
                        )}
                        Log It
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Main Friction Tab ───

export function KbFrictionTab() {
    const { categories, activeCategories, isLoading: catsLoading } = useFrictionCategories()
    const { logs, isLoading: logsLoading, logFriction } = useFrictionLogs()
    const { activeCategories: rootCauseTypes } = useCategories("root_cause_type")
    const { toast } = useToast()

    const [search, setSearch] = useState("")
    const [filterCategory, setFilterCategory] = useState("_all")
    const [showSettings, setShowSettings] = useState(false)

    const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
    const rootCauseMap = useMemo(() => new Map(rootCauseTypes.map((c) => [c.id, c.name])), [rootCauseTypes])

    const filteredLogs = useMemo(() => {
        return logs.filter((l) => {
            if (search && !(l.note ?? "").toLowerCase().includes(search.toLowerCase())) return false
            if (filterCategory !== "_all" && l.categoryId !== filterCategory) return false
            return true
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }, [logs, search, filterCategory])

    const rootCausesList = rootCauseTypes.map(c => ({ id: c.id, name: c.name, icon: c.icon }))

    const handleManualLog = (categoryId: string, rootCauseId?: string, note?: string) => {
        logFriction.mutate(
            { categoryId, rootCauseId: rootCauseId ?? null, note: note ?? null },
            {
                onSuccess: () => {
                    toast({ title: "Friction logged", description: "Recorded outside of a call session." })
                },
                onError: () => {
                    toast({ title: "Failed to log", description: "Something went wrong.", variant: "destructive" })
                },
            }
        )
    }

    const isLoading = catsLoading || logsLoading

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Friction Log ({logs.length})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Track pain points during and outside of calls. Diagnose root causes and close the learning loop.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <StandaloneFrictionLogger
                        categories={activeCategories}
                        rootCauses={rootCausesList}
                        onLog={handleManualLog}
                        isPending={logFriction.isPending}
                    />
                    <Button size="sm" variant="outline" onClick={() => setShowSettings(!showSettings)}>
                        {showSettings ? "Hide Settings" : "Manage Categories"}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <StatsRow logs={logs} categories={categories} />

            {/* Category Breakdown */}
            <CategoryBreakdown logs={logs} categories={categories} />

            {/* Category Settings (collapsible) */}
            {showSettings && (
                <Card>
                    <CardContent className="pt-4 space-y-4">
                        <CategoryManager
                            categoryType="friction_type"
                            title="Friction Types"
                            description="Types used in the friction button during calls and manual logging"
                            showColor
                            iconPreset="friction_type"
                        />
                        <hr />
                        <CategoryManager
                            categoryType="root_cause_type"
                            title="Root Cause Types"
                            description="Why friction happened — for post-call diagnosis"
                            showColor
                            showDescription
                            iconPreset="root_cause_type"
                        />
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input className="h-9 pl-9 text-sm" placeholder="Search friction logs..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All Categories</SelectItem>
                        {activeCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}><span className="inline-flex items-center gap-1.5"><CategoryIcon icon={c.icon ?? "circle-dot"} className="h-3.5 w-3.5" /> {c.name}</span></SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Logs */}
            <div className="space-y-2">
                {filteredLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No friction logged yet.</p>
                        <p className="text-xs mt-1">Use the <strong>Log Friction</strong> button above, or the ⚡ button during calls.</p>
                    </div>
                ) : (
                    filteredLogs.slice(0, 50).map((log) => {
                        const cat = catMap.get(log.categoryId)
                        return (
                            <FrictionLogRow
                                key={log.id}
                                log={log}
                                categoryName={cat?.name ?? log.categoryName ?? "Unknown"}
                                categoryIcon={cat?.icon ?? log.categoryIcon ?? "zap"}
                                rootCauseName={log.rootCauseId ? rootCauseMap.get(log.rootCauseId) ?? null : null}
                            />
                        )
                    })
                )}
                {filteredLogs.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                        Showing first 50 of {filteredLogs.length} logs
                    </p>
                )}
            </div>
        </div>
    )
}

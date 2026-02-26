"use client"

import { useState } from "react"
import { useInvestigations } from "@/hooks/use-investigations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Loader2,
    Plus,
    Search,
    Pin,
    Clock,
    CheckCircle2,
    Archive,
} from "lucide-react"
import {
    INVESTIGATION_STATUSES,
    PRIORITY_CONFIG,
    investigationAge,
    type InvestigationStatus,
    type Priority,
    type Investigation,
} from "@/lib/investigations"

interface InvestigationListProps {
    /** Called when user clicks into an investigation */
    onSelect: (investigation: Investigation) => void
}

/**
 * Workspace 2 (List View): Shows all investigations with status,
 * priority, signal count, and age. Supports creating new ones.
 */
export function InvestigationList({ onSelect }: InvestigationListProps) {
    const [filterStatus, setFilterStatus] = useState<InvestigationStatus | "all">("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [newTitle, setNewTitle] = useState("")
    const [showCreate, setShowCreate] = useState(false)

    const statusArg = filterStatus === "all" ? undefined : filterStatus
    const { investigations, isLoading, createInvestigation } = useInvestigations(statusArg)

    const filtered = investigations.filter(inv =>
        inv.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleCreate = async () => {
        if (!newTitle.trim()) return
        try {
            const inv = await createInvestigation.mutateAsync({
                title: newTitle.trim(),
            })
            setNewTitle("")
            setShowCreate(false)
            onSelect(inv)
        } catch {
            // toast handled inside hook
        }
    }

    const statusIcon = (s: InvestigationStatus) => {
        switch (s) {
            case INVESTIGATION_STATUSES.OPEN:
                return <Search className="h-3 w-3 text-blue-500" />
            case INVESTIGATION_STATUSES.CRYSTALLIZED:
                return <CheckCircle2 className="h-3 w-3 text-green-500" />
            case INVESTIGATION_STATUSES.ARCHIVED:
                return <Archive className="h-3 w-3 text-slate-400" />
        }
    }

    return (
        <Card className="border-blue-300 dark:border-blue-800 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        🕵️ Investigations
                        {investigations.filter(i => i.status === INVESTIGATION_STATUSES.OPEN).length > 0 && (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0 ml-1 gap-1">
                                <Search className="h-3 w-3" />
                                {investigations.filter(i => i.status === INVESTIGATION_STATUSES.OPEN).length} open
                            </Badge>
                        )}
                    </CardTitle>
                    <Button
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => setShowCreate(!showCreate)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New Investigation
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Deep-dive into patterns. Pin signals, build hypotheses, and deploy cascading fixes when ready.
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Create new investigation */}
                {showCreate && (
                    <div className="flex gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Input
                            className="h-8 text-xs flex-1"
                            placeholder='e.g. "Why is the opener failing for trucking?"'
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter") handleCreate()
                                if (e.key === "Escape") setShowCreate(false)
                            }}
                            autoFocus
                        />
                        <Button
                            size="sm"
                            className="h-8 text-xs gap-1"
                            disabled={!newTitle.trim() || createInvestigation.isPending}
                            onClick={handleCreate}
                        >
                            {createInvestigation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Plus className="h-3 w-3" />
                            )}
                            Create
                        </Button>
                    </div>
                )}

                {/* Filter bar */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            className="h-8 text-xs pl-8"
                            placeholder="Search investigations..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select
                        value={filterStatus}
                        onValueChange={v => setFilterStatus(v as InvestigationStatus | "all")}
                    >
                        <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">All</SelectItem>
                            <SelectItem value={INVESTIGATION_STATUSES.OPEN} className="text-xs">
                                🔍 Open
                            </SelectItem>
                            <SelectItem value={INVESTIGATION_STATUSES.CRYSTALLIZED} className="text-xs">
                                ✅ Crystallized
                            </SelectItem>
                            <SelectItem value={INVESTIGATION_STATUSES.ARCHIVED} className="text-xs">
                                📦 Archived
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm font-medium">No investigations yet</p>
                        <p className="text-xs mt-1">
                            Start by pinning signals from the Feed, or create a new investigation above.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(inv => {
                            const pc = PRIORITY_CONFIG[inv.priority as Priority]
                            return (
                                <button
                                    key={inv.id}
                                    onClick={() => onSelect(inv)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-all text-left group"
                                >
                                    {/* Status icon */}
                                    <div className="shrink-0">
                                        {statusIcon(inv.status)}
                                    </div>

                                    {/* Title + metadata */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {inv.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                            <span className="flex items-center gap-0.5">
                                                <Pin className="h-2.5 w-2.5" />
                                                {inv.signalCount ?? 0} signals
                                            </span>
                                            <span className="flex items-center gap-0.5">
                                                <Clock className="h-2.5 w-2.5" />
                                                {investigationAge(inv.createdAt)}
                                            </span>
                                            {inv.hypothesis && (
                                                <span className="truncate max-w-[200px] italic">
                                                    "{inv.hypothesis}"
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Priority + Status badge */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge
                                            variant="outline"
                                            className={`text-[9px] h-5 px-1.5 ${pc.color} ${pc.border}`}
                                        >
                                            {pc.label}
                                        </Badge>
                                        <Badge
                                            variant={
                                                inv.status === INVESTIGATION_STATUSES.OPEN
                                                    ? "default"
                                                    : inv.status === INVESTIGATION_STATUSES.CRYSTALLIZED
                                                        ? "secondary"
                                                        : "outline"
                                            }
                                            className="text-[9px] h-5 px-1.5"
                                        >
                                            {inv.status === INVESTIGATION_STATUSES.OPEN
                                                ? "Open"
                                                : inv.status === INVESTIGATION_STATUSES.CRYSTALLIZED
                                                    ? "Deployed"
                                                    : "Archived"}
                                        </Badge>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

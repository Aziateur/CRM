"use client"

import { useInvestigations } from "@/hooks/use-investigations"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, Clock, Pin, BookOpen } from "lucide-react"
import {
    INVESTIGATION_STATUSES,
    PRIORITY_CONFIG,
    investigationAge,
    type Priority,
    type Investigation,
    type DeploymentReceiptEntry,
} from "@/lib/investigations"

interface ProvenConceptsArchiveProps {
    /** Called when user clicks into a crystallized investigation to view detail */
    onSelect: (investigation: Investigation) => void
}

/**
 * Proven Concepts (Company Lore) — read-only archive of crystallized
 * investigations with their deployment receipts. This is the institutional
 * memory of the sales floor.
 */
export function ProvenConceptsArchive({ onSelect }: ProvenConceptsArchiveProps) {
    const { investigations, isLoading } = useInvestigations(INVESTIGATION_STATUSES.CRYSTALLIZED)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading archive...
            </div>
        )
    }

    if (investigations.length === 0) {
        return (
            <Card className="border-green-200 bg-green-50/20 dark:border-green-900/40 dark:bg-green-950/10">
                <CardContent className="py-8 text-center space-y-2">
                    <BookOpen className="h-8 w-8 mx-auto text-green-400 opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">
                        No proven concepts yet
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        When you crystallize an investigation through the Deployment Matrix,
                        it becomes part of your company&apos;s institutional lore — a permanent
                        record of what you learned and how you deployed it.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
                📖 Company Lore — each concept was investigated, proven, and deployed to the live system.
            </p>

            {investigations.map(inv => {
                const pc = PRIORITY_CONFIG[inv.priority as Priority]
                const receipt = inv.deploymentReceipt ?? []

                return (
                    <button
                        key={inv.id}
                        onClick={() => onSelect(inv)}
                        className="w-full text-left rounded-lg border bg-card hover:bg-muted/30 transition-all overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 p-3 pb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{inv.title}</p>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-0.5">
                                        <Pin className="h-2.5 w-2.5" />
                                        {inv.signalCount ?? 0} signals
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <Clock className="h-2.5 w-2.5" />
                                        Investigated for {investigationAge(inv.createdAt)}
                                    </span>
                                    {inv.crystallizedAt && (
                                        <span>
                                            Deployed{" "}
                                            {new Date(inv.crystallizedAt).toLocaleDateString(
                                                "en-US",
                                                { month: "short", day: "numeric", year: "numeric" },
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Badge
                                variant="outline"
                                className={`text-[9px] h-5 px-1.5 ${pc.color} ${pc.border}`}
                            >
                                {pc.label}
                            </Badge>
                        </div>

                        {/* Hypothesis */}
                        {inv.hypothesis && (
                            <div className="px-3 pb-2 text-[11px] text-muted-foreground italic border-t border-dashed border-border/50">
                                <span className="text-[9px] uppercase tracking-wide font-semibold text-foreground/50 not-italic mr-1">
                                    Hypothesis:
                                </span>
                                {inv.hypothesis}
                            </div>
                        )}

                        {/* Deployment Receipt */}
                        {receipt.length > 0 && (
                            <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                                {receipt.map((item, i) => (
                                    <Badge
                                        key={i}
                                        variant="outline"
                                        className="text-[9px] h-4 px-1.5 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700"
                                    >
                                        {formatReceiptType(item.type)}: {item.label || item.id.slice(0, 8)}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </button>
                )
            })}
        </div>
    )
}

/** Friendly label for receipt type */
function formatReceiptType(type: DeploymentReceiptEntry["type"]): string {
    switch (type) {
        case "intel_entry":
            return "📚 Intel"
        case "segment":
            return "🧠 Segment"
        case "script_section":
            return "💬 Script"
        case "drill":
            return "🎭 Drill"
        case "stop_signal":
            return "🛑 Signal"
        default:
            return type
    }
}

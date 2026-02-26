"use client"

import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { isAgingSignal, signalAge } from "@/lib/investigations"
import type { ScriptInboxItem } from "@/hooks/use-playbook-engine"

interface SignalCardProps {
    signal: ScriptInboxItem
    /** Slot for action buttons (Discard, Incubate, Quick-Deploy, Unpin) */
    actions?: React.ReactNode
    /** Optional extra class for the container */
    className?: string
    /** Whether to show the aging glow */
    showAging?: boolean
}

/**
 * Reusable card for displaying a raw signal (transcript + rep note).
 * Used across the Feed, Investigation Evidence Board, and Quick-Deploy flows.
 */
export function SignalCard({
    signal,
    actions,
    className = "",
    showAging = true,
}: SignalCardProps) {
    const aging = showAging && isAgingSignal(signal.createdAt)

    return (
        <div
            className={`
                rounded-xl border overflow-hidden transition-all bg-card
                ${aging ? "border-amber-300 dark:border-amber-700 shadow-[0_0_12px_rgba(245,158,11,0.15)]" : "border-border"}
                ${className}
            `}
        >
            <div className="p-4 space-y-3">
                {/* Header: timestamp + traceability */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {signalAge(signal.createdAt)}
                        {aging && (
                            <Badge
                                variant="outline"
                                className="text-[9px] h-3.5 px-1 border-amber-400 text-amber-600 dark:text-amber-400"
                            >
                                Aging
                            </Badge>
                        )}
                        {signal.sourceAttemptId && (
                            <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                                Traceable
                            </Badge>
                        )}
                    </span>
                    {/* Action buttons slot */}
                    <div className="flex items-center gap-1">{actions}</div>
                </div>

                {/* Raw transcript */}
                <blockquote className="border-l-4 border-muted-foreground/30 pl-3 bg-muted/40 rounded-r-md py-2.5 pr-3 max-h-28 overflow-y-auto">
                    <p className="text-xs font-mono italic text-foreground/75 whitespace-pre-wrap leading-relaxed">
                        {signal.rawTranscript}
                    </p>
                </blockquote>

                {/* Rep note */}
                {signal.sourceRepNote && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0 mt-0.5">
                            Rep:
                        </span>
                        <span className="italic">{signal.sourceRepNote}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

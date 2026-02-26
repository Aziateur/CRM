"use client"

import { useState } from "react"
import { useScriptInbox, type ScriptInboxItem } from "@/hooks/use-playbook-engine"
import { useInvestigations } from "@/hooks/use-investigations"
import { useToast } from "@/hooks/use-toast"
import { SignalCard } from "@/components/incubator/signal-card"
import { IncubatePopover } from "@/components/incubator/incubate-popover"
import { QuickDeployForm } from "@/components/incubator/quick-deploy-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Trash2,
    Loader2,
    Inbox,
    Zap,
    CheckCircle2,
    FlaskConical,
    Search,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import { SIGNAL_STATUSES } from "@/lib/investigations"

/**
 * Workspace 1: The Raw Signal Feed
 *
 * Shows pending signals with exactly 3 actions:
 * 1. 🗑️ Discard — noise
 * 2. ⚡ Quick-Deploy — fast-track single-pillar fix
 * 3. 📌 Incubate — pin to an Investigation for deep analysis
 */
export function SignalFeed() {
    const { toast } = useToast()
    const { items, pendingCount, isLoading, discardSignal, incubateSignal } =
        useScriptInbox(SIGNAL_STATUSES.PENDING as "pending")
    const { openCount } = useInvestigations()

    if (isLoading) {
        return (
            <Card className="border-purple-200 bg-purple-50/30 dark:border-purple-900/40 dark:bg-purple-950/10">
                <CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading Signal Feed...</span>
                </CardContent>
            </Card>
        )
    }

    if (pendingCount === 0) {
        return (
            <Card className="border-green-200 bg-green-50/30 dark:border-green-900/40 dark:bg-green-950/10">
                <CardContent className="py-5 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold">
                            Inbox Zero: No new signals
                        </p>
                        <p className="text-xs text-muted-foreground">
                            When reps send call observations via Batch Review,
                            they appear here for triage.
                            {openCount > 0 && (
                                <span className="ml-1 text-blue-600 dark:text-blue-400">
                                    {openCount} open investigation
                                    {openCount !== 1 ? "s" : ""} waiting.
                                </span>
                            )}
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const handleDiscard = (id: string) => {
        discardSignal.mutate(id, {
            onSuccess: () =>
                toast({ title: "Signal discarded 🗑️" }),
            onError: (e) =>
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: e.message,
                }),
        })
    }

    const handleIncubate = (signalId: string, investigationId: string) => {
        incubateSignal.mutate(
            { id: signalId, investigationId },
            {
                onSuccess: () =>
                    toast({ title: "Signal pinned to investigation 📌" }),
                onError: (e) =>
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: e.message,
                    }),
            },
        )
    }

    return (
        <Card className="border-purple-300 dark:border-purple-800 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="h-5 w-5 text-purple-500" />
                    Signal Feed
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-0 ml-1 gap-1">
                        <Inbox className="h-3 w-3" />
                        {pendingCount} pending
                    </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Raw field friction — Discard noise, Quick-Deploy
                    obvious fixes, or Incubate patterns for deep
                    investigation.
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {items.map(signal => (
                    <SignalFeedItem
                        key={signal.id}
                        signal={signal}
                        onDiscard={() => handleDiscard(signal.id)}
                        onIncubate={(invId) =>
                            handleIncubate(signal.id, invId)
                        }
                        isDiscarding={discardSignal.isPending}
                    />
                ))}
            </CardContent>
        </Card>
    )
}

// ─── Individual Feed Item ───

function SignalFeedItem({
    signal,
    onDiscard,
    onIncubate,
    isDiscarding,
}: {
    signal: ScriptInboxItem
    onDiscard: () => void
    onIncubate: (investigationId: string) => void
    isDiscarding: boolean
}) {
    const [showQuickDeploy, setShowQuickDeploy] = useState(false)

    return (
        <div>
            <SignalCard
                signal={signal}
                actions={
                    <>
                        {/* 🗑️ Discard */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={onDiscard}
                            disabled={isDiscarding}
                            title="Discard — noise"
                        >
                            {isDiscarding ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                            )}
                        </Button>

                        {/* ⚡ Quick-Deploy toggle */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                            onClick={() => setShowQuickDeploy(!showQuickDeploy)}
                            title="Quick-Deploy — fast-track obvious fix"
                        >
                            <Zap className="h-3 w-3" />
                            {showQuickDeploy ? (
                                <ChevronUp className="h-3 w-3" />
                            ) : (
                                "Quick Fix"
                            )}
                        </Button>

                        {/* 📌 Incubate */}
                        <IncubatePopover onIncubate={onIncubate} />
                    </>
                }
            />

            {/* Inline Quick-Deploy form (expanded) */}
            {showQuickDeploy && (
                <div className="mt-2 ml-4 border-l-2 border-amber-300 dark:border-amber-700 pl-3">
                    <QuickDeployForm
                        item={signal}
                        onDone={() => setShowQuickDeploy(false)}
                        onBack={() => setShowQuickDeploy(false)}
                    />
                </div>
            )}
        </div>
    )
}

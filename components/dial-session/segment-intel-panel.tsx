"use client"

import { useState } from "react"
import { useKbForPrep } from "@/hooks/use-kb"
import { usePinnedSegmentEntries } from "@/hooks/use-segment-entries"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Brain, Pin, Loader2 } from "lucide-react"
import type { Lead } from "@/lib/store"
import { Badge } from "@/components/ui/badge"

interface SegmentIntelPanelProps {
    lead: Lead
}

// One unified briefing item from either source
interface BriefingItem {
    id: string
    title: string
    content: string
    source: "industry" | "segment"
    createdAt?: string
}

export function SegmentIntelPanel({ lead }: SegmentIntelPanelProps) {
    const [isOpen, setIsOpen] = useState(false)

    // Source A: Industry macro intel (kb_entries) — filtered by segment/stage
    const { prepEntries } = useKbForPrep(lead.segment, lead.stage)

    // Source B: ICP psychology (segment_entries) — pinned project-wide
    const { entries: pinnedSegmentEntries, isLoading: segLoading } = usePinnedSegmentEntries()

    // Only use pinned industry entries for the briefing
    const pinnedIndustryEntries = prepEntries.filter(e => e.isPinned)

    // Build unified briefing items
    const industryItems: BriefingItem[] = pinnedIndustryEntries.map(e => ({
        id: e.id,
        title: e.title,
        content: e.content,
        source: "industry",
        createdAt: e.createdAt,
    }))

    const icpItems: BriefingItem[] = pinnedSegmentEntries.map(e => ({
        id: e.id,
        title: e.title ?? "ICP Note",
        content: e.content,
        source: "segment",
        createdAt: e.createdAt,
    }))

    // Merge, sort newest first, slice to max 3
    const allItems = [...industryItems, ...icpItems]
        .sort((a, b) => {
            if (!a.createdAt && !b.createdAt) return 0
            if (!a.createdAt) return 1
            if (!b.createdAt) return -1
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        .slice(0, 3)

    // Hide the panel entirely if nothing to show (after load)
    if (!segLoading && allItems.length === 0) return null

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
            <Card className="border-blue-200 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/20">
                <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 hover:bg-blue-50/50 dark:hover:bg-blue-900/40 transition-colors rounded-lg">
                        <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                Pre-Call Briefing
                            </span>
                            {!segLoading && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-blue-600 border-blue-400/40 bg-blue-500/10">
                                    <Pin className="h-2.5 w-2.5 mr-0.5" />{allItems.length} pinned
                                </Badge>
                            )}
                        </div>
                        {isOpen
                            ? <ChevronDown className="h-4 w-4 text-blue-500" />
                            : <ChevronRight className="h-4 w-4 text-blue-500" />
                        }
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="pt-0 pb-3 px-3">
                        {segLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {allItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="flex items-start gap-2 p-2.5 bg-background/60 rounded border border-blue-100 dark:border-blue-900/50"
                                    >
                                        {/* 🌍 = Industry Macro Intel | 🧠 = ICP Psychology */}
                                        <span
                                            className="text-sm shrink-0 mt-0.5 select-none leading-none"
                                            title={item.source === "industry" ? "Macro Ecosystem Intel" : "ICP Psychology"}
                                        >
                                            {item.source === "industry" ? "🌍" : "🧠"}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate leading-tight">{item.title}</p>
                                            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed mt-0.5 line-clamp-3">
                                                {item.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}

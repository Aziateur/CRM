"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { SignalFeed } from "@/components/incubator/signal-feed"
import { InvestigationList } from "@/components/incubator/investigation-list"
import { InvestigationDetail } from "@/components/incubator/investigation-detail"
import { ProvenConceptsArchive } from "@/components/incubator/proven-concepts"
import { useScriptInbox } from "@/hooks/use-playbook-engine"
import { useInvestigations } from "@/hooks/use-investigations"
import {
    FlaskConical,
    Inbox,
    Search,
    Archive,
} from "lucide-react"
import {
    SIGNAL_STATUSES,
    INVESTIGATION_STATUSES,
    type Investigation,
} from "@/lib/investigations"

/**
 * Intelligence Incubator Hub
 *
 * The top-level component that replaces the old InsightLabPanel.
 * Routes between:
 *  - Signal Feed (Workspace 1)
 *  - Investigation List → Detail (Workspace 2 + 3)
 *  - Archive (Crystallized investigations)
 */
export function IncubatorHub() {
    const [activeTab, setActiveTab] = useState<"feed" | "investigations" | "archive">("feed")
    const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null)

    const { pendingCount } = useScriptInbox(SIGNAL_STATUSES.PENDING as "pending")
    const { openCount } = useInvestigations(INVESTIGATION_STATUSES.OPEN)

    // When inside an investigation detail, show that instead of the list
    if (selectedInvestigation) {
        return (
            <InvestigationDetail
                investigationId={selectedInvestigation.id}
                onBack={() => setSelectedInvestigation(null)}
            />
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-purple-500" />
                <h1 className="text-lg font-semibold">Intelligence Incubator</h1>
            </div>

            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
                <TabsList className="grid grid-cols-3 h-9">
                    <TabsTrigger value="feed" className="text-xs gap-1.5">
                        <Inbox className="h-3.5 w-3.5" />
                        Signal Feed
                        {pendingCount > 0 && (
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-0 h-4 text-[9px] px-1.5">
                                {pendingCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="investigations" className="text-xs gap-1.5">
                        <Search className="h-3.5 w-3.5" />
                        Investigations
                        {openCount > 0 && (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0 h-4 text-[9px] px-1.5">
                                {openCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="archive" className="text-xs gap-1.5">
                        <Archive className="h-3.5 w-3.5" />
                        Proven Concepts
                    </TabsTrigger>
                </TabsList>

                {/* Workspace 1: Signal Feed */}
                <TabsContent value="feed" className="mt-4">
                    <SignalFeed />
                </TabsContent>

                {/* Workspace 2: Investigations */}
                <TabsContent value="investigations" className="mt-4">
                    <InvestigationList
                        onSelect={inv => setSelectedInvestigation(inv)}
                    />
                </TabsContent>

                {/* Archive: Proven Concepts / Company Lore */}
                <TabsContent value="archive" className="mt-4">
                    <ProvenConceptsArchive
                        onSelect={inv => setSelectedInvestigation(inv)}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

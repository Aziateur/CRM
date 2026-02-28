"use client"

import { useState } from "react"
import { Topbar } from "@/components/topbar"
import { FieldTemplatesTab } from "@/components/field-templates-tab"
import { SequenceManager } from "@/components/sequence-editor"
import { WorkflowEditor } from "@/components/workflow-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClipboardList, Zap, GitBranch, BarChart3 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFieldTemplates } from "@/hooks/use-field-templates"
import { useSequences } from "@/hooks/use-sequences"
import { Badge } from "@/components/ui/badge"

// ============================================================================
// OVERVIEW DASHBOARD
// ============================================================================

function WorkCenterOverview() {
    const { templates } = useFieldTemplates()
    const { sequences } = useSequences()

    const activeSequences = sequences.filter(s => s.isActive)

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            Prep Templates
                        </CardDescription>
                        <CardTitle className="text-3xl">{templates.length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            {templates.reduce((sum, t) => sum + t.fieldKeys.length, 0)} total fields across templates
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            Sequences
                        </CardDescription>
                        <CardTitle className="text-3xl">{sequences.length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            {activeSequences.length} active, {sequences.length - activeSequences.length} inactive
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Automation Rules
                        </CardDescription>
                        <CardTitle className="text-3xl text-muted-foreground">—</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Coming soon
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick glance at templates */}
            {templates.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Recent Prep Templates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {templates.slice(0, 6).map(t => (
                            <Card key={t.id} className="hover:border-primary/40 transition-colors">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                        {t.name}
                                    </CardTitle>
                                    {t.description && (
                                        <CardDescription className="text-xs">{t.description}</CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Badge variant="secondary" className="text-xs">
                                        {t.fieldKeys.length} fields
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick glance at sequences */}
            {sequences.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Sequences
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sequences.slice(0, 6).map(s => (
                            <Card key={s.id} className="hover:border-primary/40 transition-colors">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                                        {s.name}
                                        <Badge
                                            variant={s.isActive ? "default" : "secondary"}
                                            className="text-[10px] ml-auto"
                                        >
                                            {s.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function WorkCenterPage() {
    const [activeTab, setActiveTab] = useState("overview")

    return (
        <>
            <Topbar title="Work Center" />
            <div className="flex-1 overflow-auto p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6">
                        <TabsTrigger value="overview" className="gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="prep-templates" className="gap-1.5">
                            <ClipboardList className="h-3.5 w-3.5" />
                            Prep Templates
                        </TabsTrigger>
                        <TabsTrigger value="sequences" className="gap-1.5">
                            <GitBranch className="h-3.5 w-3.5" />
                            Sequences
                        </TabsTrigger>
                        <TabsTrigger value="automation" className="gap-1.5">
                            <Zap className="h-3.5 w-3.5" />
                            Automation
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <WorkCenterOverview />
                    </TabsContent>

                    <TabsContent value="prep-templates">
                        <FieldTemplatesTab />
                    </TabsContent>

                    <TabsContent value="sequences">
                        <SequenceManager />
                    </TabsContent>

                    <TabsContent value="automation">
                        <WorkflowEditor />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    )
}

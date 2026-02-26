"use client"

import { useState, useEffect, useMemo } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { useKbForPrep, type KbEntry, type DisplayMode } from "@/hooks/use-kb"
import { useScripts, useScriptSections } from "@/hooks/use-scripts"
import { useSegmentEntries } from "@/hooks/use-segment-entries"
import { useCategories } from "@/hooks/use-categories"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { BookOpen, Lightbulb, AlertTriangle, ChevronDown, FileText, Users } from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"

interface ActiveRule {
    id: string
    ifWhen: string
    then: string
    confidence: string
}

interface ActiveSignal {
    id: string
    name: string
    description: string
}

interface CallPrepProps {
    leadSegment?: string
    leadStage?: string
    onRulesLoaded?: (ruleIds: string[]) => void
}

// ─── KB Entry Renderers ───

function KbEntryBullets({ entry }: { entry: KbEntry }) {
    return (
        <div className="text-xs p-2 bg-white/60 rounded border border-blue-100">
            <p className="font-medium text-blue-800">{entry.title}</p>
            {entry.content && (
                <p className="text-muted-foreground mt-0.5 line-clamp-2">{entry.content}</p>
            )}
        </div>
    )
}

function KbEntryFullText({ entry }: { entry: KbEntry }) {
    return (
        <div className="text-xs p-2 bg-white/60 rounded border border-blue-100 space-y-1">
            <p className="font-medium text-blue-800">{entry.title}</p>
            {entry.content && (
                <p className="text-muted-foreground whitespace-pre-wrap">{entry.content}</p>
            )}
        </div>
    )
}

function KbEntrySections({ entry }: { entry: KbEntry }) {
    const [open, setOpen] = useState(false)
    const parts = entry.parts ?? []
    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="w-full text-left text-xs p-2 bg-white/60 rounded border border-blue-100 flex items-center justify-between hover:bg-white/80 transition-colors">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-800">{entry.title}</span>
                    <span className="text-muted-foreground">({parts.length} parts)</span>
                </div>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 ml-2 space-y-1 border-l-2 border-blue-100 pl-2">
                {entry.content && (
                    <p className="text-xs text-muted-foreground">{entry.content}</p>
                )}
                {parts.map((part) => (
                    <div key={part.id} className="text-xs">
                        <p className="font-medium text-blue-700">{part.title}</p>
                        {part.content && (
                            <p className="text-muted-foreground mt-0.5">{part.content}</p>
                        )}
                    </div>
                ))}
            </CollapsibleContent>
        </Collapsible>
    )
}

function KbEntryRenderer({ entry, displayMode }: { entry: KbEntry; displayMode: DisplayMode }) {
    switch (displayMode) {
        case "full_text": return <KbEntryFullText entry={entry} />
        case "sections": return <KbEntrySections entry={entry} />
        default: return <KbEntryBullets entry={entry} />
    }
}

// ─── Main Component ───

export function CallPrepPanel({ leadSegment, leadStage, onRulesLoaded }: CallPrepProps) {
    const projectId = useProjectId()
    const [rules, setRules] = useState<ActiveRule[]>([])
    const [signals, setSignals] = useState<ActiveSignal[]>([])
    const { prepEntries, prepCategories } = useKbForPrep(leadSegment, leadStage)

    useEffect(() => {
        if (!projectId) return

        const fetch = async () => {
            const supabase = getSupabase()
            const [rulesRes, signalsRes] = await Promise.all([
                supabase.from("rules").select("id, if_when, then_action, confidence").eq("project_id", projectId).eq("is_active", true),
                supabase.from("stop_signals").select("id, name, description").eq("project_id", projectId).eq("is_active", true),
            ])

            if (rulesRes.data) {
                setRules(rulesRes.data.map((r: Record<string, unknown>) => ({
                    id: r.id as string,
                    ifWhen: (r.if_when || "") as string,
                    then: (r.then_action || "") as string,
                    confidence: (r.confidence || "hypothesis") as string,
                })))
            }
            if (signalsRes.data) {
                setSignals(signalsRes.data.map((s: Record<string, unknown>) => ({
                    id: s.id as string,
                    name: s.name as string,
                    description: (s.description || "") as string,
                })))
            }

            // Notify parent of loaded rule IDs for telemetry
            if (onRulesLoaded && rulesRes.data) {
                onRulesLoaded(rulesRes.data.map((r: Record<string, unknown>) => r.id as string))
            }
        }
        fetch()
    }, [projectId])

    const hasKb = prepEntries.length > 0

    // V3: Pinned scripts for this segment
    const { scripts } = useScripts()
    const pinnedScripts = useMemo(() => {
        return scripts.filter(s => s.isActive && s.isPinned && (!leadSegment || !s.segmentId || s.segmentId === leadSegment))
    }, [scripts, leadSegment])

    // V3: Segment entries (Language Bank, Mindset Notes, etc.)
    const { entries: segmentEntries } = useSegmentEntries(leadSegment ?? "")
    const { activeCategories: segSectionTypes } = useCategories("segment_section_type")
    const segTypeMap = useMemo(
        () => new Map(segSectionTypes.map(t => [t.id, { name: t.name, icon: t.icon }])),
        [segSectionTypes]
    )

    if (rules.length === 0 && signals.length === 0 && !hasKb && pinnedScripts.length === 0 && segmentEntries.length === 0) return null

    return (
        <Card className="border-blue-200/50 bg-blue-50/30">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    Call Prep
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Active Rules */}
                {rules.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            Active Rules ({rules.length})
                        </p>
                        <div className="space-y-1.5">
                            {rules.slice(0, 5).map((rule) => (
                                <div key={rule.id} className="text-xs p-2 bg-white/60 rounded border border-blue-100">
                                    <span className="text-muted-foreground">If </span>
                                    <span className="font-medium">{rule.ifWhen}</span>
                                    <span className="text-muted-foreground"> → </span>
                                    <span className="text-blue-700">{rule.then}</span>
                                </div>
                            ))}
                            {rules.length > 5 && (
                                <p className="text-xs text-muted-foreground">+{rules.length - 5} more</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Stop Signals */}
                {signals.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Watch For
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {signals.map((sig) => (
                                <Badge key={sig.id} variant="outline" className="text-xs bg-white/60">
                                    {sig.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Knowledge Base Entries */}
                {prepCategories.map((cat) => {
                    const catEntries = prepEntries.filter(e => e.categoryId === cat.id)
                    if (catEntries.length === 0) return null
                    return (
                        <div key={cat.id}>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                                <CategoryIcon icon={cat.icon} className="h-3 w-3" />
                                {cat.name} ({catEntries.length})
                            </p>
                            <div className="space-y-1.5">
                                {catEntries.map((entry) => (
                                    <KbEntryRenderer
                                        key={entry.id}
                                        entry={entry}
                                        displayMode={cat.displayMode}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                })}

                {/* V3: Pinned Script Sections */}
                {pinnedScripts.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Pinned Scripts ({pinnedScripts.length})
                        </p>
                        <div className="space-y-1.5">
                            {pinnedScripts.map(script => (
                                <PinnedScriptPrep key={script.id} scriptId={script.id} scriptTitle={script.title} />
                            ))}
                        </div>
                    </div>
                )}

                {/* V3: Segment Intel Entries */}
                {segmentEntries.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Segment Intel
                        </p>
                        <div className="space-y-1.5">
                            {segmentEntries.map(entry => {
                                const sType = segTypeMap.get(entry.sectionTypeId)
                                return (
                                    <div key={entry.id} className="text-xs p-2 bg-white/60 rounded border border-blue-100">
                                        <p className="font-medium text-blue-800 flex items-center gap-1">
                                            <CategoryIcon icon={sType?.icon ?? "file-text"} className="h-3 w-3" /> {sType?.name ?? "Entry"}
                                        </p>
                                        <p className="text-muted-foreground mt-0.5 line-clamp-3">{entry.content}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Pinned Script Sections in Prep ───

function PinnedScriptPrep({ scriptId, scriptTitle }: { scriptId: string; scriptTitle: string }) {
    const { sections, isLoading } = useScriptSections(scriptId)
    const { activeCategories: sectionTypes } = useCategories("script_section_type")
    const typeMap = useMemo(
        () => new Map(sectionTypes.map(t => [t.id, { name: t.name, icon: t.icon }])),
        [sectionTypes]
    )
    const [open, setOpen] = useState(false)

    if (isLoading || sections.length === 0) return null

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="w-full text-left text-xs p-2 bg-white/60 rounded border border-blue-100 flex items-center justify-between hover:bg-white/80 transition-colors">
                <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-primary" />
                    <span className="font-medium text-blue-800">{scriptTitle}</span>
                    <span className="text-muted-foreground">({sections.length} sections)</span>
                </div>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 ml-2 space-y-1 border-l-2 border-blue-100 pl-2">
                {sections.map(section => {
                    const type = typeMap.get(section.sectionTypeId)
                    return (
                        <div key={section.id} className="text-xs">
                            <p className="font-medium text-blue-700 flex items-center gap-1"><CategoryIcon icon={type?.icon ?? "file-text"} className="h-3 w-3" /> {type?.name ?? "Section"}</p>
                            {section.content && (
                                <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">{section.content}</p>
                            )}
                        </div>
                    )
                })}
            </CollapsibleContent>
        </Collapsible>
    )
}

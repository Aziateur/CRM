"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useInvestigation } from "@/hooks/use-investigations"
import { createIntelEntry, type Altitude } from "@/lib/intel"
import { useProjectId } from "@/hooks/use-project-id"
import { useCategories } from "@/hooks/use-categories"
import { useDrills } from "@/hooks/use-playbook-engine"
import { useScripts, useScriptSections } from "@/hooks/use-scripts"
import { useToast } from "@/hooks/use-toast"
import { getSupabase } from "@/lib/supabase"

import { SignalCard } from "@/components/incubator/signal-card"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ArrowLeft,
    Loader2,
    Pin,
    Trash2,
    PenLine,
    Rocket,
    Sparkles,
    Clock,
    AlertTriangle,
} from "lucide-react"
import {
    PILLARS,
    PRIORITY_CONFIG,
    investigationAge,
    type Investigation,
    type Priority,
    type DeploymentReceiptEntry,
    INVESTIGATION_STATUSES,
} from "@/lib/investigations"

interface InvestigationDetailProps {
    investigationId: string
    onBack: () => void
}

/**
 * Investigation Detail: Split-screen command center.
 * Left (40%): Evidence Board — pinned signals
 * Right (60%): Scratchpad & Deployment Matrix (tabbed)
 */
export function InvestigationDetail({
    investigationId,
    onBack,
}: InvestigationDetailProps) {
    const { toast } = useToast()
    const {
        investigation,
        signals,
        isLoading,
        updateScratchpad,
        updateHypothesis,
        updateTitle,
        updatePriority,
        unpinSignal,
        crystallize,
        deleteInvestigation,
    } = useInvestigation(investigationId)

    const [editingTitle, setEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState("")
    const [hypothesisDraft, setHypothesisDraft] = useState("")
    const [scratchpadDraft, setScratchpadDraft] = useState("")
    const [activeTab, setActiveTab] = useState<"scratchpad" | "deploy">("scratchpad")

    // Auto-save timer ref
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Sync drafts when investigation loads
    useEffect(() => {
        if (investigation) {
            setScratchpadDraft(investigation.scratchpad ?? "")
            setHypothesisDraft(investigation.hypothesis ?? "")
        }
    }, [investigation?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-save scratchpad on change (debounced)
    const handleScratchpadChange = useCallback(
        (val: string) => {
            setScratchpadDraft(val)
            if (saveTimer.current) clearTimeout(saveTimer.current)
            saveTimer.current = setTimeout(() => {
                updateScratchpad.mutate({ scratchpad: val })
            }, 1500)
        },
        [updateScratchpad],
    )

    const handleSaveHypothesis = () => {
        updateHypothesis.mutate(
            { hypothesis: hypothesisDraft },
            { onSuccess: () => toast({ title: "Hypothesis saved" }) },
        )
    }

    const handleSaveTitle = () => {
        if (!titleDraft.trim()) return
        updateTitle.mutate(
            { title: titleDraft },
            {
                onSuccess: () => {
                    setEditingTitle(false)
                    toast({ title: "Title updated" })
                },
            },
        )
    }

    const handleUnpin = (signalId: string) => {
        unpinSignal.mutate(signalId, {
            onSuccess: () => toast({ title: "Signal unpinned ↩️" }),
        })
    }

    const handleDelete = () => {
        if (
            !confirm("Delete this investigation? All pinned signals will return to the inbox.")
        )
            return
        deleteInvestigation.mutate(undefined, {
            onSuccess: () => {
                toast({ title: "Investigation deleted" })
                onBack()
            },
        })
    }

    if (isLoading || !investigation) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading investigation...
            </div>
        )
    }

    const isOpen = investigation.status === INVESTIGATION_STATUSES.OPEN
    const pc = PRIORITY_CONFIG[investigation.priority as Priority]

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 mt-0.5"
                        onClick={onBack}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        {editingTitle ? (
                            <div className="flex gap-2">
                                <Input
                                    className="h-8 text-base font-semibold"
                                    value={titleDraft}
                                    onChange={e => setTitleDraft(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") handleSaveTitle()
                                        if (e.key === "Escape") setEditingTitle(false)
                                    }}
                                    autoFocus
                                />
                                <Button size="sm" onClick={handleSaveTitle}>Save</Button>
                            </div>
                        ) : (
                            <h2
                                className="text-lg font-semibold truncate cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => {
                                    if (isOpen) {
                                        setTitleDraft(investigation.title)
                                        setEditingTitle(true)
                                    }
                                }}
                                title={isOpen ? "Click to edit" : undefined}
                            >
                                🕵️ {investigation.title}
                            </h2>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Pin className="h-3 w-3" />
                                {signals.length} signals
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Open {investigationAge(investigation.createdAt)}
                            </span>
                            {isOpen && (
                                <Select
                                    value={investigation.priority}
                                    onValueChange={v =>
                                        updatePriority.mutate({ priority: v as Priority })
                                    }
                                >
                                    <SelectTrigger className="h-5 text-[10px] w-24 border-0 p-0 pl-1">
                                        <Badge
                                            variant="outline"
                                            className={`text-[9px] h-4 px-1.5 ${pc.color} ${pc.border}`}
                                        >
                                            {pc.label}
                                        </Badge>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                                            <SelectItem key={key} value={key} className="text-xs">
                                                {cfg.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                    {isOpen && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs text-destructive hover:text-destructive"
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Deployment receipt (if crystallized) */}
            {investigation.status !== INVESTIGATION_STATUSES.OPEN &&
                investigation.deploymentReceipt && (
                    <Card className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10">
                        <CardContent className="py-3">
                            <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5">
                                ✅ Deployed {investigation.crystallizedAt
                                    ? new Date(investigation.crystallizedAt).toLocaleDateString()
                                    : ""}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {investigation.deploymentReceipt.map((item, i) => (
                                    <Badge
                                        key={i}
                                        variant="outline"
                                        className="text-[10px] text-green-600 border-green-300"
                                    >
                                        {item.type}: {item.label || item.id.slice(0, 8)}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

            {/* Split-Screen Layout */}
            <div className="grid grid-cols-12 gap-4">
                {/* LEFT: Evidence Board (40%) */}
                <div className="col-span-5 space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Pin className="h-3.5 w-3.5 text-blue-500" />
                        Evidence Board
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 ml-1">
                            {signals.length}
                        </Badge>
                    </h3>
                    {signals.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                            <Pin className="h-6 w-6 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">No signals pinned yet.</p>
                            <p className="text-[10px]">
                                Pin signals from the Feed to build your case.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                            {signals.map(s => (
                                <SignalCard
                                    key={s.id}
                                    signal={s}
                                    showAging={false}
                                    actions={
                                        isOpen ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-amber-600"
                                                onClick={() => handleUnpin(s.id)}
                                                title="Unpin — return to inbox"
                                            >
                                                <ArrowLeft className="h-3 w-3" />
                                            </Button>
                                        ) : undefined
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT: Synthesis Engine (60%) */}
                <div className="col-span-7">
                    <Tabs
                        value={activeTab}
                        onValueChange={v => setActiveTab(v as "scratchpad" | "deploy")}
                    >
                        <TabsList className="w-full grid grid-cols-2 h-9">
                            <TabsTrigger value="scratchpad" className="text-xs gap-1">
                                <PenLine className="h-3.5 w-3.5" />
                                Scratchpad
                            </TabsTrigger>
                            <TabsTrigger
                                value="deploy"
                                className="text-xs gap-1"
                                disabled={!isOpen}
                            >
                                <Rocket className="h-3.5 w-3.5" />
                                Deployment Matrix
                            </TabsTrigger>
                        </TabsList>

                        {/* Tab A: Scratchpad */}
                        <TabsContent value="scratchpad" className="mt-3 space-y-3">
                            {/* Hypothesis */}
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-amber-500" />
                                    Working Hypothesis
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        className="h-8 text-xs flex-1"
                                        placeholder="What do you think is the root cause?"
                                        value={hypothesisDraft}
                                        onChange={e => setHypothesisDraft(e.target.value)}
                                        disabled={!isOpen}
                                    />
                                    {isOpen && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs"
                                            onClick={handleSaveHypothesis}
                                            disabled={updateHypothesis.isPending}
                                        >
                                            {updateHypothesis.isPending ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                "Save"
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold flex items-center gap-1">
                                    <PenLine className="h-3 w-3 text-blue-500" />
                                    Deep Notes (auto-saves)
                                </Label>
                                <Textarea
                                    className="min-h-[calc(100vh-440px)] text-xs font-mono leading-relaxed"
                                    placeholder={
                                        "Pattern observations, cross-references, draft solutions...\n\n" +
                                        "Markdown supported. This is your private thinking space.\n" +
                                        "Nothing written here affects the live sales floor."
                                    }
                                    value={scratchpadDraft}
                                    onChange={e => handleScratchpadChange(e.target.value)}
                                    disabled={!isOpen}
                                />
                                {updateScratchpad.isPending && (
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                        Saving...
                                    </p>
                                )}
                            </div>
                        </TabsContent>

                        {/* Tab B: Deployment Matrix */}
                        <TabsContent value="deploy" className="mt-3">
                            {isOpen ? (
                                <DeploymentMatrix
                                    investigation={investigation}
                                    signalCount={signals.length}
                                    onCrystallize={crystallize.mutateAsync}
                                    isCrystallizing={crystallize.isPending}
                                    onDone={onBack}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    This investigation has already been deployed.
                                </p>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}

// ─── Deployment Matrix (Workspace 3) ───

interface DeploymentMatrixProps {
    investigation: Investigation
    signalCount: number
    onCrystallize: (args: { receipt: DeploymentReceiptEntry[] }) => Promise<void>
    isCrystallizing: boolean
    onDone: () => void
}

function DeploymentMatrix({
    investigation,
    signalCount,
    onCrystallize,
    isCrystallizing,
    onDone,
}: DeploymentMatrixProps) {
    const { toast } = useToast()
    const supabase = getSupabase()

    // Which pillars are checked
    const [enabledPillars, setEnabledPillars] = useState<Record<string, boolean>>({
        offer: false,
        market: false,
        messaging: false,
        operator: false,
    })

    // Per-pillar form state
    const [offerTitle, setOfferTitle] = useState("")
    const [offerCategory, setOfferCategory] = useState("")
    const [offerContent, setOfferContent] = useState("")

    const [marketTitle, setMarketTitle] = useState("")
    const [marketCategory, setMarketCategory] = useState("")
    const [marketContent, setMarketContent] = useState("")

    const [scriptId, setScriptId] = useState("")
    const [sectionId, setSectionId] = useState("")
    const [scriptSynthesized, setScriptSynthesized] = useState("")

    const [drillName, setDrillName] = useState("")
    const [drillInstructions, setDrillInstructions] = useState("")
    const [drillMetric, setDrillMetric] = useState("")

    // Data sources
    const { activeCategories } = useCategories("intel_category")
    const projectId = useProjectId()
    const { scripts } = useScripts()
    const { sections, editSection } = useScriptSections(scriptId || null)
    const { addDrill } = useDrills()

    const [isDeploying, setIsDeploying] = useState(false)

    const enabledCount = Object.values(enabledPillars).filter(Boolean).length

    const toggle = (id: string) => {
        setEnabledPillars(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const handleExecuteCascade = async () => {
        if (!projectId) return
        setIsDeploying(true)
        const receipt: DeploymentReceiptEntry[] = []

        try {
            // Offer
            if (enabledPillars.offer && offerTitle.trim() && offerCategory) {
                const entry = await createIntelEntry(projectId, {
                    altitude: 2,
                    intelCategoryId: offerCategory,
                    title: offerTitle.trim(),
                    content: offerContent.trim(),
                    sourceAttemptIds: [],
                })
                receipt.push({ type: "intel_entry", id: entry.id, label: offerTitle.trim() })
            }

            // Market
            if (enabledPillars.market && marketTitle.trim() && marketCategory) {
                const entry = await createIntelEntry(projectId, {
                    altitude: 1,
                    intelCategoryId: marketCategory,
                    title: marketTitle.trim(),
                    content: marketContent.trim(),
                    sourceAttemptIds: [],
                })
                receipt.push({ type: "intel_entry", id: entry.id, label: marketTitle.trim() })
            }

            // Messaging
            if (enabledPillars.messaging && sectionId && scriptSynthesized.trim()) {
                const today = new Date().toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                })
                const { data: sec } = await supabase
                    .from("kb_script_sections")
                    .select("content")
                    .eq("id", sectionId)
                    .single()
                const existing = (sec?.content as string) ?? ""
                const appended = existing
                    ? `${existing}\n\n> **✅ Approved Insight (${today}):**\n> ${scriptSynthesized.trim()}`
                    : `> **✅ Approved Insight (${today}):**\n> ${scriptSynthesized.trim()}`
                await editSection.mutateAsync({ id: sectionId, updates: { content: appended } })
                const sectionData = sections.find(s => s.id === sectionId)
                receipt.push({
                    type: "script_section",
                    id: sectionId,
                    label: sectionData?.title || "Script section",
                })
            }

            // Operator (Drill)
            if (enabledPillars.operator && drillName.trim() && drillInstructions.trim()) {
                const drill = await addDrill.mutateAsync({
                    name: drillName.trim(),
                    instructions: drillInstructions.trim(),
                    successMetric: drillMetric.trim() || "Complete successfully",
                    durationCount: 10,
                    triggerType: "manual",
                })
                receipt.push({ type: "drill", id: drill.id, label: drillName.trim() })
            }

            // Crystallize the investigation
            await onCrystallize({ receipt })

            toast({
                title: `💥 Cascade deployed (${receipt.length} update${receipt.length !== 1 ? "s" : ""})`,
                description: "Intelligence routed to the live Playbook.",
            })
            onDone()
        } catch (e: unknown) {
            toast({
                variant: "destructive",
                title: "Deployment failed",
                description: e instanceof Error ? e.message : "Unknown error",
            })
        } finally {
            setIsDeploying(false)
        }
    }

    return (
        <div className="space-y-3">
            {/* Context */}
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10">
                <CardContent className="py-3 text-xs">
                    <p className="font-semibold">🔬 Deploying: "{investigation.title}"</p>
                    <p className="text-muted-foreground mt-0.5">
                        {signalCount} signals · Hypothesis: {investigation.hypothesis || "—"}
                    </p>
                </CardContent>
            </Card>

            {/* Pillar checklist */}
            <div className="space-y-2">
                {PILLARS.map(p => (
                    <div key={p.id} className="space-y-2">
                        <div
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${enabledPillars[p.id]
                                ? `${p.activeBg} shadow-sm`
                                : "bg-card hover:bg-muted/30"
                                }`}
                            onClick={() => toggle(p.id)}
                        >
                            <Checkbox checked={enabledPillars[p.id]} />
                            <span className="text-sm select-none">{p.emoji}</span>
                            <span className={`text-xs font-semibold ${enabledPillars[p.id] ? p.color : ""}`}>
                                {p.label}
                            </span>
                        </div>

                        {/* Expanded form per pillar */}
                        {enabledPillars[p.id] && p.id === "offer" && (
                            <div className="ml-10 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                <Input className="h-7 text-xs" placeholder="Entry title" value={offerTitle} onChange={e => setOfferTitle(e.target.value)} />
                                <Select value={offerCategory} onValueChange={setOfferCategory}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="KB Category..." /></SelectTrigger>
                                    <SelectContent>
                                        {activeCategories.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Textarea className="min-h-[60px] text-xs" placeholder="Content..." value={offerContent} onChange={e => setOfferContent(e.target.value)} />
                            </div>
                        )}

                        {enabledPillars[p.id] && p.id === "market" && (
                            <div className="ml-10 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                <Input className="h-7 text-xs" placeholder="Title" value={marketTitle} onChange={e => setMarketTitle(e.target.value)} />
                                <Select value={marketCategory} onValueChange={setMarketCategory}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="KB Category..." /></SelectTrigger>
                                    <SelectContent>
                                        {activeCategories.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Textarea className="min-h-[60px] text-xs" placeholder="Intel content..." value={marketContent} onChange={e => setMarketContent(e.target.value)} />
                            </div>
                        )}

                        {enabledPillars[p.id] && p.id === "messaging" && (
                            <div className="ml-10 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                <div className="grid grid-cols-2 gap-2">
                                    <Select value={scriptId} onValueChange={v => { setScriptId(v); setSectionId("") }}>
                                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Script..." /></SelectTrigger>
                                        <SelectContent>
                                            {scripts.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={sectionId} onValueChange={setSectionId} disabled={!scriptId}>
                                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Section..." /></SelectTrigger>
                                        <SelectContent>
                                            {sections.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.title || `Section ${s.sortOrder + 1}`}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Textarea className="min-h-[60px] text-xs" placeholder="Synthesized talk-track..." value={scriptSynthesized} onChange={e => setScriptSynthesized(e.target.value)} />
                            </div>
                        )}

                        {enabledPillars[p.id] && p.id === "operator" && (
                            <div className="ml-10 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                <Input className="h-7 text-xs" placeholder="Drill name" value={drillName} onChange={e => setDrillName(e.target.value)} />
                                <Textarea className="min-h-[60px] text-xs" placeholder="Drill instructions..." value={drillInstructions} onChange={e => setDrillInstructions(e.target.value)} />
                                <Input className="h-7 text-xs" placeholder="Success metric" value={drillMetric} onChange={e => setDrillMetric(e.target.value)} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Deploy Button */}
            {enabledCount > 0 && (
                <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        This will update {enabledCount} live system{enabledCount !== 1 ? "s" : ""} and archive this investigation.
                    </div>
                    <Button
                        size="lg"
                        className="w-full gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                        disabled={isDeploying || isCrystallizing}
                        onClick={handleExecuteCascade}
                    >
                        {isDeploying || isCrystallizing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Rocket className="h-4 w-4" />
                        )}
                        💥 Execute Cascade ({enabledCount} update{enabledCount !== 1 ? "s" : ""})
                    </Button>
                </div>
            )}
        </div>
    )
}

"use client"

import { useState } from "react"
import {
    useScriptInbox,
    useDrills,
    useStopSignals,
    type ScriptInboxItem,
    type InboxPillar,
} from "@/hooks/use-playbook-engine"
import { createIntelEntry, type Altitude } from "@/lib/intel"
import { useProjectId } from "@/hooks/use-project-id"
import { useCategories } from "@/hooks/use-categories"
import { useScripts, useScriptSections } from "@/hooks/use-scripts"
import { useSegmentEntries } from "@/hooks/use-segment-entries"
import { useToast } from "@/hooks/use-toast"
import { getSupabase } from "@/lib/supabase"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    FlaskConical,
    CheckCircle2,
    Loader2,
    Inbox,
    Trash2,
    ArrowLeft,
    DollarSign,
    Drama,
    Map,
    MessageSquare,
    GitMerge,
    Dumbbell,
    AlertOctagon,
    BookOpen,
    Clock,
    Brain,
    Globe,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// PILLAR CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const PILLARS: {
    id: InboxPillar
    label: string
    sub: string
    emoji: string
    icon: React.ReactNode
    color: string
    border: string
    bg: string
    activeBg: string
}[] = [
        {
            id: "offer",
            label: "Offer & Value",
            sub: "Math, ROI, conviction",
            emoji: "💰",
            icon: <DollarSign className="h-5 w-5" />,
            color: "text-yellow-700 dark:text-yellow-400",
            border: "border-yellow-300 dark:border-yellow-700",
            bg: "bg-yellow-50/60 dark:bg-yellow-950/20",
            activeBg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700",
        },
        {
            id: "operator",
            label: "Operator & Execution",
            sub: "Tone, pacing, pressure",
            emoji: "🎭",
            icon: <Drama className="h-5 w-5" />,
            color: "text-red-700 dark:text-red-400",
            border: "border-red-300 dark:border-red-700",
            bg: "bg-red-50/60 dark:bg-red-950/20",
            activeBg: "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700",
        },
        {
            id: "market",
            label: "Market & ICP",
            sub: "Wrong target, new intel",
            emoji: "🗺️",
            icon: <Map className="h-5 w-5" />,
            color: "text-blue-700 dark:text-blue-400",
            border: "border-blue-300 dark:border-blue-700",
            bg: "bg-blue-50/60 dark:bg-blue-950/20",
            activeBg: "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700",
        },
        {
            id: "messaging",
            label: "Messaging / Talk-track",
            sub: "Script logic, discovery Qs",
            emoji: "💬",
            icon: <MessageSquare className="h-5 w-5" />,
            color: "text-green-700 dark:text-green-400",
            border: "border-green-300 dark:border-green-700",
            bg: "bg-green-50/60 dark:bg-green-950/20",
            activeBg: "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700",
        },
    ]

// ─────────────────────────────────────────────────────────────────────────────
// FORM 1: OfferForm  (Pillar 1 — offer)
// Route: creates a KB entry under an offer-related category
// ─────────────────────────────────────────────────────────────────────────────

function OfferForm({
    item,
    onBack,
    onDone,
}: {
    item: ScriptInboxItem
    onBack: () => void
    onDone: () => void
}) {
    const { toast } = useToast()
    const { activeCategories } = useCategories("intel_category")
    const projectId = useProjectId()
    const { resolveInboxItem } = useScriptInbox("pending")

    const [title, setTitle] = useState("")
    const [content, setContent] = useState(item.rawTranscript)
    const [categoryId, setCategoryId] = useState("")
    const [isPinned, setIsPinned] = useState(true)
    const [busy, setBusy] = useState(false)

    const handleSubmit = async () => {
        if (!title.trim() || !categoryId || !projectId) {
            toast({ variant: "destructive", title: "Title and Category are required" })
            return
        }
        setBusy(true)
        try {
            // Step 1: Create intel entry (chain of custody anchor)
            const newEntry = await createIntelEntry(projectId, {
                altitude: 2,
                intelCategoryId: categoryId,
                title: title.trim(),
                content: content.trim(),
                sourceAttemptIds: item.sourceAttemptId ? [item.sourceAttemptId] : [],
            })
            // Step 2: Pin if requested
            if (isPinned) {
                const { updateIntelEntry } = await import("@/lib/intel")
                await updateIntelEntry(newEntry.id, { isPinned: true })
            }
            // Step 3: Mark inbox item resolved with chain-of-custody link
            await resolveInboxItem.mutateAsync({
                id: item.id,
                pillar: "offer",
                prescriptionType: "intel_entry",
                prescriptionId: newEntry.id,
                synthesizedText: content.trim(),
            })
            toast({ title: "Added to Knowledge Base ✅" })
            onDone()
        } catch (e: unknown) {
            toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Unknown error" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <BookOpen className="h-3.5 w-3.5 text-yellow-600" />
                <span className="font-medium text-yellow-700 dark:text-yellow-400">Route → Knowledge Base (Offer Intel)</span>
            </div>

            <div>
                <Label className="text-xs">Entry Title *</Label>
                <Input className="mt-1 h-8 text-sm" placeholder="e.g. Price Objection — ROI Counter" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div>
                <Label className="text-xs">Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue placeholder="Pick a KB category..." />
                    </SelectTrigger>
                    <SelectContent>
                        {activeCategories.map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label className="text-xs">Synthesized Thesis</Label>
                <Textarea className="mt-1 min-h-[85px] text-sm" placeholder="Write the distilled, reusable insight..." value={content} onChange={e => setContent(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
                <Switch checked={isPinned} onCheckedChange={setIsPinned} id={`pin-offer-${item.id}`} />
                <Label htmlFor={`pin-offer-${item.id}`} className="text-xs cursor-pointer">Pin to Pre-call panel (reps see this before every dial)</Label>
            </div>

            <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack} disabled={busy}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <div className="flex-1" />
                <Button size="sm" className="gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-white" onClick={handleSubmit} disabled={busy || !title.trim() || !categoryId}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                    Add to Knowledge Base
                </Button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM 2: OperatorForm  (Pillar 2 — operator)
// Route: creates a Drill OR a Stop Signal
// ─────────────────────────────────────────────────────────────────────────────

function OperatorForm({
    item,
    onBack,
    onDone,
}: {
    item: ScriptInboxItem
    onBack: () => void
    onDone: () => void
}) {
    const { toast } = useToast()
    const { addDrill } = useDrills()
    const { addSignal } = useStopSignals()
    const { resolveInboxItem } = useScriptInbox("pending")

    const [drillName, setDrillName] = useState("")
    const [drillInstructions, setDrillInstructions] = useState(item.rawTranscript)
    const [drillMetric, setDrillMetric] = useState("")
    const [drillCount, setDrillCount] = useState("10")

    const [signalName, setSignalName] = useState("")
    const [signalTrigger, setSignalTrigger] = useState("")
    const [signalThreshold, setSignalThreshold] = useState("3")
    const [signalWindow, setSignalWindow] = useState("10")

    const [busy, setBusy] = useState(false)

    const handleDrillSubmit = async () => {
        if (!drillName.trim() || !drillInstructions.trim() || !drillMetric.trim()) {
            toast({ variant: "destructive", title: "Name, Instructions, and Success Metric are required" })
            return
        }
        setBusy(true)
        try {
            // Step 1: Create the drill record
            const newDrill = await addDrill.mutateAsync({
                name: drillName.trim(),
                instructions: drillInstructions.trim(),
                successMetric: drillMetric.trim(),
                durationCount: parseInt(drillCount) || 10,
                triggerType: "manual",
            })
            // Step 2: Lock in chain of custody
            await resolveInboxItem.mutateAsync({
                id: item.id,
                pillar: "operator",
                prescriptionType: "drill",
                prescriptionId: newDrill.id,
                synthesizedText: drillInstructions.trim(),
            })
            toast({ title: "Drill created 🏋️" })
            onDone()
        } catch (e: unknown) {
            toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Unknown error" })
        } finally {
            setBusy(false)
        }
    }

    const handleSignalSubmit = async () => {
        if (!signalName.trim() || !signalTrigger.trim()) {
            toast({ variant: "destructive", title: "Name and Trigger Condition are required" })
            return
        }
        setBusy(true)
        try {
            // Step 1: Create the stop signal record
            const newSignal = await addSignal.mutateAsync({
                name: signalName.trim(),
                triggerCondition: signalTrigger.trim(),
                threshold: parseInt(signalThreshold) || 3,
                windowSize: parseInt(signalWindow) || 10,
            })
            // Step 2: Lock in chain of custody
            await resolveInboxItem.mutateAsync({
                id: item.id,
                pillar: "operator",
                prescriptionType: "stop_signal",
                prescriptionId: newSignal.id,
                synthesizedText: signalTrigger.trim(),
            })
            toast({ title: "Stop Signal created 🚨" })
            onDone()
        } catch (e: unknown) {
            toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Unknown error" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Drama className="h-3.5 w-3.5 text-red-600" />
                <span className="font-medium text-red-700 dark:text-red-400">Route → Prescribe practice or a dialer warning</span>
            </div>

            <Tabs defaultValue="drill">
                <TabsList className="h-8 text-xs w-full">
                    <TabsTrigger value="drill" className="flex-1 text-xs gap-1">
                        <Dumbbell className="h-3 w-3" /> Create Drill
                    </TabsTrigger>
                    <TabsTrigger value="signal" className="flex-1 text-xs gap-1">
                        <AlertOctagon className="h-3 w-3" /> Create Stop Signal
                    </TabsTrigger>
                </TabsList>

                {/* ── Drill Tab ── */}
                <TabsContent value="drill" className="space-y-3 mt-3">
                    <div>
                        <Label className="text-xs">Drill Name *</Label>
                        <Input className="mt-1 h-8 text-sm" placeholder="e.g. Cold Opener Under Pressure" value={drillName} onChange={e => setDrillName(e.target.value)} />
                    </div>
                    <div>
                        <Label className="text-xs">Instructions *</Label>
                        <Textarea className="mt-1 min-h-[75px] text-sm" placeholder="What exactly should the rep practice?" value={drillInstructions} onChange={e => setDrillInstructions(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Success Metric *</Label>
                            <Input className="mt-1 h-8 text-sm" placeholder="e.g. 10 clean openers" value={drillMetric} onChange={e => setDrillMetric(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs">Rep Count</Label>
                            <Input className="mt-1 h-8 text-sm" type="number" min="1" value={drillCount} onChange={e => setDrillCount(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button variant="ghost" size="sm" className="gap-1" onClick={onBack} disabled={busy}>
                            <ArrowLeft className="h-3.5 w-3.5" /> Back
                        </Button>
                        <div className="flex-1" />
                        <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleDrillSubmit} disabled={busy || !drillName.trim() || !drillInstructions.trim() || !drillMetric.trim()}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dumbbell className="h-4 w-4" />}
                            Create Drill
                        </Button>
                    </div>
                </TabsContent>

                {/* ── Signal Tab ── */}
                <TabsContent value="signal" className="space-y-3 mt-3">
                    <div>
                        <Label className="text-xs">Signal Name *</Label>
                        <Input className="mt-1 h-8 text-sm" placeholder="e.g. 3x No Connect Streak" value={signalName} onChange={e => setSignalName(e.target.value)} />
                    </div>
                    <div>
                        <Label className="text-xs">Trigger Condition *</Label>
                        <Input className="mt-1 h-8 text-sm" placeholder="e.g. 3 consecutive no-connects" value={signalTrigger} onChange={e => setSignalTrigger(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Threshold (count)</Label>
                            <Input className="mt-1 h-8 text-sm" type="number" min="1" value={signalThreshold} onChange={e => setSignalThreshold(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs">Window (calls)</Label>
                            <Input className="mt-1 h-8 text-sm" type="number" min="1" value={signalWindow} onChange={e => setSignalWindow(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button variant="ghost" size="sm" className="gap-1" onClick={onBack} disabled={busy}>
                            <ArrowLeft className="h-3.5 w-3.5" /> Back
                        </Button>
                        <div className="flex-1" />
                        <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white" onClick={handleSignalSubmit} disabled={busy || !signalName.trim() || !signalTrigger.trim()}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertOctagon className="h-4 w-4" />}
                            Create Stop Signal
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM 3: MarketForm  (Pillar 3 — market)
// Altitude toggle:
//   • macro → kb_entries (Industry Macro Intel)
//   • micro → segment_entries (ICP Psychology — Mindset Notes / Pain Points)
// ─────────────────────────────────────────────────────────────────────────────

type MarketAltitude = "macro" | "micro"

// Inner sub-form for Micro ICP segment entries — needs a segmentId to write
function MarketMicroForm({
    item,
    onBack,
    onDone,
}: {
    item: ScriptInboxItem
    onBack: () => void
    onDone: () => void
}) {
    const { toast } = useToast()
    const { activeCategories: segments } = useCategories("segment")
    const { activeCategories: sectionTypes } = useCategories("segment_section_type")
    const { resolveInboxItem } = useScriptInbox("pending")

    const [segmentId, setSegmentId] = useState("")
    const [sectionTypeId, setSectionTypeId] = useState("")
    const [title, setTitle] = useState("")
    const [content, setContent] = useState(item.rawTranscript)
    const [isPinned, setIsPinned] = useState(false)
    const [busy, setBusy] = useState(false)

    const { addEntry } = useSegmentEntries(segmentId || null)

    const handleSubmit = async () => {
        if (!segmentId || !sectionTypeId || !content.trim()) {
            toast({ variant: "destructive", title: "Segment, Section Type, and Content are required" })
            return
        }
        setBusy(true)
        try {
            // Step 1: Create ICP segment entry
            const newEntry = await addEntry.mutateAsync({
                sectionTypeId,
                title: title.trim() || undefined,
                content: content.trim(),
                isPinned,
            })
            // Step 2: Lock in chain of custody (prescriptionId = entry id, type = kb_entry as closest match)
            await resolveInboxItem.mutateAsync({
                id: item.id,
                pillar: "market",
                prescriptionType: "intel_entry",
                prescriptionId: newEntry.id,
                synthesizedText: content.trim(),
            })
            toast({ title: "Saved to ICP Psychology ✅" })
            onDone()
        } catch (e: unknown) {
            toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Unknown error" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs">Target Segment *</Label>
                    <Select value={segmentId} onValueChange={setSegmentId}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="Select segment..." />
                        </SelectTrigger>
                        <SelectContent>
                            {segments.map(s => (
                                <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-xs">Section Type *</Label>
                    <Select value={sectionTypeId} onValueChange={setSectionTypeId}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="e.g. Mindset Notes..." />
                        </SelectTrigger>
                        <SelectContent>
                            {sectionTypes.map(st => (
                                <SelectItem key={st.id} value={st.id} className="text-xs">{st.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label className="text-xs">Title <span className="text-muted-foreground">(optional)</span></Label>
                <Input className="mt-1 h-8 text-sm" placeholder="Short label for this insight" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div>
                <Label className="text-xs">Synthesized ICP Insight *</Label>
                <Textarea className="mt-1 min-h-[85px] text-sm" placeholder="What does this reveal about their mindset, pain, or language?" value={content} onChange={e => setContent(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
                <Switch checked={isPinned} onCheckedChange={setIsPinned} id={`pin-micro-${item.id}`} />
                <Label htmlFor={`pin-micro-${item.id}`} className="text-xs cursor-pointer">Pin to Pre-call Briefing</Label>
            </div>

            <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="gap-1" onClick={onBack} disabled={busy}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <div className="flex-1" />
                <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit} disabled={busy || !segmentId || !sectionTypeId || !content.trim()}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                    Save ICP Psychology
                </Button>
            </div>
        </div>
    )
}

// Inner sub-form for Macro Industry intel — writes to kb_entries
function MarketMacroForm({
    item,
    onBack,
    onDone,
}: {
    item: ScriptInboxItem
    onBack: () => void
    onDone: () => void
}) {
    const { toast } = useToast()
    const { activeCategories } = useCategories("intel_category")
    const projectId = useProjectId()
    const { resolveInboxItem } = useScriptInbox("pending")

    const [title, setTitle] = useState("")
    const [content, setContent] = useState(item.rawTranscript)
    const [categoryId, setCategoryId] = useState("")
    const [isPinned, setIsPinned] = useState(false)
    const [busy, setBusy] = useState(false)

    const handleSubmit = async () => {
        if (!title.trim() || !categoryId || !projectId) {
            toast({ variant: "destructive", title: "Title and Category are required" })
            return
        }
        setBusy(true)
        try {
            // Step 1: Create macro intel entry
            const newEntry = await createIntelEntry(projectId, {
                altitude: 1,
                intelCategoryId: categoryId,
                title: title.trim(),
                content: content.trim(),
                sourceAttemptIds: item.sourceAttemptId ? [item.sourceAttemptId] : [],
            })
            // Step 2: Pin if requested
            if (isPinned) {
                const { updateIntelEntry } = await import("@/lib/intel")
                await updateIntelEntry(newEntry.id, { isPinned: true })
            }
            // Step 3: Lock in chain of custody
            await resolveInboxItem.mutateAsync({
                id: item.id,
                pillar: "market",
                prescriptionType: "intel_entry",
                prescriptionId: newEntry.id,
                synthesizedText: content.trim(),
            })
            toast({ title: "Added to Macro Ecosystem Intel ✅" })
            onDone()
        } catch (e: unknown) {
            toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Unknown error" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">Entry Title *</Label>
                <Input className="mt-1 h-8 text-sm" placeholder="e.g. New State Licensing Regulation 2026" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div>
                <Label className="text-xs">Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue placeholder="Pick a KB category..." />
                    </SelectTrigger>
                    <SelectContent>
                        {activeCategories.map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label className="text-xs">Synthesized Intel *</Label>
                <Textarea className="mt-1 min-h-[85px] text-sm" placeholder="What does this mean for our market? What does the rep need to know?" value={content} onChange={e => setContent(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
                <Switch checked={isPinned} onCheckedChange={setIsPinned} id={`pin-macro-${item.id}`} />
                <Label htmlFor={`pin-macro-${item.id}`} className="text-xs cursor-pointer">Pin to Pre-call Briefing (🌍)</Label>
            </div>

            <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="gap-1" onClick={onBack} disabled={busy}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <div className="flex-1" />
                <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit} disabled={busy || !title.trim() || !categoryId}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                    Save Macro Intel
                </Button>
            </div>
        </div>
    )
}

// MarketForm wrapper — altitude selector first, then shows the correct sub-form
function MarketForm({
    item,
    onBack,
    onDone,
}: {
    item: ScriptInboxItem
    onBack: () => void
    onDone: () => void
}) {
    const [altitude, setAltitude] = useState<MarketAltitude | null>(null)

    return (
        <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Map className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-medium text-blue-700 dark:text-blue-400">Route → Market & ICP Intel</span>
            </div>

            {!altitude ? (
                <div className="space-y-2">
                    <p className="text-xs font-semibold">Which altitude?</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setAltitude("macro")}
                            className="flex flex-col items-start gap-1 rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-3 text-left hover:shadow-sm hover:scale-[1.01] transition-all"
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="text-base">🌍</span>
                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Macro Intel</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Market trends, regulations, competitors — goes to Industry KB</p>
                        </button>
                        <button
                            onClick={() => setAltitude("micro")}
                            className="flex flex-col items-start gap-1 rounded-md border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30 p-3 text-left hover:shadow-sm hover:scale-[1.01] transition-all"
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="text-base">🧠</span>
                                <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">ICP Psychology</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Mindset, pain points, jargon — goes to Segment Profile</p>
                        </button>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
                            <ArrowLeft className="h-3.5 w-3.5" /> Back
                        </Button>
                    </div>
                </div>
            ) : altitude === "macro" ? (
                <MarketMacroForm item={item} onBack={() => setAltitude(null)} onDone={onDone} />
            ) : (
                <MarketMicroForm item={item} onBack={() => setAltitude(null)} onDone={onDone} />
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM 4: MessagingForm  (Pillar 4 — messaging)
// Route: appends synthesized talk-track to a live script section
// ─────────────────────────────────────────────────────────────────────────────

function MessagingForm({
    item,
    onBack,
    onDone,
}: {
    item: ScriptInboxItem
    onBack: () => void
    onDone: () => void
}) {
    const { toast } = useToast()
    const { scripts } = useScripts()
    const { resolveInboxItem } = useScriptInbox("pending")

    const [scriptId, setScriptId] = useState(item.targetScriptId ?? "")
    const [sectionId, setSectionId] = useState(item.targetSectionId ?? "")
    const [synthesized, setSynthesized] = useState("")
    const [busy, setBusy] = useState(false)

    const { sections, editSection } = useScriptSections(scriptId || null)

    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

    const handleMerge = async () => {
        if (!synthesized.trim() || !sectionId) {
            toast({ variant: "destructive", title: "Select a section and write the synthesized talk-track" })
            return
        }
        setBusy(true)
        try {
            // Step 1: Fetch the current section content to safely append
            const supabase = getSupabase()
            const { data: sec, error: fetchErr } = await supabase
                .from("kb_script_sections")
                .select("content")
                .eq("id", sectionId)
                .single()
            if (fetchErr) throw fetchErr

            const existing = (sec?.content as string) ?? ""
            const appended = existing
                ? `${existing}\n\n> **✅ Approved Insight (${today}):**\n> ${synthesized.trim()}`
                : `> **✅ Approved Insight (${today}):**\n> ${synthesized.trim()}`

            // Step 2: Append to section
            await editSection.mutateAsync({ id: sectionId, updates: { content: appended } })

            // Step 3: Lock in chain of custody
            await resolveInboxItem.mutateAsync({
                id: item.id,
                pillar: "messaging",
                prescriptionType: "script_section",
                prescriptionId: sectionId,
                synthesizedText: synthesized.trim(),
            })
            toast({ title: "Merged to live script ✅" })
            onDone()
        } catch (e: unknown) {
            toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Unknown error" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-400">Route → Merge approved talk-track to live script section</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs">Target Script</Label>
                    <Select value={scriptId} onValueChange={v => { setScriptId(v); setSectionId("") }}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="Select script..." />
                        </SelectTrigger>
                        <SelectContent>
                            {scripts.map(s => (
                                <SelectItem key={s.id} value={s.id} className="text-xs">{s.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-xs">Target Section</Label>
                    <Select value={sectionId} onValueChange={setSectionId} disabled={!scriptId}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder={scriptId ? "Select section..." : "Pick script first"} />
                        </SelectTrigger>
                        <SelectContent>
                            {sections.map(sec => (
                                <SelectItem key={sec.id} value={sec.id} className="text-xs">
                                    {sec.title || `Section ${sec.sortOrder + 1}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label className="text-xs">Synthesized Talk-track *</Label>
                <Textarea
                    className="mt-1 min-h-[90px] text-sm"
                    placeholder="Write the 1–2 punchy sentences the rep says next time..."
                    value={synthesized}
                    onChange={e => setSynthesized(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                    This synthesized line — not the raw transcript — appends to the live script section.
                </p>
            </div>

            <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="gap-1" onClick={onBack} disabled={busy}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <div className="flex-1" />
                <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={handleMerge} disabled={busy || !synthesized.trim() || !sectionId}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
                    Merge to Script
                </Button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// INBOX ITEM CARD
// Renders a single pending signal with: autopsy → pillar diagnosis → prescription
// ─────────────────────────────────────────────────────────────────────────────

function InboxItemCard({ item }: { item: ScriptInboxItem }) {
    const { toast } = useToast()
    const { updateInboxItem } = useScriptInbox("pending")
    const [selectedPillar, setSelectedPillar] = useState<InboxPillar | null>(null)

    const activePillar = PILLARS.find(p => p.id === selectedPillar)

    const handleDiscard = () => {
        updateInboxItem.mutate(
            { id: item.id, updates: { status: "discarded" } },
            {
                onSuccess: () => toast({ title: "Noise discarded" }),
                onError: (e) => toast({ variant: "destructive", title: "Error", description: e.message }),
            }
        )
    }

    const handleDone = () => setSelectedPillar(null)

    return (
        <div className={`rounded-xl border overflow-hidden transition-all ${activePillar ? activePillar.activeBg : "bg-card border-border"}`}>
            <div className="p-4 space-y-4">

                {/* ── Autopsy: Raw Symptom ── */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {new Date(item.createdAt).toLocaleString()}
                            {item.sourceAttemptId && (
                                <Badge variant="outline" className="text-[9px] h-3.5 px-1">Traceable to call</Badge>
                            )}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={handleDiscard}
                            disabled={updateInboxItem.isPending}
                            title="Discard — not actionable noise"
                        >
                            {updateInboxItem.isPending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />
                            }
                        </Button>
                    </div>
                    <blockquote className="border-l-4 border-muted-foreground/30 pl-3 bg-muted/40 rounded-r-md py-2.5 pr-3 max-h-28 overflow-y-auto">
                        <p className="text-xs font-mono italic text-foreground/75 whitespace-pre-wrap leading-relaxed">
                            {item.rawTranscript}
                        </p>
                    </blockquote>
                </div>

                {/* ── Pillar Selector or Active Badge ── */}
                {!selectedPillar ? (
                    <div>
                        <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Diagnose: What is the root cause?</p>
                        <div className="grid grid-cols-2 gap-2">
                            {PILLARS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPillar(p.id)}
                                    className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all hover:scale-[1.01] hover:shadow-md ${p.border} ${p.bg}`}
                                >
                                    <span className="text-xl leading-none mt-0.5 select-none">{p.emoji}</span>
                                    <div>
                                        <p className={`text-xs font-semibold leading-tight ${p.color}`}>{p.label}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{p.sub}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-base select-none">{activePillar?.emoji}</span>
                        <span className={`text-xs font-semibold ${activePillar?.color}`}>{activePillar?.label}</span>
                        <span className="text-xs text-muted-foreground">— diagnosed</span>
                    </div>
                )}

                {/* ── Dynamic Prescription Form ── */}
                {selectedPillar === "offer" && (
                    <OfferForm item={item} onBack={() => setSelectedPillar(null)} onDone={handleDone} />
                )}
                {selectedPillar === "operator" && (
                    <OperatorForm item={item} onBack={() => setSelectedPillar(null)} onDone={handleDone} />
                )}
                {selectedPillar === "market" && (
                    <MarketForm item={item} onBack={() => setSelectedPillar(null)} onDone={handleDone} />
                )}
                {selectedPillar === "messaging" && (
                    <MessagingForm item={item} onBack={() => setSelectedPillar(null)} onDone={handleDone} />
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHT LAB PANEL (Parent)
// Fetches pending inbox items and renders the triage engine
// ─────────────────────────────────────────────────────────────────────────────

export function InsightLabPanel() {
    const { items, pendingCount, isLoading } = useScriptInbox("pending")

    if (isLoading) {
        return (
            <Card className="border-purple-200 bg-purple-50/30 dark:border-purple-900/40 dark:bg-purple-950/10">
                <CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading Insight Lab...</span>
                </CardContent>
            </Card>
        )
    }

    if (pendingCount === 0) {
        return (
            <Card className="border-purple-200 bg-purple-50/30 dark:border-purple-900/40 dark:bg-purple-950/10">
                <CardContent className="py-5 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold">Inbox Zero: No friction detected</p>
                        <p className="text-xs text-muted-foreground">
                            When reps send call observations via Batch Review, they appear here for 4-Pillar diagnosis.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-purple-300 dark:border-purple-800 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="h-5 w-5 text-purple-500" />
                    Insight Lab
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-0 ml-1 gap-1">
                        <Inbox className="h-3 w-3" />
                        {pendingCount} pending
                    </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Diagnose each field signal using the 4-Pillar framework. Route the fix to the correct system —
                    nothing touches the live Playbook until you approve it.
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {items.map(item => (
                    <InboxItemCard key={item.id} item={item} />
                ))}
            </CardContent>
        </Card>
    )
}

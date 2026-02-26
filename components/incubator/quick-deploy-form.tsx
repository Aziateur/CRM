"use client"

import { useState } from "react"
import { useScriptInbox, type ScriptInboxItem, type InboxPillar, type InboxPrescriptionType } from "@/hooks/use-playbook-engine"
import { createIntelEntry, type Altitude } from "@/lib/intel"
import { useProjectId } from "@/hooks/use-project-id"
import { useCategories } from "@/hooks/use-categories"
import { useDrills } from "@/hooks/use-playbook-engine"
import { useScripts, useScriptSections } from "@/hooks/use-scripts"
import { useToast } from "@/hooks/use-toast"
import { getSupabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
    DollarSign,
    Drama,
    Map,
    MessageSquare,
} from "lucide-react"
import { PILLARS, type PillarId } from "@/lib/investigations"

interface QuickDeployFormProps {
    item: ScriptInboxItem
    onDone: () => void
    onBack: () => void
}

/**
 * Quick-Deploy Form (Fast-track)
 *
 * Compact inline form that lets managers fix obvious issues without
 * creating an investigation. Step 1: pick pillar → Step 2: fill inline form.
 */
export function QuickDeployForm({ item, onDone, onBack }: QuickDeployFormProps) {
    const [selectedPillar, setSelectedPillar] = useState<PillarId | null>(null)

    if (!selectedPillar) {
        return (
            <div className="space-y-2 py-2">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    ⚡ Quick-Deploy — What is the root cause?
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                    {PILLARS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPillar(p.id)}
                            className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-all hover:scale-[1.01] hover:shadow-sm ${p.border} ${p.bg}`}
                        >
                            <span className="text-sm select-none">{p.emoji}</span>
                            <span className={`text-xs font-medium ${p.color}`}>
                                {p.label}
                            </span>
                        </button>
                    ))}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={onBack}
                >
                    <ArrowLeft className="h-3 w-3" /> Cancel
                </Button>
            </div>
        )
    }

    // Render the appropriate compact form per pillar
    const pillarForms: Record<PillarId, React.ReactNode> = {
        offer: (
            <OfferQuickForm
                item={item}
                onBack={() => setSelectedPillar(null)}
                onDone={onDone}
            />
        ),
        operator: (
            <OperatorQuickForm
                item={item}
                onBack={() => setSelectedPillar(null)}
                onDone={onDone}
            />
        ),
        market: (
            <MarketQuickForm
                item={item}
                onBack={() => setSelectedPillar(null)}
                onDone={onDone}
            />
        ),
        messaging: (
            <MessagingQuickForm
                item={item}
                onBack={() => setSelectedPillar(null)}
                onDone={onDone}
            />
        ),
    }

    return <>{pillarForms[selectedPillar]}</>
}

// ─── Shared form wrapper ───

function QuickFormShell({
    pillarId,
    children,
    onBack,
    onSubmit,
    busy,
    valid,
    buttonLabel,
}: {
    pillarId: PillarId
    children: React.ReactNode
    onBack: () => void
    onSubmit: () => void
    busy: boolean
    valid: boolean
    buttonLabel: string
}) {
    const pillar = PILLARS.find(p => p.id === pillarId)!
    const Icon = pillarId === "offer" ? DollarSign
        : pillarId === "operator" ? Drama
            : pillarId === "market" ? Map
                : MessageSquare

    return (
        <div className="space-y-2.5 py-2">
            <div className="flex items-center gap-2 text-xs">
                <span className="select-none">{pillar.emoji}</span>
                <span className={`font-semibold ${pillar.color}`}>
                    {pillar.label}
                </span>
            </div>
            {children}
            <div className="flex gap-2 pt-1">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={onBack}
                    disabled={busy}
                >
                    <ArrowLeft className="h-3 w-3" /> Back
                </Button>
                <div className="flex-1" />
                <Button
                    size="sm"
                    className={`gap-1.5 text-xs text-white ${pillar.activeBg.includes("yellow") ? "bg-yellow-600 hover:bg-yellow-700" : pillar.activeBg.includes("red") ? "bg-red-600 hover:bg-red-700" : pillar.activeBg.includes("blue") ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
                    disabled={busy || !valid}
                    onClick={onSubmit}
                >
                    {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Icon className="h-3.5 w-3.5" />
                    )}
                    {buttonLabel}
                </Button>
            </div>
        </div>
    )
}

// ─── Offer Quick Form ───

function OfferQuickForm({
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
    const { quickDeploySignal } = useScriptInbox("pending")

    const [title, setTitle] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [content, setContent] = useState(item.rawTranscript)
    const [busy, setBusy] = useState(false)

    const handleSubmit = async () => {
        if (!projectId) return
        setBusy(true)
        try {
            const entry = await createIntelEntry(projectId, {
                altitude: 2,
                intelCategoryId: categoryId,
                title: title.trim(),
                content: content.trim(),
                sourceAttemptIds: item.sourceAttemptId ? [item.sourceAttemptId] : [],
            })
            await quickDeploySignal.mutateAsync({
                id: item.id,
                pillar: "offer",
                prescriptionType: "intel_entry",
                prescriptionId: entry.id,
                synthesizedText: content.trim(),
            })
            toast({ title: "Quick-deployed to KB ✅" })
            onDone()
        } catch (e: unknown) {
            toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <QuickFormShell
            pillarId="offer"
            onBack={onBack}
            onSubmit={handleSubmit}
            busy={busy}
            valid={!!title.trim() && !!categoryId}
            buttonLabel="Add to KB"
        >
            <Input
                className="h-7 text-xs"
                placeholder="Entry title"
                value={title}
                onChange={e => setTitle(e.target.value)}
            />
            <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Category..." />
                </SelectTrigger>
                <SelectContent>
                    {activeCategories.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Textarea
                className="min-h-[60px] text-xs"
                value={content}
                onChange={e => setContent(e.target.value)}
            />
        </QuickFormShell>
    )
}

// ─── Operator Quick Form ───

function OperatorQuickForm({
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
    const { quickDeploySignal } = useScriptInbox("pending")

    const [name, setName] = useState("")
    const [instructions, setInstructions] = useState(item.rawTranscript)
    const [metric, setMetric] = useState("")
    const [busy, setBusy] = useState(false)

    const handleSubmit = async () => {
        setBusy(true)
        try {
            const drill = await addDrill.mutateAsync({
                name: name.trim(),
                instructions: instructions.trim(),
                successMetric: metric.trim(),
                durationCount: 10,
                triggerType: "manual",
            })
            await quickDeploySignal.mutateAsync({
                id: item.id,
                pillar: "operator",
                prescriptionType: "drill",
                prescriptionId: drill.id,
                synthesizedText: instructions.trim(),
            })
            toast({ title: "Drill created ⚡" })
            onDone()
        } catch (e: unknown) {
            toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <QuickFormShell
            pillarId="operator"
            onBack={onBack}
            onSubmit={handleSubmit}
            busy={busy}
            valid={!!name.trim() && !!instructions.trim() && !!metric.trim()}
            buttonLabel="Create Drill"
        >
            <Input className="h-7 text-xs" placeholder="Drill name" value={name} onChange={e => setName(e.target.value)} />
            <Textarea className="min-h-[60px] text-xs" placeholder="Instructions" value={instructions} onChange={e => setInstructions(e.target.value)} />
            <Input className="h-7 text-xs" placeholder="Success metric" value={metric} onChange={e => setMetric(e.target.value)} />
        </QuickFormShell>
    )
}

// ─── Market Quick Form ───

function MarketQuickForm({
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
    const { quickDeploySignal } = useScriptInbox("pending")

    const [title, setTitle] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [content, setContent] = useState(item.rawTranscript)
    const [busy, setBusy] = useState(false)

    const handleSubmit = async () => {
        if (!projectId) return
        setBusy(true)
        try {
            const entry = await createIntelEntry(projectId, {
                altitude: 1,
                intelCategoryId: categoryId,
                title: title.trim(),
                content: content.trim(),
                sourceAttemptIds: item.sourceAttemptId ? [item.sourceAttemptId] : [],
            })
            await quickDeploySignal.mutateAsync({
                id: item.id,
                pillar: "market",
                prescriptionType: "intel_entry",
                prescriptionId: entry.id,
                synthesizedText: content.trim(),
            })
            toast({ title: "Market intel added ✅" })
            onDone()
        } catch (e: unknown) {
            toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <QuickFormShell
            pillarId="market"
            onBack={onBack}
            onSubmit={handleSubmit}
            busy={busy}
            valid={!!title.trim() && !!categoryId}
            buttonLabel="Save Intel"
        >
            <Input className="h-7 text-xs" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Category..." /></SelectTrigger>
                <SelectContent>
                    {activeCategories.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Textarea className="min-h-[60px] text-xs" value={content} onChange={e => setContent(e.target.value)} />
        </QuickFormShell>
    )
}

// ─── Messaging Quick Form ───

function MessagingQuickForm({
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
    const { quickDeploySignal } = useScriptInbox("pending")
    const supabase = getSupabase()

    const [scriptId, setScriptId] = useState(item.targetScriptId ?? "")
    const [sectionId, setSectionId] = useState(item.targetSectionId ?? "")
    const [synthesized, setSynthesized] = useState("")
    const [busy, setBusy] = useState(false)

    const { sections, editSection } = useScriptSections(scriptId || null)

    const handleSubmit = async () => {
        setBusy(true)
        try {
            const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            const db = supabase
            const { data: sec } = await db.from("kb_script_sections").select("content").eq("id", sectionId).single()
            const existing = (sec?.content as string) ?? ""
            const appended = existing
                ? `${existing}\n\n> **✅ Quick Fix (${today}):**\n> ${synthesized.trim()}`
                : `> **✅ Quick Fix (${today}):**\n> ${synthesized.trim()}`

            await editSection.mutateAsync({ id: sectionId, updates: { content: appended } })
            await quickDeploySignal.mutateAsync({
                id: item.id,
                pillar: "messaging",
                prescriptionType: "script_section",
                prescriptionId: sectionId,
                synthesizedText: synthesized.trim(),
            })
            toast({ title: "Script updated ✅" })
            onDone()
        } catch (e: unknown) {
            toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <QuickFormShell
            pillarId="messaging"
            onBack={onBack}
            onSubmit={handleSubmit}
            busy={busy}
            valid={!!synthesized.trim() && !!sectionId}
            buttonLabel="Merge to Script"
        >
            <div className="grid grid-cols-2 gap-2">
                <Select value={scriptId} onValueChange={v => { setScriptId(v); setSectionId("") }}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Script..." /></SelectTrigger>
                    <SelectContent>
                        {scripts.map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">{s.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={sectionId} onValueChange={setSectionId} disabled={!scriptId}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Section..." /></SelectTrigger>
                    <SelectContent>
                        {sections.map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">{s.title || `Section ${s.sortOrder + 1}`}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Textarea className="min-h-[60px] text-xs" placeholder="Synthesized talk-track..." value={synthesized} onChange={e => setSynthesized(e.target.value)} />
        </QuickFormShell>
    )
}

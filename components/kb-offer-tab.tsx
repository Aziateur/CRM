"use client"

import { useState, useMemo } from "react"
import { useProjectId } from "@/hooks/use-project-id"
import { useOfferEntries, useOfferLevels } from "@/hooks/use-intel"
import { useCategories } from "@/hooks/use-categories"
import { createIntelEntry, updateIntelEntry, deleteIntelEntry, type IntelEntry } from "@/lib/intel"
import type { Category } from "@/lib/categories"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Plus,
    Trash2,
    Edit3,
    Pin,
    Loader2,
    Zap,
    Target,
    Gem,
    Scale,
    ThumbsUp,
    ThumbsDown,
    ChevronDown,
    ChevronRight,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSegmentMap, resolveSegmentName } from "@/hooks/segment-helpers"

// ─── Constants ───

const CONFIDENCE_TAGS = [
    { value: "locked", label: "Locked", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
    { value: "probable", label: "Probable", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
    { value: "stretch", label: "Stretch", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
    { value: "scale-gap", label: "Scale Gap", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
    { value: "discovery-gap", label: "Discovery Gap", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
    { value: "skill-gap", label: "Skill Gap", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
] as const

const SECTION_ICONS: Record<string, React.ReactNode> = {
    "capabilities": <Zap className="h-4 w-4 text-amber-500" />,
    "what-they-need": <Target className="h-4 w-4 text-red-500" />,
    "value-propositions": <Gem className="h-4 w-4 text-purple-500" />,
    "upsides-downsides": <Scale className="h-4 w-4 text-cyan-500" />,
}

const KNOWN_SECTION_SLUGS = new Set(Object.keys(SECTION_ICONS))

function getConfidence(tags: string[]) {
    return CONFIDENCE_TAGS.find(c => tags.includes(c.value))
}

function getSide(tags: string[]): "upside" | "downside" | null {
    if (tags.includes("upside")) return "upside"
    if (tags.includes("downside")) return "downside"
    return null
}

// ─── Capability Card ───

function CapabilityCard({ entry, onEdit, onDelete }: {
    entry: IntelEntry
    onEdit: (e: IntelEntry) => void
    onDelete: (id: string) => void
}) {
    const confidence = getConfidence(entry.tags)
    return (
        <Card className="group">
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {entry.title && <span className="text-sm font-semibold">{entry.title}</span>}
                            {confidence && (
                                <Badge className={`text-[10px] h-5 border-0 ${confidence.color}`}>
                                    {confidence.label}
                                </Badge>
                            )}
                        </div>
                        {entry.content && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.content}</p>}
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(entry)}><Edit3 className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-red-600" onClick={() => onDelete(entry.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Need Card ───

function NeedCard({ entry, segmentMap, onEdit, onDelete }: {
    entry: IntelEntry
    segmentMap: Map<string, { name: string }>
    onEdit: (e: IntelEntry) => void
    onDelete: (id: string) => void
}) {
    return (
        <Card className="group">
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {entry.title && <span className="text-sm font-semibold">{entry.title}</span>}
                            {entry.segmentId && (
                                <Badge variant="outline" className="text-[10px] h-5">
                                    {resolveSegmentName(entry.segmentId, segmentMap)}
                                </Badge>
                            )}
                        </div>
                        {entry.content && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.content}</p>}
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(entry)}><Edit3 className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-red-600" onClick={() => onDelete(entry.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Value Prop Card ───

function ValuePropCard({ entry, onEdit, onDelete }: {
    entry: IntelEntry
    onEdit: (e: IntelEntry) => void
    onDelete: (id: string) => void
}) {
    // Parse structured content
    const lines = entry.content.split("\n")
    return (
        <Card className="group">
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        {entry.title && <div className="text-sm font-semibold mb-1">{entry.title}</div>}
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.content}</div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(entry)}><Edit3 className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-red-600" onClick={() => onDelete(entry.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Upside/Downside Card ───

function UpsideDownsideCard({ entry, onEdit, onDelete }: {
    entry: IntelEntry
    onEdit: (e: IntelEntry) => void
    onDelete: (id: string) => void
}) {
    const side = getSide(entry.tags)
    const isUpside = side === "upside"
    return (
        <Card className={`group ${isUpside ? "border-l-2 border-l-green-500" : "border-l-2 border-l-red-400"}`}>
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                        {isUpside
                            ? <ThumbsUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            : <ThumbsDown className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                        }
                        <div>
                            {entry.title && <span className="text-sm font-semibold">{entry.title} — </span>}
                            <span className="text-sm text-muted-foreground">{entry.content}</span>
                        </div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(entry)}><Edit3 className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-red-600" onClick={() => onDelete(entry.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Section Panel ───

function SectionPanel({ category, entries, segmentMap, onAdd, onEdit, onDelete }: {
    category: Category
    entries: IntelEntry[]
    segmentMap: Map<string, { name: string }>
    onAdd: () => void
    onEdit: (e: IntelEntry) => void
    onDelete: (id: string) => void
}) {
    const [expanded, setExpanded] = useState(true)
    const icon = SECTION_ICONS[category.slug] ?? <Zap className="h-4 w-4" />

    return (
        <div className="border rounded-lg">
            <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2.5">
                    {icon}
                    <span className="font-semibold text-sm">{category.name}</span>
                    <Badge variant="secondary" className="text-xs">{entries.length}</Badge>
                </div>
                {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
            {expanded && (
                <div className="px-4 pb-4">
                    {category.description && <p className="text-xs text-muted-foreground mb-3 italic">{category.description}</p>}
                    {entries.length > 0 ? (
                        <div className="space-y-2">
                            {entries.map(entry => {
                                switch (category.slug) {
                                    case "capabilities":
                                        return <CapabilityCard key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
                                    case "what-they-need":
                                        return <NeedCard key={entry.id} entry={entry} segmentMap={segmentMap} onEdit={onEdit} onDelete={onDelete} />
                                    case "value-propositions":
                                        return <ValuePropCard key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
                                    case "upsides-downsides":
                                        return <UpsideDownsideCard key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
                                    default:
                                        return null
                                }
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No entries yet.</p>
                    )}
                    <Button size="sm" variant="outline" className="mt-3 gap-1 bg-transparent" onClick={onAdd}>
                        <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                </div>
            )}
        </div>
    )
}

// ─── Add/Edit Dialog ───

function OfferEntryDialog({
    open,
    onOpenChange,
    entry,
    sectionSlug,
    segments,
    segmentMap,
    onSave,
    isSaving,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    entry: IntelEntry | null
    sectionSlug: string
    segments: Category[]
    segmentMap: Map<string, { name: string }>
    onSave: (data: {
        title: string
        content: string
        tags: string[]
        segmentId?: string
    }) => void
    isSaving: boolean
}) {
    const [title, setTitle] = useState(entry?.title ?? "")
    const [content, setContent] = useState(entry?.content ?? "")
    const [segmentId, setSegmentId] = useState(entry?.segmentId ?? "")

    // Capabilities: confidence
    const existingConfidence = entry ? getConfidence(entry.tags)?.value ?? "" : ""
    const [confidence, setConfidence] = useState(existingConfidence)

    // Upsides & Downsides: side
    const existingSide = entry ? (getSide(entry.tags) ?? "upside") : "upside"
    const [side, setSide] = useState<"upside" | "downside">(existingSide)

    // Value Props: structured fields
    const [capRef, setCapRef] = useState("")
    const [needRef, setNeedRef] = useState("")
    const [dreamOutcome, setDreamOutcome] = useState("")
    const [likelihood, setLikelihood] = useState("")
    const [speed, setSpeed] = useState("")
    const [ease, setEase] = useState("")

    // Sync state when dialog opens with different entry
    const [lastEntry, setLastEntry] = useState<IntelEntry | null>(null)
    if (entry !== lastEntry) {
        setLastEntry(entry)
        setTitle(entry?.title ?? "")
        setContent(entry?.content ?? "")
        setSegmentId(entry?.segmentId ?? "")
        setConfidence(entry ? getConfidence(entry.tags)?.value ?? "" : "")
        setSide(entry ? (getSide(entry.tags) ?? "upside") : "upside")

        // Parse value prop fields from content
        if (sectionSlug === "value-propositions" && entry?.content) {
            const c = entry.content
            const parseField = (label: string) => {
                const re = new RegExp(`${label}:\\s*(.*)`, "i")
                return c.match(re)?.[1]?.trim() ?? ""
            }
            setCapRef(parseField("Capability"))
            setNeedRef(parseField("Need"))
            setDreamOutcome(parseField("Dream Outcome"))
            setLikelihood(parseField("Likelihood"))
            setSpeed(parseField("Speed"))
            setEase(parseField("Ease"))
        } else {
            setCapRef(""); setNeedRef(""); setDreamOutcome(""); setLikelihood(""); setSpeed(""); setEase("")
        }
    }

    const handleSubmit = () => {
        const tags: string[] = []

        if (sectionSlug === "capabilities" && confidence) {
            tags.push(confidence)
        }
        if (sectionSlug === "upsides-downsides") {
            tags.push(side)
        }

        let finalContent = content
        if (sectionSlug === "value-propositions") {
            finalContent = [
                capRef && `Capability: ${capRef}`,
                needRef && `Need: ${needRef}`,
                "",
                dreamOutcome && `Dream Outcome: ${dreamOutcome}`,
                likelihood && `Likelihood: ${likelihood}`,
                speed && `Speed: ${speed}`,
                ease && `Ease: ${ease}`,
            ].filter(l => l !== undefined).join("\n").trim()
        }

        onSave({
            title,
            content: finalContent,
            tags,
            segmentId: sectionSlug === "what-they-need" ? segmentId : undefined,
        })
    }

    const sectionLabels: Record<string, string> = {
        "capabilities": "Capability",
        "what-they-need": "Need",
        "value-propositions": "Value Proposition",
        "upsides-downsides": "Upside / Downside",
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{entry ? "Edit" : "Add"} {sectionLabels[sectionSlug] ?? "Entry"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Title (all sections) */}
                    <div>
                        <Label>{sectionSlug === "value-propositions" ? "Label" : "Title"}</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={
                            sectionSlug === "capabilities" ? "e.g. 'Full campus rebrand'" :
                                sectionSlug === "what-they-need" ? "e.g. 'Enrollment is dropping'" :
                                    sectionSlug === "value-propositions" ? "e.g. 'Rebrand → Enrollment drop'" :
                                        "Short description"
                        } className="mt-1" />
                    </div>

                    {/* Section-specific fields */}
                    {sectionSlug === "capabilities" && (
                        <div>
                            <Label>Confidence</Label>
                            <Select value={confidence} onValueChange={setConfidence}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select confidence..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {CONFIDENCE_TAGS.map(c => (
                                        <SelectItem key={c.value} value={c.value}>
                                            <span className="flex items-center gap-2">
                                                <span className={`inline-block w-2 h-2 rounded-full ${c.color.split(" ")[0]}`} />
                                                {c.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {sectionSlug === "what-they-need" && (
                        <div>
                            <Label>Segment</Label>
                            <Select value={segmentId} onValueChange={setSegmentId}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select segment..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {segments.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {sectionSlug === "upsides-downsides" && (
                        <div>
                            <Label>Type</Label>
                            <div className="flex gap-2 mt-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={side === "upside" ? "default" : "outline"}
                                    className={`gap-1 ${side === "upside" ? "bg-green-600 hover:bg-green-700" : "bg-transparent"}`}
                                    onClick={() => setSide("upside")}
                                >
                                    <ThumbsUp className="h-3.5 w-3.5" /> Upside
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={side === "downside" ? "default" : "outline"}
                                    className={`gap-1 ${side === "downside" ? "bg-red-600 hover:bg-red-700" : "bg-transparent"}`}
                                    onClick={() => setSide("downside")}
                                >
                                    <ThumbsDown className="h-3.5 w-3.5" /> Downside
                                </Button>
                            </div>
                        </div>
                    )}

                    {sectionSlug === "value-propositions" ? (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Capability →</Label>
                                    <Input value={capRef} onChange={e => setCapRef(e.target.value)} placeholder="What you deliver" className="mt-1" />
                                </div>
                                <div>
                                    <Label>→ Need</Label>
                                    <Input value={needRef} onChange={e => setNeedRef(e.target.value)} placeholder="What they need" className="mt-1" />
                                </div>
                            </div>
                            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Value Equation</p>
                                <div>
                                    <Label className="text-xs">Dream Outcome</Label>
                                    <Textarea value={dreamOutcome} onChange={e => setDreamOutcome(e.target.value)} placeholder="What's the ideal result for them?" rows={2} className="mt-1" />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-xs">Likelihood</Label>
                                        <Input value={likelihood} onChange={e => setLikelihood(e.target.value)} placeholder="How certain?" className="mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Speed</Label>
                                        <Input value={speed} onChange={e => setSpeed(e.target.value)} placeholder="How fast?" className="mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Ease</Label>
                                        <Input value={ease} onChange={e => setEase(e.target.value)} placeholder="How easy?" className="mt-1" />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <Label>Details</Label>
                            <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write the details..." rows={4} className="mt-1" />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        {entry ? "Save" : "Add"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Main Component ───

export function KbOfferTab() {
    const projectId = useProjectId()
    const { toast } = useToast()
    const { levels } = useOfferLevels()
    const { segments, segmentMap } = useSegmentMap()

    // Level filter state
    const [selectedLevelId, setSelectedLevelId] = useState<string>("")

    // Auto-select first level when loaded
    const effectiveLevel = selectedLevelId || levels[0]?.id || ""
    const { entries, offerCategories: allOfferCategories, isLoading, invalidate } = useOfferEntries(effectiveLevel || undefined)

    // Only show the 4 known sections, filter out legacy categories
    const offerCategories = useMemo(
        () => allOfferCategories.filter(c => KNOWN_SECTION_SLUGS.has(c.slug)).sort((a, b) => a.sortOrder - b.sortOrder),
        [allOfferCategories]
    )

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editEntry, setEditEntry] = useState<IntelEntry | null>(null)
    const [activeSectionSlug, setActiveSectionSlug] = useState("")
    const [activeSectionCatId, setActiveSectionCatId] = useState("")
    const [saving, setSaving] = useState(false)

    // Group entries by category
    const grouped = useMemo(() => {
        const map = new Map<string, IntelEntry[]>()
        for (const cat of offerCategories) map.set(cat.id, [])
        for (const entry of entries) {
            const list = map.get(entry.intelCategoryId) ?? []
            list.push(entry)
            map.set(entry.intelCategoryId, list)
        }
        return map
    }, [entries, offerCategories])

    const handleAdd = (cat: Category) => {
        setEditEntry(null)
        setActiveSectionSlug(cat.slug)
        setActiveSectionCatId(cat.id)
        setDialogOpen(true)
    }

    const handleEdit = (entry: IntelEntry) => {
        const cat = offerCategories.find(c => c.id === entry.intelCategoryId)
        setEditEntry(entry)
        setActiveSectionSlug(cat?.slug ?? "")
        setActiveSectionCatId(entry.intelCategoryId)
        setDialogOpen(true)
    }

    const handleSave = async (data: { title: string; content: string; tags: string[]; segmentId?: string }) => {
        if (!projectId || !effectiveLevel) return
        setSaving(true)
        try {
            if (editEntry) {
                await updateIntelEntry(editEntry.id, {
                    title: data.title || null,
                    content: data.content,
                    tags: data.tags,
                })
                // If segment changed on a need entry, update separately
                // (updateIntelEntry doesn't handle segmentId, but we can extend if needed)
            } else {
                await createIntelEntry(projectId, {
                    altitude: 1,
                    industryId: effectiveLevel, // offer level stored here
                    segmentId: data.segmentId || undefined,
                    intelCategoryId: activeSectionCatId,
                    title: data.title || null,
                    content: data.content,
                    tags: data.tags,
                })
            }
            invalidate()
            setDialogOpen(false)
            toast({ title: editEntry ? "Entry updated" : "Entry added" })
        } catch {
            toast({ variant: "destructive", title: "Failed to save" })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteIntelEntry(id)
            invalidate()
            toast({ title: "Entry deleted" })
        } catch {
            toast({ variant: "destructive", title: "Delete failed" })
        }
    }

    if (isLoading && levels.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Offer Level Filter */}
            <div className="flex items-center gap-2 flex-wrap">
                {levels.map(level => (
                    <Button
                        key={level.id}
                        size="sm"
                        variant={effectiveLevel === level.id ? "default" : "outline"}
                        className={effectiveLevel === level.id
                            ? ""
                            : "bg-transparent hover:bg-muted/80"
                        }
                        onClick={() => setSelectedLevelId(level.id)}
                    >
                        {level.name}
                    </Button>
                ))}
            </div>

            {/* Section Panels */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-4">
                    {offerCategories.map(cat => (
                        <SectionPanel
                            key={cat.id}
                            category={cat}
                            entries={grouped.get(cat.id) ?? []}
                            segmentMap={segmentMap}
                            onAdd={() => handleAdd(cat)}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* Dialog */}
            <OfferEntryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                entry={editEntry}
                sectionSlug={activeSectionSlug}
                segments={segments}
                segmentMap={segmentMap}
                onSave={handleSave}
                isSaving={saving}
            />
        </div>
    )
}

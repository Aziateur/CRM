"use client"

import { useState, useMemo } from "react"
import { useCategories } from "@/hooks/use-categories"
import { useIntelEntries, useSegmentIntel, useIntelCategories, useIndustries } from "@/hooks/use-intel"
import type { IntelEntry } from "@/lib/intel"
import type { Category } from "@/lib/categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { CategoryIcon } from "@/components/category-icon"
import {
    ChevronRight,
    ChevronDown,
    Plus,
    Globe,
    Target,
    Search,
    Loader2,
    Trash2,
    Edit3,
    Pin,
    GripVertical,
    Factory,
    Brain,
    Pencil,
    X,
} from "lucide-react"

// ─── Types ───

type TreeSelection =
    | { type: "industry"; id: string }
    | { type: "segment"; id: string; industryId: string }
    | null

// ─── Certainty Tags (red = worst → purple = best) ───

const CERTAINTY_TAGS = [
    { value: "outdated", label: "Outdated", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    { value: "hypothesis", label: "Hypothesis", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
    { value: "anecdotal", label: "Anecdotal", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
    { value: "strong-signal", label: "Strong Signal", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
    { value: "confirmed", label: "Confirmed", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
] as const

const CERTAINTY_VALUES = new Set<string>(CERTAINTY_TAGS.map(t => t.value))
const getCertaintyTag = (tags: string[]) => {
    const match = tags.find(t => CERTAINTY_VALUES.has(t))
    return match ? CERTAINTY_TAGS.find(c => c.value === match) : null
}

// ─── Entry Card ───

function EntryCard({
    entry,
    onEdit,
    onDelete,
    onTogglePin,
}: {
    entry: IntelEntry
    onEdit: (entry: IntelEntry) => void
    onDelete: (id: string) => void
    onTogglePin: (id: string, pinned: boolean) => void
}) {
    const certainty = getCertaintyTag(entry.tags)
    const otherTags = entry.tags.filter(t => !CERTAINTY_VALUES.has(t))

    return (
        <div className="group relative rounded-lg border border-border/60 bg-card p-3 hover:border-border transition-all">
            <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {entry.title && (
                            <p className="font-medium text-sm leading-tight">{entry.title}</p>
                        )}
                        {certainty && (
                            <Badge className={`text-[10px] px-1.5 py-0 border-0 font-medium ${certainty.className}`}>
                                {certainty.label}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {entry.content || <span className="italic">No content</span>}
                    </p>
                    {otherTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {otherTags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onTogglePin(entry.id, !entry.isPinned)}
                        className={`p-1 rounded hover:bg-muted ${entry.isPinned ? "text-amber-500" : "text-muted-foreground"}`}
                    >
                        <Pin className="h-3 w-3" />
                    </button>
                    <button onClick={() => onEdit(entry)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                        <Edit3 className="h-3 w-3" />
                    </button>
                    <button onClick={() => onDelete(entry.id)} className="p-1 rounded hover:bg-muted text-destructive">
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Entry Dialog (Add/Edit) ───

function EntryDialog({
    open,
    onOpenChange,
    entry,
    onSave,
    isSaving,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    entry: IntelEntry | null
    onSave: (data: { title: string; content: string; tags: string[] }) => void
    isSaving: boolean
}) {
    const existingCertainty = entry ? (entry.tags.find(t => CERTAINTY_VALUES.has(t)) ?? "") : ""
    const existingOtherTags = entry ? entry.tags.filter(t => !CERTAINTY_VALUES.has(t)).join(", ") : ""

    const [title, setTitle] = useState(entry?.title || "")
    const [content, setContent] = useState(entry?.content || "")
    const [tagsStr, setTagsStr] = useState(existingOtherTags)
    const [certainty, setCertainty] = useState(existingCertainty)

    // Reset form when entry changes
    const resetKey = entry?.id || "new"
    useMemo(() => {
        const cert = entry ? (entry.tags.find(t => CERTAINTY_VALUES.has(t)) ?? "") : ""
        const other = entry ? entry.tags.filter(t => !CERTAINTY_VALUES.has(t)).join(", ") : ""
        setTitle(entry?.title || "")
        setContent(entry?.content || "")
        setTagsStr(other)
        setCertainty(cert)
    }, [resetKey]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{entry ? "Edit Entry" : "New Entry"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Title</label>
                        <Input
                            className="h-9 mt-1"
                            placeholder="Entry title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Content</label>
                        <Textarea
                            className="mt-1 min-h-[120px]"
                            placeholder="Details, notes, intel..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">Certainty</label>
                            <Select value={certainty} onValueChange={setCertainty}>
                                <SelectTrigger className="h-9 mt-1">
                                    <SelectValue placeholder="How sure?" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">
                                        <span className="text-muted-foreground">None</span>
                                    </SelectItem>
                                    {CERTAINTY_TAGS.map(ct => (
                                        <SelectItem key={ct.value} value={ct.value}>
                                            <span className={`inline-flex items-center gap-1.5`}>
                                                <span className={`inline-block w-2 h-2 rounded-full ${ct.className.split(" ")[0]}`} />
                                                {ct.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">Tags</label>
                            <Input
                                className="h-9 mt-1"
                                placeholder="Comma-separated..."
                                value={tagsStr}
                                onChange={(e) => setTagsStr(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            const freeTags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
                            const allTags = certainty && certainty !== "__none__" ? [certainty, ...freeTags] : freeTags
                            onSave({
                                title: title.trim(),
                                content: content.trim(),
                                tags: allTags,
                            })
                        }}
                        disabled={isSaving || !content.trim()}
                    >
                        {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        {entry ? "Save" : "Add Entry"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Add Industry / Segment Dialog ───

function AddEntityDialog({
    open,
    onOpenChange,
    entityType,
    onSave,
    isSaving,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    entityType: "industry" | "segment"
    onSave: (name: string) => void
    isSaving: boolean
}) {
    const [name, setName] = useState("")

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setName("") }}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>
                        {entityType === "industry" ? "New Industry" : "New Segment"}
                    </DialogTitle>
                </DialogHeader>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    <Input
                        className="h-9 mt-1"
                        placeholder={entityType === "industry" ? "e.g. Tutoring, Healthcare..." : "e.g. Med School Prep, Music..."}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && name.trim()) {
                                onSave(name.trim())
                                setName("")
                            }
                        }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={() => { onSave(name.trim()); setName("") }}
                        disabled={isSaving || !name.trim()}
                    >
                        {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Category Accordion for Intel ───

function IntelCategoryAccordion({
    category,
    entries,
    onAddEntry,
    onEditEntry,
    onDeleteEntry,
    onTogglePin,
}: {
    category: Category
    entries: IntelEntry[]
    onAddEntry: (categoryId: string) => void
    onEditEntry: (entry: IntelEntry) => void
    onDeleteEntry: (id: string) => void
    onTogglePin: (id: string, pinned: boolean) => void
}) {
    const [isOpen, setIsOpen] = useState(entries.length > 0)
    const catEntries = entries.filter((e) => e.intelCategoryId === category.id)
    const pinnedFirst = [...catEntries].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))

    return (
        <div className="border border-border/50 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
            >
                {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <CategoryIcon icon={category.icon} className="h-4 w-4 shrink-0" color={category.color} />
                <span className="font-medium text-sm flex-1">{category.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{catEntries.length}</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onAddEntry(category.id)
                    }}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-0.5"
                >
                    <Plus className="h-3 w-3" /> Add
                </button>
            </button>
            {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                    {pinnedFirst.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2 text-center">
                            No entries yet
                        </p>
                    ) : (
                        pinnedFirst.map((entry) => (
                            <EntryCard
                                key={entry.id}
                                entry={entry}
                                onEdit={onEditEntry}
                                onDelete={onDeleteEntry}
                                onTogglePin={onTogglePin}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Firmographic Fields (single-value altitude 2) ───

function FirmographicFields({
    categories,
    entries,
    onSaveSingleValue,
}: {
    categories: Category[]
    entries: IntelEntry[]
    onSaveSingleValue: (categoryId: string, content: string) => void
}) {
    const fields = categories.filter((c) => c.cardinality === "single")
    if (fields.length === 0) return null

    const filledCount = fields.filter((f) => {
        const entry = entries.find((e) => e.intelCategoryId === f.id && !e.title)
        return entry && entry.content.trim()
    }).length

    return (
        <div className="border border-border/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">Firmographic Fields</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                    {Math.round((filledCount / Math.max(fields.length, 1)) * 100)}% ({filledCount}/{fields.length})
                </Badge>
            </div>
            <div className="space-y-2">
                {fields.map((field) => {
                    const entry = entries.find((e) => e.intelCategoryId === field.id && !e.title)
                    return (
                        <div key={field.id} className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground w-36 shrink-0 truncate">{field.name}</label>
                            <Input
                                className="h-8 text-xs flex-1"
                                placeholder={field.description || "..."}
                                defaultValue={entry?.content || ""}
                                onBlur={(e) => onSaveSingleValue(field.id, e.target.value)}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Industry Panel (Altitude 1) ───

function IndustryPanel({ industry }: { industry: Category }) {
    const { entries, isLoading, addEntry, editEntry, removeEntry } = useIntelEntries(1, industry.id)
    const { categories } = useIntelCategories(1)
    const [dialogEntry, setDialogEntry] = useState<IntelEntry | null>(null)
    const [dialogCategoryId, setDialogCategoryId] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const handleAddEntry = (categoryId: string) => {
        setDialogEntry(null)
        setDialogCategoryId(categoryId)
        setDialogOpen(true)
    }

    const handleEditEntry = (entry: IntelEntry) => {
        setDialogEntry(entry)
        setDialogCategoryId(entry.intelCategoryId)
        setDialogOpen(true)
    }

    const handleSave = (data: { title: string; content: string; tags: string[] }) => {
        if (dialogEntry) {
            editEntry.mutate(
                { id: dialogEntry.id, updates: data },
                { onSuccess: () => setDialogOpen(false) }
            )
        } else if (dialogCategoryId) {
            addEntry.mutate(
                { intelCategoryId: dialogCategoryId, ...data },
                { onSuccess: () => setDialogOpen(false) }
            )
        }
    }

    const handleTogglePin = (id: string, pinned: boolean) => {
        editEntry.mutate({ id, updates: { isPinned: pinned } })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 pb-2 border-b">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                    <CategoryIcon icon={industry.icon} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h2 className="font-bold text-lg">{industry.name}</h2>
                    <p className="text-xs text-muted-foreground">
                        {industry.description || "Industry-level market intelligence"}
                    </p>
                </div>
            </div>

            {/* Altitude 1 badge */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Globe className="h-4 w-4" />
                    <span className="text-sm font-semibold">Altitude 1 — Industry Weather</span>
                </div>
                <p className="text-xs text-muted-foreground">
                    Regulations, market shifts, competitor moves. Affects ALL segments.
                </p>
            </div>

            {/* Category accordions */}
            <div className="space-y-2">
                {categories.map((cat) => (
                    <IntelCategoryAccordion
                        key={cat.id}
                        category={cat}
                        entries={entries}
                        onAddEntry={handleAddEntry}
                        onEditEntry={handleEditEntry}
                        onDeleteEntry={(id) => removeEntry.mutate(id)}
                        onTogglePin={handleTogglePin}
                    />
                ))}
            </div>

            {categories.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No industry intel categories configured.</p>
                    <p className="text-xs mt-1">Check Settings → Categories to set up Altitude 1 categories.</p>
                </div>
            )}

            <EntryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                entry={dialogEntry}
                onSave={handleSave}
                isSaving={addEntry.isPending || editEntry.isPending}
            />
        </div>
    )
}

// ─── Segment Panel (Altitude 2 + 3) ───

function SegmentPanel({ segment, industry }: { segment: Category; industry: Category }) {
    const { entries, isLoading, addEntry, editEntry, removeEntry, saveSingleValue } = useSegmentIntel(segment.id)
    const { categories: alt2Cats, singleValue: firmoCats, multiEntry: multiAlt2 } = useIntelCategories(2)
    const { categories: alt3Cats } = useIntelCategories(3)
    const [dialogEntry, setDialogEntry] = useState<IntelEntry | null>(null)
    const [dialogCategoryId, setDialogCategoryId] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const handleAddEntry = (categoryId: string) => {
        setDialogEntry(null)
        setDialogCategoryId(categoryId)
        setDialogOpen(true)
    }

    const handleEditEntry = (entry: IntelEntry) => {
        setDialogEntry(entry)
        setDialogCategoryId(entry.intelCategoryId)
        setDialogOpen(true)
    }

    const handleSave = (data: { title: string; content: string; tags: string[] }) => {
        if (dialogEntry) {
            editEntry.mutate(
                { id: dialogEntry.id, updates: data },
                { onSuccess: () => setDialogOpen(false) }
            )
        } else if (dialogCategoryId) {
            const alt = alt3Cats.some((c) => c.id === dialogCategoryId) ? 3 : 2
            addEntry.mutate(
                {
                    intelCategoryId: dialogCategoryId,
                    altitude: alt as 2 | 3,
                    ...data,
                },
                { onSuccess: () => setDialogOpen(false) }
            )
        }
    }

    const handleTogglePin = (id: string, pinned: boolean) => {
        editEntry.mutate({ id, updates: { isPinned: pinned } })
    }

    const alt2Entries = entries.filter((e) => e.altitude === 2)
    const alt3Entries = entries.filter((e) => e.altitude === 3)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3 pb-2 border-b">
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
                    <CategoryIcon icon={segment.icon} className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                    <h2 className="font-bold text-lg">{segment.name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CategoryIcon icon={industry.icon} className="h-3 w-3" />
                        {industry.name}
                        <span className="text-muted-foreground/50 mx-0.5">→</span>
                        {segment.name}
                    </p>
                </div>
            </div>

            {/* Firmographic Fields */}
            <FirmographicFields
                categories={firmoCats ?? []}
                entries={alt2Entries}
                onSaveSingleValue={(categoryId, content) =>
                    saveSingleValue.mutate({ intelCategoryId: categoryId, value: content })
                }
            />

            {/* Altitude 2 — Segment Intel */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Factory className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        Altitude 2 — Segment Intel
                    </span>
                    <p className="text-xs text-muted-foreground">
                        Business model, pricing, tech stack — specific to {segment.name}.
                    </p>
                </div>
                <div className="space-y-2">
                    {(multiAlt2 ?? []).map((cat) => (
                        <IntelCategoryAccordion
                            key={cat.id}
                            category={cat}
                            entries={alt2Entries}
                            onAddEntry={handleAddEntry}
                            onEditEntry={handleEditEntry}
                            onDeleteEntry={(id) => removeEntry.mutate(id)}
                            onTogglePin={handleTogglePin}
                        />
                    ))}
                </div>
            </div>

            {/* Altitude 3 — The Human ICP */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">
                        Altitude 3 — The Human ICP
                    </span>
                    <p className="text-xs text-muted-foreground">
                        Mindset, language, and psychology inside the segment shell.
                    </p>
                </div>
                <div className="space-y-2">
                    {alt3Cats.map((cat) => (
                        <IntelCategoryAccordion
                            key={cat.id}
                            category={cat}
                            entries={alt3Entries}
                            onAddEntry={handleAddEntry}
                            onEditEntry={handleEditEntry}
                            onDeleteEntry={(id) => removeEntry.mutate(id)}
                            onTogglePin={handleTogglePin}
                        />
                    ))}
                </div>
            </div>

            <EntryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                entry={dialogEntry}
                onSave={handleSave}
                isSaving={addEntry.isPending || editEntry.isPending}
            />
        </div>
    )
}

// ─── Navigation Tree ───

function IndustryTreeNode({
    industry,
    segments,
    selection,
    onSelect,
    onAddSegment,
}: {
    industry: Category
    segments: Category[]
    selection: TreeSelection
    onSelect: (sel: TreeSelection) => void
    onAddSegment: (industryId: string) => void
}) {
    const isIndustrySelected = selection?.type === "industry" && selection.id === industry.id
    const hasSelectedSegment = selection?.type === "segment" && selection.industryId === industry.id
    const [isExpanded, setIsExpanded] = useState(isIndustrySelected || hasSelectedSegment)

    // Auto-expand when a child is selected
    useMemo(() => {
        if (hasSelectedSegment) setIsExpanded(true)
    }, [hasSelectedSegment]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            {/* Industry row */}
            <button
                onClick={() => {
                    onSelect({ type: "industry", id: industry.id })
                    setIsExpanded(true)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-sm ${isIndustrySelected
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                    : "hover:bg-muted/70"
                    }`}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsExpanded(!isExpanded)
                    }}
                    className="p-0.5 hover:bg-muted rounded"
                >
                    {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                </button>
                <CategoryIcon icon={industry.icon} className="h-4 w-4 shrink-0" color={industry.color} />
                <span className="flex-1 truncate">{industry.name}</span>
                <span className="text-[10px] text-muted-foreground">{segments.length}</span>
            </button>

            {/* Segments (children) */}
            {isExpanded && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/40 pl-2">
                    {segments.map((seg) => {
                        const isSegSelected = selection?.type === "segment" && selection.id === seg.id
                        return (
                            <button
                                key={seg.id}
                                onClick={() =>
                                    onSelect({ type: "segment", id: seg.id, industryId: industry.id })
                                }
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-all text-sm ${isSegSelected
                                    ? "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800"
                                    : "hover:bg-muted/50 text-foreground/80"
                                    }`}
                            >
                                {seg.color && (
                                    <span
                                        className="h-2 w-2 rounded-full shrink-0"
                                        style={{ backgroundColor: seg.color }}
                                    />
                                )}
                                <CategoryIcon icon={seg.icon} className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{seg.name}</span>
                            </button>
                        )
                    })}
                    <button
                        onClick={() => onAddSegment(industry.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                        Add Segment
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── Main Component ───

export function KbMarketIntelTab() {
    const { industries } = useIndustries()
    const { categories: allSegments, addCategory: addSegmentMutation, isLoading: industriesLoading } = useCategories("segment")
    const { addCategory: addIndustryMutation } = useCategories("industry")

    const [selection, setSelection] = useState<TreeSelection>(null)
    const [addIndustryOpen, setAddIndustryOpen] = useState(false)
    const [addSegmentOpen, setAddSegmentOpen] = useState(false)
    const [addSegmentIndustryId, setAddSegmentIndustryId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    // Group segments by their parent industry
    const segmentsByIndustry = useMemo(() => {
        const map: Record<string, Category[]> = {}
        for (const ind of industries) {
            map[ind.id] = allSegments
                .filter((s) => s.parentId === ind.id && s.isActive)
                .sort((a, b) => a.sortOrder - b.sortOrder)
        }
        // Orphan segments (no parent) — group under first industry if any
        const orphans = allSegments.filter((s) => !s.parentId && s.isActive)
        if (orphans.length > 0 && industries.length > 0) {
            const firstId = industries[0].id
            map[firstId] = [...(map[firstId] || []), ...orphans]
        }
        return map
    }, [industries, allSegments])

    // Auto-select first industry if nothing selected
    useMemo(() => {
        if (!selection && industries.length > 0) {
            setSelection({ type: "industry", id: industries[0].id })
        }
    }, [industries]) // eslint-disable-line react-hooks/exhaustive-deps

    // Resolve selected entities
    const selectedIndustry = useMemo(() => {
        if (!selection) return null
        if (selection.type === "industry") return industries.find((i) => i.id === selection.id) ?? null
        if (selection.type === "segment") return industries.find((i) => i.id === selection.industryId) ?? null
        return null
    }, [selection, industries])

    const selectedSegment = useMemo(() => {
        if (selection?.type !== "segment") return null
        return allSegments.find((s) => s.id === selection.id) ?? null
    }, [selection, allSegments])

    const handleAddIndustry = (name: string) => {
        addIndustryMutation.mutate(
            { name, icon: "factory", color: "#3b82f6" },
            {
                onSuccess: () => setAddIndustryOpen(false),
            }
        )
    }

    const handleAddSegment = (name: string) => {
        if (!addSegmentIndustryId) return
        // We need to create a segment with parent_id set
        // The categories hook doesn't support parent_id natively, so we'll use the mutation
        // and then update parent_id
        addSegmentMutation.mutate(
            { name, icon: "target", color: "#8b5cf6", metadata: { parentIndustryId: addSegmentIndustryId } },
            {
                onSuccess: (newSeg) => {
                    // Update parent_id via direct call
                    import("@/lib/supabase").then(({ getSupabase }) => {
                        getSupabase()
                            .from("categories")
                            .update({ parent_id: addSegmentIndustryId })
                            .eq("id", newSeg.id)
                            .then(() => {
                                // Invalidate to refresh
                                window.location.reload() // Quick refresh to sync — TODO: better invalidation
                            })
                    })
                    setAddSegmentOpen(false)
                },
            }
        )
    }

    if (industriesLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Empty state — no industries at all
    if (industries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-2xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center mb-4">
                    <Globe className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Create your first industry</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Industries organize your market intelligence. Start with your primary business vertical
                    (e.g., Tutoring) and add segments underneath.
                </p>
                <Button onClick={() => setAddIndustryOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Industry
                </Button>
                <AddEntityDialog
                    open={addIndustryOpen}
                    onOpenChange={setAddIndustryOpen}
                    entityType="industry"
                    onSave={handleAddIndustry}
                    isSaving={addIndustryMutation.isPending}
                />
            </div>
        )
    }

    return (
        <div className="flex gap-0 h-[calc(100vh-220px)] min-h-[500px]">
            {/* ── LEFT: Navigation Tree ── */}
            <div className="w-72 shrink-0 border-r overflow-y-auto pr-2 py-2 space-y-1">
                <div className="px-2 pb-2 mb-1">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            className="h-8 pl-8 text-xs"
                            placeholder="Search industries & segments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {industries
                    .filter((ind) => {
                        if (!searchQuery) return true
                        const q = searchQuery.toLowerCase()
                        const segments = segmentsByIndustry[ind.id] || []
                        return (
                            ind.name.toLowerCase().includes(q) ||
                            segments.some((s) => s.name.toLowerCase().includes(q))
                        )
                    })
                    .map((industry) => (
                        <IndustryTreeNode
                            key={industry.id}
                            industry={industry}
                            segments={(segmentsByIndustry[industry.id] || []).filter((s) => {
                                if (!searchQuery) return true
                                return s.name.toLowerCase().includes(searchQuery.toLowerCase())
                            })}
                            selection={selection}
                            onSelect={setSelection}
                            onAddSegment={(industryId) => {
                                setAddSegmentIndustryId(industryId)
                                setAddSegmentOpen(true)
                            }}
                        />
                    ))}

                <button
                    onClick={() => setAddIndustryOpen(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mt-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Industry
                </button>
            </div>

            {/* ── RIGHT: Context Panel ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {!selection && (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                        <Globe className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm">Select an industry or segment from the tree.</p>
                    </div>
                )}

                {selection?.type === "industry" && selectedIndustry && (
                    <IndustryPanel industry={selectedIndustry} />
                )}

                {selection?.type === "segment" && selectedSegment && selectedIndustry && (
                    <SegmentPanel segment={selectedSegment} industry={selectedIndustry} />
                )}
            </div>

            {/* Dialogs */}
            <AddEntityDialog
                open={addIndustryOpen}
                onOpenChange={setAddIndustryOpen}
                entityType="industry"
                onSave={handleAddIndustry}
                isSaving={addIndustryMutation.isPending}
            />
            <AddEntityDialog
                open={addSegmentOpen}
                onOpenChange={setAddSegmentOpen}
                entityType="segment"
                onSave={handleAddSegment}
                isSaving={addSegmentMutation.isPending}
            />
        </div>
    )
}

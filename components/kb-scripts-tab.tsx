"use client"

import { useState, useMemo, useCallback } from "react"
import { useScripts, useScriptSections, type KbScript, type KbScriptSection } from "@/hooks/use-scripts"
import { useCategories, type Category } from "@/hooks/use-categories"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Plus,
    Trash2,
    Pencil,
    Pin,
    Search,
    FileText,
    Loader2,
    ChevronRight,
    ChevronDown,
    GripVertical,
    Copy,
    MoreHorizontal,
    List,
    Check,
    X,
} from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"

// ─── Create / Edit Script Dialog ───

function ScriptMetaDialog({
    open,
    onOpenChange,
    script,
    segments,
    stages,
    onSave,
    isPending,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    script?: KbScript | null
    segments: Category[]
    stages: Category[]
    onSave: (data: { title: string; description?: string; segmentId?: string | null; stageId?: string | null; isPinned?: boolean; tags?: string[] }) => void
    isPending: boolean
}) {
    const [title, setTitle] = useState(script?.title ?? "")
    const [description, setDescription] = useState(script?.description ?? "")
    const [segmentId, setSegmentId] = useState<string>(script?.segmentId ?? "_all")
    const [stageId, setStageId] = useState<string>(script?.stageId ?? "_all")
    const [isPinned, setIsPinned] = useState(script?.isPinned ?? false)
    const [tagsStr, setTagsStr] = useState((script?.tags ?? []).join(", "))

    const handleSubmit = () => {
        if (!title.trim()) return
        onSave({
            title: title.trim(),
            description: description.trim(),
            segmentId: segmentId === "_all" ? null : segmentId,
            stageId: stageId === "_all" ? null : stageId,
            isPinned,
            tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{script ? "Edit Script" : "New Script"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label className="text-xs">Title</Label>
                        <Input
                            className="h-9 mt-1"
                            placeholder="e.g., Trucking Cold Open v2..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Description / Notes</Label>
                        <Textarea
                            className="mt-1 min-h-[80px] text-sm"
                            placeholder="When to use this script, context notes..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs">Segment</Label>
                            <Select value={segmentId} onValueChange={setSegmentId}>
                                <SelectTrigger className="h-9 mt-1">
                                    <SelectValue placeholder="All segments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_all">All Segments</SelectItem>
                                    {segments.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            <span className="flex items-center gap-2"><CategoryIcon icon={s.icon} className="h-3.5 w-3.5" /> {s.name}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Stage</Label>
                            <Select value={stageId} onValueChange={setStageId}>
                                <SelectTrigger className="h-9 mt-1">
                                    <SelectValue placeholder="All stages" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_all">All Stages</SelectItem>
                                    {stages.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            <span className="flex items-center gap-2"><CategoryIcon icon={s.icon} className="h-3.5 w-3.5" /> {s.name}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Tags</Label>
                        <Input
                            className="h-9 mt-1"
                            placeholder="Comma-separated tags..."
                            value={tagsStr}
                            onChange={(e) => setTagsStr(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch checked={isPinned} onCheckedChange={setIsPinned} />
                        <Label className="text-xs">Pin to Call Prep (always show)</Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!title.trim() || isPending}>
                        {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        {script ? "Save" : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Render formatted content (markdown-like) ───

function FormattedContent({ content }: { content: string }) {
    if (!content) return <p className="text-sm text-muted-foreground italic">No content yet.</p>

    const lines = content.split("\n")
    return (
        <div className="space-y-1 text-sm leading-relaxed">
            {lines.map((line, i) => {
                const trimmed = line.trim()
                if (!trimmed) return <div key={i} className="h-2" />
                // Bold headers: **text**
                if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
                    return <p key={i} className="font-bold text-foreground mt-3 first:mt-0">{trimmed.replace(/\*\*/g, "")}</p>
                }
                // Horizontal rule
                if (trimmed === "---") return <hr key={i} className="my-3 border-border/50" />
                // Coaching tip: 💡 *...*
                if (trimmed.startsWith("💡")) {
                    return (
                        <div key={i} className="bg-amber-500/5 border-l-2 border-amber-500/40 pl-3 py-1.5 my-2 rounded-r text-xs text-muted-foreground italic">
                            {trimmed.replace(/^💡\s*/, "").replace(/^\*/, "").replace(/\*$/, "")}
                        </div>
                    )
                }
                // Emoji bullet: 🔹 🟢 🟡 🔵 🔴 ⚪
                if (/^[🔹🟢🟡🔵🔴⚪]/.test(trimmed)) {
                    return (
                        <div key={i} className="pl-1 py-0.5 text-sm">
                            {trimmed}
                        </div>
                    )
                }
                // Arrow response: → ...
                if (trimmed.startsWith("→")) {
                    return <p key={i} className="pl-6 text-sm text-primary/80">{trimmed}</p>
                }
                // Render inline bold: **text** within the line
                const parts = trimmed.split(/(\*\*[^*]+\*\*)/g)
                return (
                    <p key={i} className="text-sm text-foreground/90">
                        {parts.map((part, j) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                                return <strong key={j}>{part.slice(2, -2)}</strong>
                            }
                            // Inline italic: *text*
                            const italicParts = part.split(/(\*[^*]+\*)/g)
                            return italicParts.map((ip, k) => {
                                if (ip.startsWith("*") && ip.endsWith("*") && !ip.startsWith("**")) {
                                    return <em key={`${j}-${k}`} className="text-muted-foreground">{ip.slice(1, -1)}</em>
                                }
                                return <span key={`${j}-${k}`}>{ip}</span>
                            })
                        })}
                    </p>
                )
            })}
        </div>
    )
}

// ─── Section Block ───

function SectionBlock({
    section,
    sectionTypeName,
    sectionTypeIcon,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
    isUpdating,
}: {
    section: KbScriptSection
    sectionTypeName: string
    sectionTypeIcon: string
    onUpdate: (content: string) => void
    onDelete: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    isFirst: boolean
    isLast: boolean
    isUpdating: boolean
}) {
    const [isOpen, setIsOpen] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [localContent, setLocalContent] = useState(section.content)
    const [isDirty, setIsDirty] = useState(false)

    const handleSave = () => {
        if (isDirty && localContent !== section.content) {
            onUpdate(localContent)
            setIsDirty(false)
        }
        setIsEditing(false)
    }

    const handleCancel = () => {
        setLocalContent(section.content)
        setIsDirty(false)
        setIsEditing(false)
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="border rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                    className="text-muted-foreground hover:text-foreground text-[9px] leading-none disabled:opacity-30 px-0.5"
                                    disabled={isFirst}
                                    onClick={onMoveUp}
                                >▲</button>
                                <button
                                    className="text-muted-foreground hover:text-foreground text-[9px] leading-none disabled:opacity-30 px-0.5"
                                    disabled={isLast}
                                    onClick={onMoveDown}
                                >▼</button>
                            </div>
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                            {isOpen ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="inline-flex items-center"><CategoryIcon icon={sectionTypeIcon} className="h-3.5 w-3.5" /></span>
                            <span className="text-sm font-medium">{sectionTypeName}</span>
                            {!isOpen && localContent && (
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    — {localContent.slice(0, 50)}...
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {isDirty && (
                                <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-600 border-amber-500/30">
                                    Unsaved
                                </Badge>
                            )}
                            {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                            {!isEditing && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
                                    title="Edit section"
                                >
                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => { e.stopPropagation(); onDelete() }}
                            >
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="p-3">
                        {isEditing ? (
                            <div className="space-y-2">
                                <Textarea
                                    className="min-h-[200px] font-mono text-sm resize-y"
                                    placeholder={`Write your ${sectionTypeName.toLowerCase()} here...`}
                                    value={localContent}
                                    onChange={(e) => { setLocalContent(e.target.value); setIsDirty(true) }}
                                    autoFocus
                                />
                                <div className="flex items-center gap-2 justify-end">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancel}>
                                        <X className="h-3 w-3 mr-1" /> Cancel
                                    </Button>
                                    <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={!isDirty}>
                                        <Check className="h-3 w-3 mr-1" /> Save
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="cursor-pointer hover:bg-muted/20 rounded p-1 -m-1 transition-colors"
                                onClick={() => setIsEditing(true)}
                                title="Click to edit"
                            >
                                <FormattedContent content={localContent} />
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    )
}

// ─── Script List Item ───

function ScriptListItem({
    script,
    segmentName,
    stageName,
    isSelected,
    onClick,
}: {
    script: KbScript
    segmentName: string | null
    stageName: string | null
    isSelected: boolean
    onClick: () => void
}) {
    return (
        <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${isSelected
                ? "bg-primary/5 border-primary/30 shadow-sm"
                : "border-transparent hover:bg-muted/40"
                } ${!script.isActive ? "opacity-50" : ""}`}
            onClick={onClick}
        >
            <FileText className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : ""}`}>
                    {script.title}
                    {script.isPinned && <Pin className="inline h-3 w-3 text-amber-500 ml-1" />}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    {segmentName && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1">{segmentName}</Badge>
                    )}
                    {stageName && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">{stageName}</Badge>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Script Editor (right panel) ───

function ScriptEditor({
    script,
    segments,
    stages,
    sectionTypes,
    onEditMeta,
    onDelete,
    onTogglePin,
}: {
    script: KbScript
    segments: Category[]
    stages: Category[]
    sectionTypes: Category[]
    onEditMeta: () => void
    onDelete: () => void
    onTogglePin: () => void
}) {
    const { sections, isLoading, addSection, editSection, removeSection } = useScriptSections(script.id)
    const { toast } = useToast()

    const segmentName = useMemo(() => {
        if (!script.segmentId) return null
        return segments.find(s => s.id === script.segmentId)?.name ?? null
    }, [script.segmentId, segments])

    const stageName = useMemo(() => {
        if (!script.stageId) return null
        return stages.find(s => s.id === script.stageId)?.name ?? null
    }, [script.stageId, stages])

    const sectionTypeMap = useMemo(
        () => new Map(sectionTypes.map(t => [t.id, t])),
        [sectionTypes]
    )

    const handleAddSection = useCallback((typeId: string) => {
        const type = sectionTypeMap.get(typeId)
        if (!type) {
            toast({ title: "Error", description: "Section type not found", variant: "destructive" })
            return
        }
        addSection.mutate(
            {
                sectionTypeId: typeId,
                title: type.name ?? "Section",
                content: "",
                sortOrder: sections.length,
            },
            {
                onSuccess: () => toast({ title: `${type.name ?? "Section"} added` }),
                onError: (e) => {
                    console.error("addSection failed:", e)
                    toast({ title: "Error adding section", description: String(e?.message ?? e), variant: "destructive" })
                },
            }
        )
    }, [addSection, sectionTypeMap, sections.length, toast])

    const handleUpdateSection = useCallback((sectionId: string, content: string) => {
        editSection.mutate(
            { id: sectionId, updates: { content } },
            {
                onError: (e) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
            }
        )
    }, [editSection, toast])

    const handleDeleteSection = useCallback((sectionId: string) => {
        removeSection.mutate(sectionId, {
            onSuccess: () => toast({ title: "Section removed" }),
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        })
    }, [removeSection, toast])

    const handleReorderSection = useCallback((index: number, direction: -1 | 1) => {
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= sections.length) return
        const sectionA = sections[index]
        const sectionB = sections[newIndex]
        // Swap sort orders
        editSection.mutate({ id: sectionA.id, updates: { sortOrder: sectionB.sortOrder } })
        editSection.mutate({ id: sectionB.id, updates: { sortOrder: sectionA.sortOrder } })
    }, [sections, editSection])

    const [localSummary, setLocalSummary] = useState(script.summary ?? "")
    const [summaryDirty, setSummaryDirty] = useState(false)
    const [summaryEditing, setSummaryEditing] = useState(false)
    const { editScript } = useScripts()

    const handleSaveSummary = () => {
        if (summaryDirty) {
            editScript.mutate(
                { id: script.id, updates: { summary: localSummary } },
                { onSuccess: () => setSummaryDirty(false) }
            )
        }
        setSummaryEditing(false)
    }

    return (
        <div className="space-y-4">
            {/* Script header */}
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {script.title}
                        {script.isPinned && <Pin className="h-4 w-4 text-amber-500" />}
                    </h3>
                    {script.description && (
                        <p className="text-sm text-muted-foreground mt-1">{script.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        {segmentName && <Badge variant="outline">{segmentName}</Badge>}
                        {stageName && <Badge variant="secondary">{stageName}</Badge>}
                        {script.timesUsed > 0 && (
                            <span className="text-xs text-muted-foreground">Used {script.timesUsed}×</span>
                        )}
                        {(script.tags ?? []).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                        ))}
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onEditMeta}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onTogglePin}>
                            <Pin className="h-3.5 w-3.5 mr-2" />
                            {script.isPinned ? "Unpin" : "Pin to Prep"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                            const text = sections.map(s => {
                                const type = sectionTypeMap.get(s.sectionTypeId)
                                return `## ${type?.name ?? "Section"}\n${s.content}`
                            }).join("\n\n")
                            navigator.clipboard.writeText(text)
                        }}>
                            <Copy className="h-3.5 w-3.5 mr-2" />
                            Copy Full Script
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete Script
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Summary panel */}
            <Card className="border-primary/20 bg-primary/[0.02]">
                <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <List className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-primary">Summary</span>
                        </div>
                        {!summaryEditing ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setSummaryEditing(true)}
                                title="Edit summary"
                            >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                        ) : (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setLocalSummary(script.summary ?? ""); setSummaryDirty(false); setSummaryEditing(false) }}>
                                    <X className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveSummary} disabled={!summaryDirty}>
                                    <Check className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                    {summaryEditing ? (
                        <Textarea
                            className="min-h-[100px] text-sm resize-y"
                            placeholder={"Type your summary here...\n\n• Key point one\n• Key point two\n• Key point three"}
                            value={localSummary}
                            onChange={(e) => { setLocalSummary(e.target.value); setSummaryDirty(true) }}
                            autoFocus
                        />
                    ) : localSummary ? (
                        <div
                            className="cursor-pointer hover:bg-primary/5 rounded p-1 -m-1 transition-colors"
                            onClick={() => setSummaryEditing(true)}
                            title="Click to edit summary"
                        >
                            <div className="space-y-1">
                                {localSummary.split("\n").filter(l => l.trim()).map((line, i) => (
                                    <p key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                                        {(line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*")) ? (
                                            <>{line.trim()}</>
                                        ) : (
                                            <><span className="text-primary/60">•</span> {line.trim()}</>
                                        )}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p
                            className="text-xs text-muted-foreground italic cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => setSummaryEditing(true)}
                        >
                            Click to add a summary with key bullet points...
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Sections */}
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-2">
                    {sections.length === 0 && (
                        <Card className="border-dashed">
                            <CardContent className="py-8 text-center">
                                <p className="text-sm text-muted-foreground">No sections yet.</p>
                                <p className="text-xs text-muted-foreground mt-1">Add your first section to start building your structured script.</p>
                            </CardContent>
                        </Card>
                    )}
                    {sections.map((section, idx) => {
                        const type = sectionTypeMap.get(section.sectionTypeId)
                        return (
                            <SectionBlock
                                key={section.id}
                                section={section}
                                sectionTypeName={type?.name ?? "Section"}
                                sectionTypeIcon={type?.icon ?? "file-text"}
                                onUpdate={(content) => handleUpdateSection(section.id, content)}
                                onDelete={() => handleDeleteSection(section.id)}
                                onMoveUp={() => handleReorderSection(idx, -1)}
                                onMoveDown={() => handleReorderSection(idx, 1)}
                                isFirst={idx === 0}
                                isLast={idx === sections.length - 1}
                                isUpdating={editSection.isPending}
                            />
                        )
                    })}
                </div>
            )}

            {/* Add section button */}
            {addSection.isPending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Adding section...
                </div>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full border-dashed" disabled={addSection.isPending}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Section
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                    {sectionTypes.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                            No section types defined yet. Go to <span className="font-medium">KB Config → Script Section Types</span> to create them.
                        </div>
                    ) : (
                        sectionTypes.map((type) => (
                            <DropdownMenuItem
                                key={type.id}
                                onClick={() => handleAddSection(type.id)}
                            >
                                <span className="mr-2 inline-flex"><CategoryIcon icon={type.icon} className="h-3.5 w-3.5" /></span>
                                {type.name}
                                {type.description && (
                                    <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[120px]">{type.description}</span>
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

// ─── Main Scripts Tab ───

export function KbScriptsTab() {
    const { scripts, isLoading, addScript, editScript, removeScript } = useScripts()
    const { activeCategories: segments } = useCategories("segment")
    const { activeCategories: stages } = useCategories("script_stage")
    const { activeCategories: sectionTypes } = useCategories("script_section_type")
    const { toast } = useToast()

    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingScript, setEditingScript] = useState<KbScript | null>(null)
    const [search, setSearch] = useState("")
    const [filterSegment, setFilterSegment] = useState("_all")
    const [filterStage, setFilterStage] = useState("_all")

    const segmentMap = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments])
    const stageMap = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages])

    const filtered = useMemo(() => {
        return scripts.filter((s) => {
            if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.description.toLowerCase().includes(search.toLowerCase())) return false
            if (filterSegment !== "_all" && s.segmentId && s.segmentId !== filterSegment) return false
            if (filterStage !== "_all" && s.stageId && s.stageId !== filterStage) return false
            return true
        })
    }, [scripts, search, filterSegment, filterStage])

    const selectedScript = useMemo(() => {
        if (!selectedId) return null
        return scripts.find(s => s.id === selectedId) ?? null
    }, [selectedId, scripts])

    // Auto-select first script
    const effectiveSelected = selectedScript ?? (filtered.length > 0 ? filtered[0] : null)

    const handleSave = (data: { title: string; description?: string; segmentId?: string | null; stageId?: string | null; isPinned?: boolean; tags?: string[] }) => {
        if (editingScript) {
            editScript.mutate(
                { id: editingScript.id, updates: data },
                {
                    onSuccess: () => { setEditingScript(null); toast({ title: "Script updated" }) },
                    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
                }
            )
        } else {
            addScript.mutate(data, {
                onSuccess: (newScript) => {
                    setDialogOpen(false)
                    setSelectedId(newScript.id)
                    toast({ title: "Script created — now add sections!" })
                },
                onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
            })
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex gap-6 min-h-[500px]">
            {/* Left panel — Script list */}
            <div className="w-72 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Scripts ({scripts.length})
                    </h3>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-3 w-3 mr-1" />
                        New
                    </Button>
                </div>

                {/* Search + filters */}
                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            className="h-8 pl-8 text-xs"
                            placeholder="Search scripts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1.5">
                        <Select value={filterSegment} onValueChange={setFilterSegment}>
                            <SelectTrigger className="h-7 text-[10px] flex-1">
                                <SelectValue placeholder="Segment" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_all">All Segments</SelectItem>
                                {segments.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        <span className="flex items-center gap-1"><CategoryIcon icon={s.icon} className="h-3.5 w-3.5" /> {s.name}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterStage} onValueChange={setFilterStage}>
                            <SelectTrigger className="h-7 text-[10px] flex-1">
                                <SelectValue placeholder="Stage" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_all">All Stages</SelectItem>
                                {stages.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        <span className="flex items-center gap-1"><CategoryIcon icon={s.icon} className="h-3.5 w-3.5" /> {s.name}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Script items */}
                <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">No scripts yet.</p>
                        </div>
                    ) : (
                        filtered.map((script) => (
                            <ScriptListItem
                                key={script.id}
                                script={script}
                                segmentName={script.segmentId ? segmentMap.get(script.segmentId)?.name ?? null : null}
                                stageName={script.stageId ? stageMap.get(script.stageId)?.name ?? null : null}
                                isSelected={effectiveSelected?.id === script.id}
                                onClick={() => setSelectedId(script.id)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right panel — Script editor */}
            <div className="flex-1 border-l pl-6">
                {effectiveSelected ? (
                    <ScriptEditor
                        key={effectiveSelected.id}
                        script={effectiveSelected}
                        segments={segments}
                        stages={stages}
                        sectionTypes={sectionTypes}
                        onEditMeta={() => setEditingScript(effectiveSelected)}
                        onDelete={() => {
                            if (confirm(`Delete "${effectiveSelected.title}"?`)) {
                                removeScript.mutate(effectiveSelected.id, {
                                    onSuccess: () => {
                                        setSelectedId(null)
                                        toast({ title: "Script deleted" })
                                    },
                                    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
                                })
                            }
                        }}
                        onTogglePin={() => editScript.mutate({ id: effectiveSelected.id, updates: { isPinned: !effectiveSelected.isPinned } })}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-sm">Select a script or create a new one</p>
                            <Button size="sm" variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-1" />
                                New Script
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create dialog */}
            <ScriptMetaDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                segments={segments}
                stages={stages}
                onSave={handleSave}
                isPending={addScript.isPending}
            />

            {/* Edit dialog */}
            {editingScript && (
                <ScriptMetaDialog
                    open={!!editingScript}
                    onOpenChange={(v) => { if (!v) setEditingScript(null) }}
                    script={editingScript}
                    segments={segments}
                    stages={stages}
                    onSave={handleSave}
                    isPending={editScript.isPending}
                />
            )}
        </div>
    )
}

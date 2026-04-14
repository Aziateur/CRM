"use client"

import { useState, useMemo, useCallback } from "react"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Trash2,
    GripVertical,
    Loader2,
    Plus,
} from "lucide-react"
import type { FieldDefinition, FieldSection, FieldType } from "@/lib/store"

// ─── DnD Kit ───────────────────────────────────────────────────
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    useDroppable,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// ─── Constants ─────────────────────────────────────────────────

const FIELD_TYPES: { key: FieldType; label: string; icon: string }[] = [
    { key: "text", label: "Text", icon: "Aa" },
    { key: "number", label: "Number", icon: "#" },
    { key: "select", label: "Dropdown", icon: "▾" },
    { key: "multi_select", label: "Multi-select", icon: "▾▾" },
    { key: "date", label: "Date", icon: "📅" },
    { key: "boolean", label: "Yes / No", icon: "✓" },
    { key: "url", label: "URL", icon: "🔗" },
    { key: "email", label: "Email", icon: "@" },
]

const SECTION_META: Record<string, { label: string; description: string }> = {
    core: { label: "Account Info", description: "Essential account/company fields shown near the top of the lead form" },
    detail: { label: "Details", description: "Additional information fields" },
}

/** System fields that cannot be deleted (but CAN be hidden/reordered) */
const SYSTEM_FIELD_KEYS = new Set(["phone", "email", "company"])

const SECTION_KEYS: FieldSection[] = ["core", "detail"]

function slugify(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

// Helper: find which section container a field belongs to
function findContainer(
    coreIds: string[],
    detailIds: string[],
    id: string
): FieldSection | null {
    if (coreIds.includes(id)) return "core"
    if (detailIds.includes(id)) return "detail"
    // Check if the id IS a container
    if (id === "core" || id === "detail") return id as FieldSection
    return null
}

// ─── Main Component ────────────────────────────────────────────

export function LeadFormTab() {
    const {
        fields,
        loading,
        toggleMask,
        deleteField,
        createField,
        reorderFields,
    } = useFieldDefinitions("lead")

    const [showAddField, setShowAddField] = useState(false)
    const [newFieldLabel, setNewFieldLabel] = useState("")
    const [newFieldType, setNewFieldType] = useState<FieldType>("text")
    const [newFieldSection, setNewFieldSection] = useState<FieldSection>("detail")
    const [creating, setCreating] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)

    // Local state for drag operations — maps section → ordered field IDs
    const [containers, setContainers] = useState<Record<FieldSection, string[]> | null>(null)

    // Derive from fields when not actively dragging
    const coreFields = useMemo(
        () => fields.filter((f) => f.section === "core").sort((a, b) => a.position - b.position),
        [fields]
    )
    const detailFields = useMemo(
        () => fields.filter((f) => f.section === "detail").sort((a, b) => a.position - b.position),
        [fields]
    )

    // Current ordered IDs — use drag state if dragging, else derive from fields
    const coreIds = containers?.core ?? coreFields.map((f) => f.id)
    const detailIds = containers?.detail ?? detailFields.map((f) => f.id)

    // Build field map for quick lookup
    const fieldMap = useMemo(() => {
        const m = new Map<string, FieldDefinition>()
        fields.forEach((f) => m.set(f.id, f))
        return m
    }, [fields])

    const activeField = activeId ? fieldMap.get(activeId) ?? null : null

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    // ── Drag handlers ──

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string)
        // Snapshot current order into local state for manipulation during drag
        setContainers({
            core: coreFields.map((f) => f.id),
            detail: detailFields.map((f) => f.id),
        })
    }, [coreFields, detailFields])

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event
        if (!over || !containers) return

        const activeContainer = findContainer(containers.core, containers.detail, active.id as string)
        let overContainer = findContainer(containers.core, containers.detail, over.id as string)

        // If over is a container id itself (empty container), use that
        if (over.id === "core" || over.id === "detail") {
            overContainer = over.id as FieldSection
        }

        if (!activeContainer || !overContainer || activeContainer === overContainer) return

        // Move item from one container to the other
        setContainers((prev) => {
            if (!prev) return prev
            const sourceItems = [...prev[activeContainer]]
            const destItems = [...prev[overContainer!]]

            const activeIndex = sourceItems.indexOf(active.id as string)
            if (activeIndex === -1) return prev

            // Remove from source
            sourceItems.splice(activeIndex, 1)

            // Find where to insert in destination
            const overIndex = destItems.indexOf(over.id as string)
            const insertIndex = overIndex >= 0 ? overIndex : destItems.length

            destItems.splice(insertIndex, 0, active.id as string)

            return {
                ...prev,
                [activeContainer]: sourceItems,
                [overContainer!]: destItems,
            }
        })
    }, [containers])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over || !containers) {
            setContainers(null)
            return
        }

        const activeContainer = findContainer(containers.core, containers.detail, active.id as string)
        let overContainer = findContainer(containers.core, containers.detail, over.id as string)

        if (over.id === "core" || over.id === "detail") {
            overContainer = over.id as FieldSection
        }

        if (!activeContainer || !overContainer) {
            setContainers(null)
            return
        }

        // Final reorder within the same container
        let finalContainers = { ...containers }
        if (activeContainer === overContainer) {
            const items = [...containers[activeContainer]]
            const oldIndex = items.indexOf(active.id as string)
            const overIndex = items.indexOf(over.id as string)
            if (oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex) {
                finalContainers = {
                    ...containers,
                    [activeContainer]: arrayMove(items, oldIndex, overIndex),
                }
            }
        }

        // Build updates for all fields
        const updates: { id: string; position: number; section: FieldSection }[] = []
        for (const section of SECTION_KEYS) {
            const ids = finalContainers[section]
            ids.forEach((id, index) => {
                updates.push({ id, position: index, section })
            })
        }

        setContainers(null)
        reorderFields(updates)
    }, [containers, reorderFields])

    // ── Add field ──

    async function handleAddField() {
        if (!newFieldLabel.trim()) return
        setCreating(true)
        const key = slugify(newFieldLabel)
        await createField({
            fieldKey: key,
            fieldLabel: newFieldLabel.trim(),
            fieldType: newFieldType,
            section: newFieldSection,
        })
        setNewFieldLabel("")
        setNewFieldType("text")
        setNewFieldSection("detail")
        setShowAddField(false)
        setCreating(false)
    }

    // ── Render ──

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">Lead Form Fields</h3>
                        <p className="text-sm text-muted-foreground">
                            Drag to reorder, toggle visibility, or move fields between sections
                        </p>
                    </div>
                    <Button onClick={() => setShowAddField(true)} size="sm">
                        <Plus className="h-4 w-4 mr-1" /> Add Field
                    </Button>
                </div>

                {/* DnD Context wraps BOTH sections */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    {/* Contact Info Section */}
                    <DroppableSection sectionKey="core" fieldIds={coreIds}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{SECTION_META.core.label}</CardTitle>
                                <Badge variant="secondary" className="text-[10px]">{coreIds.length}</Badge>
                            </div>
                            <CardDescription className="text-xs">{SECTION_META.core.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <SortableContext items={coreIds} strategy={verticalListSortingStrategy}>
                                <div className="divide-y min-h-[48px]">
                                    {coreIds.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-6 text-center">
                                            Drag fields here to add them to Account Info
                                        </p>
                                    ) : (
                                        coreIds.map((id) => {
                                            const field = fieldMap.get(id)
                                            if (!field) return null
                                            return (
                                                <SortableFieldRow
                                                    key={id}
                                                    field={field}
                                                    onToggleMask={toggleMask}
                                                    onDelete={deleteField}
                                                />
                                            )
                                        })
                                    )}
                                </div>
                            </SortableContext>
                        </CardContent>
                    </DroppableSection>

                    {/* Details Section */}
                    <DroppableSection sectionKey="detail" fieldIds={detailIds}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{SECTION_META.detail.label}</CardTitle>
                                <Badge variant="secondary" className="text-[10px]">{detailIds.length}</Badge>
                            </div>
                            <CardDescription className="text-xs">{SECTION_META.detail.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <SortableContext items={detailIds} strategy={verticalListSortingStrategy}>
                                <div className="divide-y min-h-[48px]">
                                    {detailIds.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-6 text-center">
                                            Drag fields here to add them to Details
                                        </p>
                                    ) : (
                                        detailIds.map((id) => {
                                            const field = fieldMap.get(id)
                                            if (!field) return null
                                            return (
                                                <SortableFieldRow
                                                    key={id}
                                                    field={field}
                                                    onToggleMask={toggleMask}
                                                    onDelete={deleteField}
                                                />
                                            )
                                        })
                                    )}
                                </div>
                            </SortableContext>
                        </CardContent>
                    </DroppableSection>

                    {/* Drag overlay — shows a ghost of the dragged item */}
                    <DragOverlay>
                        {activeField ? (
                            <FieldRowStatic field={activeField} isDragOverlay />
                        ) : null}
                    </DragOverlay>
                </DndContext>

                {/* Add Field Dialog */}
                <Dialog open={showAddField} onOpenChange={setShowAddField}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Field</DialogTitle>
                            <DialogDescription>Create a new custom field for leads.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Label</Label>
                                <Input
                                    placeholder="e.g. LinkedIn URL"
                                    value={newFieldLabel}
                                    onChange={(e) => setNewFieldLabel(e.target.value)}
                                />
                                {newFieldLabel && (
                                    <p className="text-xs text-muted-foreground">Key: {slugify(newFieldLabel)}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>Type</Label>
                                <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as FieldType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {FIELD_TYPES.map((t) => (
                                            <SelectItem key={t.key} value={t.key}>{t.icon} {t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Section</Label>
                                <Select value={newFieldSection} onValueChange={(v) => setNewFieldSection(v as FieldSection)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="core">Account Info</SelectItem>
                                        <SelectItem value="detail">Details</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddField(false)}>Cancel</Button>
                            <Button onClick={handleAddField} disabled={creating || !newFieldLabel.trim()}>
                                {creating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...</> : "Create Field"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}

// ─── Droppable Section Container ───────────────────────────────

interface DroppableSectionProps {
    sectionKey: string
    fieldIds: string[]
    children: React.ReactNode
}

function DroppableSection({ sectionKey, children }: DroppableSectionProps) {
    const { setNodeRef, isOver } = useDroppable({ id: sectionKey })

    return (
        <Card
            ref={setNodeRef}
            className={`transition-colors ${isOver ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
        >
            {children}
        </Card>
    )
}

// ─── Sortable Field Row ────────────────────────────────────────

interface SortableFieldRowProps {
    field: FieldDefinition
    onToggleMask: (id: string, masked: boolean) => void
    onDelete: (id: string) => Promise<unknown>
}

function SortableFieldRow({ field, onToggleMask, onDelete }: SortableFieldRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <FieldRowContent
                field={field}
                onToggleMask={onToggleMask}
                onDelete={onDelete}
                dragHandleProps={{ ...attributes, ...listeners }}
            />
        </div>
    )
}

// ─── Static Field Row (for DragOverlay) ────────────────────────

function FieldRowStatic({ field, isDragOverlay }: { field: FieldDefinition; isDragOverlay?: boolean }) {
    return (
        <div className={isDragOverlay ? "bg-white border rounded-lg shadow-lg px-1" : ""}>
            <FieldRowContent
                field={field}
                onToggleMask={() => { }}
                onDelete={async () => { }}
                dragHandleProps={{}}
            />
        </div>
    )
}

// ─── Field Row Content (shared between sortable + overlay) ─────

interface FieldRowContentProps {
    field: FieldDefinition
    onToggleMask: (id: string, masked: boolean) => void
    onDelete: (id: string) => Promise<unknown>
    dragHandleProps: Record<string, unknown>
}

function FieldRowContent({ field, onToggleMask, onDelete, dragHandleProps }: FieldRowContentProps) {
    const [acting, setActing] = useState(false)
    const isSystem = SYSTEM_FIELD_KEYS.has(field.fieldKey)

    const runAction = async (fn: () => Promise<unknown>) => {
        setActing(true)
        try { await fn() }
        finally { setActing(false) }
    }

    const sourceBadge = field.source === "native"
        ? <Badge variant="secondary" className="text-[9px] shrink-0 px-1.5">System</Badge>
        : field.isPromoted
            ? <Badge variant="default" className="text-[9px] shrink-0 px-1.5 bg-emerald-600 hover:bg-emerald-600">Column</Badge>
            : <Badge variant="outline" className="text-[9px] shrink-0 px-1.5">Custom</Badge>

    return (
        <div className={`flex items-center gap-3 py-3 px-1 ${field.isMasked ? "opacity-50" : ""}`}>
            {/* Drag handle */}
            <button
                className="cursor-grab active:cursor-grabbing touch-none shrink-0"
                {...dragHandleProps}
            >
                <GripVertical className="h-4 w-4 text-muted-foreground/40" />
            </button>

            {/* Visibility toggle */}
            <Switch
                checked={!field.isMasked}
                onCheckedChange={(checked) => onToggleMask(field.id, !checked)}
                className="shrink-0"
            />

            {/* Label + key */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{field.fieldLabel}</span>
                <span className="text-xs text-muted-foreground">({field.fieldKey})</span>
            </div>

            {/* Source badge */}
            {sourceBadge}

            {/* Type */}
            <span className="text-xs text-muted-foreground w-16 text-right shrink-0 capitalize">{field.fieldType}</span>

            {/* Delete — hidden for system fields */}
            {!isSystem ? (
                <AlertDialog>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Delete Field</p></TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Field — &ldquo;{field.fieldLabel}&rdquo;</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove the field definition. Existing data in leads won&apos;t be deleted but will no longer be accessible through the form.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => runAction(() => onDelete(field.id))} disabled={acting} className="bg-red-600 hover:bg-red-700">
                                {acting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deleting...</> : "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            ) : (
                <div className="w-7 shrink-0" />
            )}
        </div>
    )
}

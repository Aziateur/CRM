"use client"

import { useState, useMemo, useCallback } from "react"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import { useViewSchema } from "@/hooks/use-view-schema"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
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
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
    GripVertical,
    Eye,
    EyeOff,
    Settings2,
    Trash2,
    Plus,
    LayoutTemplate
} from "lucide-react"

import type { FieldDefinition, ViewSchemaData, ViewSection, ViewItem } from "@/lib/store"

// --- Helper Functions ---
function generateId() {
    return Math.random().toString(36).substring(2, 11)
}

function cloneSchema(schema: ViewSchemaData): ViewSchemaData {
    return JSON.parse(JSON.stringify(schema))
}

// --- HARDCODED MANDATORY WIDGETS ---
const AVAILABLE_WIDGETS = [
    { id: "account_reality", label: "Account Reality", description: "Methodology framework questions" },
    { id: "pending_tasks", label: "Pending Tasks", description: "Upcoming calls and tasks list" },
    { id: "contacts_list", label: "Contacts", description: "List of people at this account" },
    { id: "last_attempt", label: "Last Attempt Card", description: "Quick glance at recent activity" },
    { id: "interactions_timeline", label: "Timeline", description: "Full history of interactions" },
    { id: "calls_panel", label: "Calls Panel", description: "Audio logs and transcripts" },
]

export function LayoutBuilder() {
    const { schema: dbSchema, saveSchema, loading: schemaLoading, error: schemaError } = useViewSchema("lead_drawer")
    const { fields: fieldDefinitions, loading: fieldsLoading } = useFieldDefinitions()

    // Local, mutable state for drag and drop
    const [localSchema, setLocalSchema] = useState<ViewSchemaData | null>(null)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeItemType, setActiveItemType] = useState<"field" | "widget" | null>(null)

    // Sync from DB once loaded
    useMemo(() => {
        if (dbSchema && !localSchema) {
            setLocalSchema(cloneSchema(dbSchema.schema))
        }
    }, [dbSchema, localSchema])

    // Setup DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    if (schemaLoading || fieldsLoading) return <div><Skeleton className="h-[600px] w-full" /></div>
    if (schemaError) return <div className="text-red-500">Failed to load layout builder.</div>
    if (!localSchema || !localSchema.columns) return null

    // Helper to find which section an item belongs to
    const findSectionOfItem = (itemId: string): ViewSection | null => {
        for (const col of localSchema.columns!) {
            for (const sec of col.sections) {
                if (sec.items.find(i => i.id === itemId)) return sec
            }
        }
        return null
    }

    // --- DRAG HANDLERS ---
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        setActiveId(active.id as string)

        // Peek at the dragged item to format the overlay
        const sec = findSectionOfItem(active.id as string)
        if (sec) {
            const item = sec.items.find(i => i.id === active.id)
            if (item) setActiveItemType(item.type)
        }
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        if (activeId === overId) return

        setLocalSchema(prev => {
            if (!prev || !prev.columns) return prev

            const next = cloneSchema(prev)

            // Find active piece
            let activeColIdx = -1, activeSecIdx = -1, activeItemIdx = -1
            let activeItem: ViewItem | null = null

            for (let c = 0; c < next.columns!.length; c++) {
                for (let s = 0; s < next.columns![c].sections.length; s++) {
                    const i = next.columns![c].sections[s].items.findIndex(x => x.id === activeId)
                    if (i > -1) {
                        activeColIdx = c; activeSecIdx = s; activeItemIdx = i
                        activeItem = next.columns![c].sections[s].items[i]
                        break
                    }
                }
                if (activeItem) break
            }

            if (!activeItem) return prev

            // Check if hovering over a section itself (empty container)
            let overColIdx = -1, overSecIdx = -1

            for (let c = 0; c < next.columns!.length; c++) {
                const s = next.columns![c].sections.findIndex(x => x.id === overId)
                if (s > -1) {
                    overColIdx = c; overSecIdx = s
                    break
                }
            }

            if (overSecIdx > -1) {
                // Hovering over a section. Move it to the bottom of this section.
                if (activeColIdx === overColIdx && activeSecIdx === overSecIdx) return prev // already here

                // Remove from old
                next.columns![activeColIdx].sections[activeSecIdx].items.splice(activeItemIdx, 1)
                // Add to new
                next.columns![overColIdx].sections[overSecIdx].items.push(activeItem)
                return next
            }

            // Otherwise, hovering over another item
            let overItemIdx = -1
            for (let c = 0; c < next.columns!.length; c++) {
                for (let s = 0; s < next.columns![c].sections.length; s++) {
                    const i = next.columns![c].sections[s].items.findIndex(x => x.id === overId)
                    if (i > -1) {
                        overColIdx = c; overSecIdx = s; overItemIdx = i
                        break
                    }
                }
                if (overItemIdx > -1) break
            }

            if (overItemIdx > -1) {
                // Same section = reorder
                if (activeColIdx === overColIdx && activeSecIdx === overSecIdx) {
                    next.columns![activeColIdx].sections[activeSecIdx].items = arrayMove(
                        next.columns![activeColIdx].sections[activeSecIdx].items,
                        activeItemIdx,
                        overItemIdx
                    )
                } else {
                    // Different section = move across
                    next.columns![activeColIdx].sections[activeSecIdx].items.splice(activeItemIdx, 1)

                    const newIndex = overItemIdx >= 0 ? overItemIdx : next.columns![overColIdx].sections[overSecIdx].items.length
                    next.columns![overColIdx].sections[overSecIdx].items.splice(newIndex, 0, activeItem)
                }
                return next
            }

            return prev
        })
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveId(null)
        setActiveItemType(null)

        // The state is already finalized from handleDragOver, just save it!
        if (localSchema) {
            await saveSchema(localSchema)
        }
    }

    // --- ACTIONS ---
    const handleAddSection = (colIdx: number) => {
        setLocalSchema(prev => {
            if (!prev || !prev.columns) return prev
            const next = cloneSchema(prev)
            next.columns![colIdx].sections.push({
                id: `sec-${generateId()}`,
                name: "New Category",
                items: []
            })
            return next
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">Layout Builder</h2>
                    <p className="text-sm text-muted-foreground">
                        Drag to reorganize columns, categories, and priority fields.
                    </p>
                </div>
                <Button variant="outline" onClick={() => saveSchema(localSchema)}>
                    Force Save Layout
                </Button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {localSchema.columns.map((col, colIdx) => (
                        <div key={col.id} className="space-y-4">
                            <div className="font-semibold text-muted-foreground uppercase text-xs tracking-wider flex items-center justify-between">
                                Column {colIdx + 1}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddSection(colIdx)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            {col.sections.map((section) => (
                                <DroppableSectionContainer key={section.id} section={section} fieldDefs={fieldDefinitions} />
                            ))}
                        </div>
                    ))}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="p-3 bg-secondary border rounded shadow-lg opacity-80 flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                                {activeItemType === "widget" ? "Widget" : "Field"} moving...
                            </span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}

// --- SUB-COMPONENTS ---

function DroppableSectionContainer({ section, fieldDefs }: { section: ViewSection, fieldDefs: FieldDefinition[] }) {
    const { setNodeRef } = useDroppable({ id: section.id })

    const itemIds = useMemo(() => section.items.map(i => i.id), [section.items])

    return (
        <Card ref={setNodeRef} className="bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <Input
                    defaultValue={section.name}
                    className="h-7 w-[200px] text-sm font-semibold border-none bg-transparent hover:bg-background focus:bg-background px-1 -ml-1"
                />
            </CardHeader>
            <CardContent className="p-2 space-y-1 min-h-[50px]">
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    {section.items.map((item) => (
                        <SortableItemRow key={item.id} item={item} fieldDefs={fieldDefs} />
                    ))}
                    {section.items.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded bg-muted/50">
                            Empty Category. Drag fields here.
                        </div>
                    )}
                </SortableContext>
            </CardContent>
        </Card>
    )
}

function SortableItemRow({ item, fieldDefs }: { item: ViewItem, fieldDefs: FieldDefinition[] }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    let title = "Unknown"
    let isWidget = item.type === "widget"

    if (isWidget && item.widgetId) {
        title = AVAILABLE_WIDGETS.find(w => w.id === item.widgetId)?.label || item.widgetId
    } else if (item.fieldKey) {
        title = fieldDefs.find(f => f.fieldKey === item.fieldKey)?.fieldLabel || item.fieldKey
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-colors group bg-background"
        >
            <button
                className="cursor-move text-muted-foreground hover:text-foreground touch-none p-1 rounded hover:bg-muted"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-4 w-4" />
            </button>

            <div className="flex-1 flex items-center justify-between overflow-hidden">
                <span className="text-sm font-medium truncate">{title}</span>
                {isWidget && (
                    <Badge variant="secondary" className="text-[10px] uppercase opacity-70">
                        Widget
                    </Badge>
                )}
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                </Button>
            </div>
        </div>
    )
}

import fs from "fs"

const file = "/Users/alielhallaoui/Desktop/Projects & Tech/CRM/components/layout-builder.tsx"
let content = fs.readFileSync(file, "utf8")

// 1. Update State type
content = content.replace(
    `const [activeItemType, setActiveItemType] = useState<"field" | "widget" | null>(null)`,
    `const [activeItemType, setActiveItemType] = useState<"field" | "widget" | "section" | null>(null)`
)

// 2. Update handleDragStart
content = content.replace(
    `    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        setActiveId(active.id as string)

        // Peek at the dragged item to format the overlay
        const sec = findSectionOfItem(active.id as string)
        if (sec) {
            const item = sec.items.find(i => i.id === active.id)
            if (item) setActiveItemType(item.type)
        }
    }`,
    `    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        setActiveId(active.id as string)

        const activeData = active.data.current
        if (activeData?.type === "section") {
            setActiveItemType("section")
            return
        }

        // Peek at the dragged item to format the overlay
        const sec = findSectionOfItem(active.id as string)
        if (sec) {
            const item = sec.items.find(i => i.id === active.id)
            if (item) setActiveItemType(item.type)
        } else if (active.id.toString().startsWith("avail-widget")) {
            setActiveItemType("widget")
        } else {
            setActiveItemType("field")
        }
    }`
)

// 3. Update handleDragOver
content = content.replace(
    `    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        if (activeId === overId) return

        setLocalSchema(prev => {`,
    `    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        if (activeId === overId) return

        const activeData = active.data.current
        const overData = over.data.current

        // SECTION REORDERING LOGIC
        if (activeData?.type === "section") {
            if (overData?.type === "section") {
                setLocalSchema(prev => {
                    if (!prev || !prev.columns) return prev
                    const next = cloneSchema(prev)
                    const activeColIdx = activeData.colIdx
                    const activeSecIdx = activeData.secIdx
                    const overColIdx = overData.colIdx
                    const overSecIdx = overData.secIdx

                    // Assuming we only reorder within the same column for now
                    if (activeColIdx === overColIdx && activeColIdx !== undefined) {
                         next.columns![activeColIdx].sections = arrayMove(
                             next.columns![activeColIdx].sections,
                             activeSecIdx,
                             overSecIdx
                         )
                         return next
                    }
                    return prev
                })
            }
            return
        }

        setLocalSchema(prev => {`
)

// 4. Update Layout Columns Map
content = content.replace(
    /                                \{col\.sections\.map\(\(section, secIdx\) => \([\s\S]*?                                \)\)\}/,
    `                                <SortableContext items={col.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-4 min-h-[50px]">
                                        {col.sections.map((section, secIdx) => (
                                            <DroppableSectionContainer 
                                                key={section.id} 
                                                section={section} 
                                                fieldDefs={fieldDefinitions} 
                                                colIdx={colIdx}
                                                secIdx={secIdx}
                                                onRemoveSection={handleRemoveSection}
                                                onRenameSection={handleRenameSection}
                                                onRemoveItem={handleRemoveItem}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>`
)

// 5. Update DroppableSectionContainer
content = content.replace(
    `function DroppableSectionContainer({ 
    section, 
    fieldDefs, 
    colIdx, 
    secIdx, 
    onRemoveSection, 
    onRenameSection,
    onRemoveItem 
}: { 
    section: ViewSection, 
    fieldDefs: FieldDefinition[], 
    colIdx: number, 
    secIdx: number,
    onRemoveSection: (c: number, s: number) => void,
    onRenameSection: (c: number, s: number, name: string) => void,
    onRemoveItem: (id: string) => void
}) {
    const { setNodeRef } = useDroppable({ id: section.id })

    const itemIds = useMemo(() => section.items.map(i => i.id), [section.items])

    return (
        <Card ref={setNodeRef} className="bg-card">
            <CardHeader className="py-2 px-3 border-b bg-muted/20 flex flex-row items-center justify-between group">
                <Input
                    value={section.name}`,
    `function DroppableSectionContainer({ 
    section, 
    fieldDefs, 
    colIdx, 
    secIdx, 
    onRemoveSection, 
    onRenameSection,
    onRemoveItem 
}: { 
    section: ViewSection, 
    fieldDefs: FieldDefinition[], 
    colIdx: number, 
    secIdx: number,
    onRemoveSection: (c: number, s: number) => void,
    onRenameSection: (c: number, s: number, name: string) => void,
    onRemoveItem: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: section.id,
        data: { type: "section", colIdx, secIdx }
    })

    const itemIds = useMemo(() => section.items.map(i => i.id), [section.items])

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <Card ref={setNodeRef} style={style} className="bg-card">
            <CardHeader className="py-2 px-3 border-b bg-muted/20 flex flex-row items-center justify-between group">
                <div className="flex flex-1 items-center gap-2">
                    <button
                        className="cursor-move text-muted-foreground hover:text-foreground touch-none p-1 rounded hover:bg-muted"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                    <Input
                        value={section.name}`
)

content = content.replace(
    `className="h-7 w-[200px] text-sm font-semibold border-none bg-transparent hover:bg-background focus:bg-background px-1 -ml-1 transition-all"`,
    `className="h-7 w-[200px] text-sm font-semibold border-none bg-transparent hover:bg-background focus:bg-background px-1 -ml-1 transition-all"`
) // (Wait, I used the same string here. Let's fix the CardHeader Input layout below manually)

content = content.replace(
    `                    value={section.name}
                    onChange={(e) => onRenameSection(colIdx, secIdx, e.target.value)}
                    className="h-7 w-[200px] text-sm font-semibold border-none bg-transparent hover:bg-background focus:bg-background px-1 -ml-1 transition-all"
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemoveSection(colIdx, secIdx)}>`,
    `                    value={section.name}
                    onChange={(e) => onRenameSection(colIdx, secIdx, e.target.value)}
                    className="h-7 w-[200px] text-sm font-semibold border-none bg-transparent hover:bg-background focus:bg-background px-1 -ml-1 transition-all"
                />
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemoveSection(colIdx, secIdx)}>`
)

// 6. Update DragOverlay display
content = content.replace(
    `                                {activeItemType === "widget" ? "Widget" : "Field"} moving...`,
    `                                {activeItemType} moving...`
)
content = content.replace(
    `<span className="font-medium text-sm">`,
    `<span className="font-medium text-sm capitalize">`
)

fs.writeFileSync(file, content)
console.log("Updated components/layout-builder.tsx")

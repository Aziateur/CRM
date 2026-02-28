import fs from "fs"

const file = "/Users/alielhallaoui/Desktop/Projects & Tech/CRM/components/layout-builder.tsx"
let content = fs.readFileSync(file, "utf8")

// 1. Add DroppableColumn component at the bottom
const droppableColumnCode = `function DroppableColumn({ col, colIdx, children }: { col: import("@/lib/store").ViewColumn, colIdx: number, children: React.ReactNode }) {
    const { setNodeRef } = useDroppable({
        id: \`col-\${col.id}\`,
        data: { type: "column", colIdx }
    })
    return (
        <div ref={setNodeRef} className="space-y-4 min-h-[100px] pb-8 rounded-lg border border-transparent transition-colors data-[is-over=true]:border-dashed data-[is-over=true]:border-primary/50 data-[is-over=true]:bg-primary/5">
            {children}
        </div>
    )
}

`
if (!content.includes("DroppableColumn(")) {
    content = content.replace("// --- SUB-COMPONENTS ---", "// --- SUB-COMPONENTS ---\n\n" + droppableColumnCode)
}

// 2. Add handleAddColumn and handleRemoveColumn
const columnActions = `    const handleAddColumn = () => {
        setLocalSchema(prev => {
            if (!prev || !prev.columns) return prev
            const next = cloneSchema(prev)
            next.columns.push({
                id: \`col-\${generateId()}\`,
                sections: []
            })
            return next
        })
    }

    const handleRemoveColumn = (colIdx: number) => {
        setLocalSchema(prev => {
            if (!prev || !prev.columns) return prev
            const next = cloneSchema(prev)
            next.columns.splice(colIdx, 1)
            return next
        })
    }

    const getGridColsClass = (count: number) => {
        switch (count) {
            case 1: return "lg:grid-cols-1"
            case 2: return "lg:grid-cols-2"
            case 3: return "lg:grid-cols-3"
            case 4: return "lg:grid-cols-4"
            default: return "lg:grid-cols-4"
        }
    }`

if (!content.includes("handleAddColumn")) {
    content = content.replace("    const handleAddSection = (", columnActions + "\n\n    const handleAddSection = (")
}

// 3. Update Cross Column Drag Over
content = content.replace(
    `        // SECTION REORDERING LOGIC
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
        }`,
    `        // SECTION REORDERING LOGIC
        if (activeData?.type === "section") {
            if (overData?.type === "section") {
                setLocalSchema(prev => {
                    if (!prev || !prev.columns) return prev
                    const next = cloneSchema(prev)
                    const activeColIdx = activeData.colIdx
                    const activeSecIdx = activeData.secIdx
                    const overColIdx = overData.colIdx
                    const overSecIdx = overData.secIdx

                    if (activeColIdx !== undefined && overColIdx !== undefined) {
                        if (activeColIdx === overColIdx) {
                            next.columns![activeColIdx].sections = arrayMove(
                                next.columns![activeColIdx].sections,
                                activeSecIdx,
                                overSecIdx
                            )
                        } else {
                            const sectionToMove = next.columns![activeColIdx].sections[activeSecIdx]
                            next.columns![activeColIdx].sections.splice(activeSecIdx, 1)
                            next.columns![overColIdx].sections.splice(overSecIdx, 0, sectionToMove)
                        }
                        return next
                    }
                    return prev
                })
            } else if (overData?.type === "column") {
                // Dropping section into an empty column
                setLocalSchema(prev => {
                    if (!prev || !prev.columns) return prev
                    const next = cloneSchema(prev)
                    const activeColIdx = activeData.colIdx
                    const activeSecIdx = activeData.secIdx
                    const overColIdx = overData.colIdx

                    if (activeColIdx !== undefined && overColIdx !== undefined && activeColIdx !== overColIdx) {
                        const sectionToMove = next.columns![activeColIdx].sections[activeSecIdx]
                        next.columns![activeColIdx].sections.splice(activeSecIdx, 1)
                        next.columns![overColIdx].sections.push(sectionToMove) // add to end of empty column
                        return next
                    }
                    return prev
                })
            }
            return
        }`
)

// 4. Update the layout render to use DroppableColumn and dynamically sized grid, plus Add Column UI
const originalGridText = `                    {/* LAYOUT COLS */}
                    <div className="col-span-1 lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {localSchema.columns.map((col, colIdx) => (
                            <div key={col.id} className="space-y-4">
                                <div className="font-semibold text-muted-foreground uppercase text-xs tracking-wider flex items-center justify-between">
                                    Column {colIdx + 1}
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddSection(colIdx)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                <SortableContext items={col.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
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
                                </SortableContext>
                            </div>
                        ))}
                    </div>`

const replacementGridText = `                    {/* LAYOUT COLS */}
                    <div className={\`col-span-1 lg:col-span-3 grid grid-cols-1 \${getGridColsClass(localSchema.columns.length + (localSchema.columns.length < 4 ? 1 : 0))} gap-6\`}>
                        {localSchema.columns.map((col, colIdx) => (
                            <div key={col.id} className="space-y-4">
                                <div className="font-semibold text-muted-foreground uppercase text-xs tracking-wider flex items-center justify-between group/colheader">
                                    <span>Column {colIdx + 1}</span>
                                    <div className="flex gap-1">
                                        {col.sections.length === 0 && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/colheader:opacity-100 transition-opacity" onClick={() => handleRemoveColumn(colIdx)}>
                                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddSection(colIdx)}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <DroppableColumn col={col} colIdx={colIdx}>
                                    <SortableContext items={col.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
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
                                    </SortableContext>
                                </DroppableColumn>
                            </div>
                        ))}
                        
                        {localSchema.columns.length < 4 && (
                            <div 
                                className="border-2 border-dashed border-muted bg-muted/20 hover:bg-muted/50 transition-colors rounded-lg flex flex-col items-center justify-center min-h-[150px] cursor-pointer text-muted-foreground hover:text-foreground"
                                onClick={handleAddColumn}
                            >
                                <Plus className="h-8 w-8 mb-2 opacity-50" />
                                <span className="text-sm font-medium">Add Column</span>
                            </div>
                        )}
                    </div>`

content = content.replace(originalGridText, replacementGridText)

fs.writeFileSync(file, content)
console.log("Updated components/layout-builder.tsx for columns")

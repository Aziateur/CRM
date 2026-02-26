"use client"

import { useState } from "react"
import { useCategories, type Category } from "@/hooks/use-categories"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react"
import { CategoryIcon, IconPicker } from "@/components/category-icon"

// ─── Props ───

interface CategoryManagerProps {
    categoryType: string
    title?: string
    description?: string
    showColor?: boolean
    showDescription?: boolean
    compact?: boolean
    /** Lucide icon preset key for the icon picker (e.g. 'friction_type', 'root_cause_type') */
    iconPreset?: string
}

// ─── Add/Edit Dialog ───

function CategoryDialog({
    open,
    onOpenChange,
    category,
    onSave,
    isPending,
    showColor,
    showDescription,
    iconPreset,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    category?: Category | null
    onSave: (data: { name: string; icon: string; color?: string; description?: string }) => void
    isPending: boolean
    showColor: boolean
    showDescription: boolean
    iconPreset?: string
}) {
    const [name, setName] = useState(category?.name ?? "")
    const [icon, setIcon] = useState(category?.icon ?? "zap")
    const [color, setColor] = useState(category?.color ?? "#6b7280")
    const [description, setDescription] = useState(category?.description ?? "")

    const handleSubmit = () => {
        if (!name.trim()) return
        onSave({
            name: name.trim(),
            icon: icon || "zap",
            color: showColor ? color : undefined,
            description: showDescription && description.trim() ? description.trim() : undefined,
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                                className="h-9 mt-1"
                                placeholder="Category name..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }}
                                autoFocus
                            />
                        </div>
                        {showColor && (
                            <div className="w-16">
                                <Label className="text-xs">Color</Label>
                                <Input
                                    type="color"
                                    className="h-9 mt-1 p-1 cursor-pointer"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    <div>
                        <Label className="text-xs mb-1.5 block">Icon</Label>
                        <IconPicker value={icon} onChange={setIcon} presetKey={iconPreset} />
                    </div>
                    {showDescription && (
                        <div>
                            <Label className="text-xs">Description</Label>
                            <Input
                                className="h-9 mt-1"
                                placeholder="Optional description..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
                        {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        {category ? "Save" : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Category Row ───

function CategoryRow({
    category,
    index,
    total,
    onEdit,
    onToggleActive,
    onMove,
    onDelete,
    compact,
    showColor,
}: {
    category: Category
    index: number
    total: number
    onEdit: (cat: Category) => void
    onToggleActive: (id: string, active: boolean) => void
    onMove: (index: number, direction: -1 | 1) => void
    onDelete: (id: string) => void
    compact: boolean
    showColor: boolean
}) {
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-md border group transition-colors ${!category.isActive ? "opacity-50 bg-muted/30" : "hover:bg-muted/50"}`}>
            {/* Reorder buttons */}
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    className="text-muted-foreground hover:text-foreground text-[10px] leading-none disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => onMove(index, -1)}
                >▲</button>
                <button
                    className="text-muted-foreground hover:text-foreground text-[10px] leading-none disabled:opacity-30"
                    disabled={index === total - 1}
                    onClick={() => onMove(index, 1)}
                >▼</button>
            </div>

            {/* Color dot + icon + name */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {showColor && category.color && (
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                )}
                <span className="shrink-0"><CategoryIcon icon={category.icon} className="h-4 w-4" color={category.color} /></span>
                <span className="text-sm font-medium truncate">{category.name}</span>
                {!category.isActive && (
                    <Badge variant="secondary" className="text-[10px] h-5 shrink-0">Archived</Badge>
                )}
                {category.description && !compact && (
                    <span className="text-xs text-muted-foreground truncate">{category.description}</span>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Switch
                    checked={category.isActive}
                    onCheckedChange={(v) => onToggleActive(category.id, v)}
                    className="scale-75"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(category)}>
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(category.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
            </div>
        </div>
    )
}

// ─── Main Component ───

export function CategoryManager({
    categoryType,
    title,
    description,
    showColor = true,
    showDescription = false,
    compact = false,
    iconPreset,
}: CategoryManagerProps) {
    const { categories, isLoading, addCategory, editCategory, removeCategory } = useCategories(categoryType)
    const { toast } = useToast()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

    const handleAdd = (data: { name: string; icon: string; color?: string; description?: string }) => {
        addCategory.mutate(data, {
            onSuccess: () => {
                setDialogOpen(false)
                toast({ title: "Created", description: `${data.name} added` })
            },
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        })
    }

    const handleEdit = (data: { name: string; icon: string; color?: string; description?: string }) => {
        if (!editingCategory) return
        editCategory.mutate(
            { id: editingCategory.id, updates: data },
            {
                onSuccess: () => {
                    setEditingCategory(null)
                    toast({ title: "Updated", description: `${data.name} saved` })
                },
                onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
            }
        )
    }

    const handleToggleActive = (id: string, isActive: boolean) => {
        editCategory.mutate({ id, updates: { isActive } })
    }

    const handleMove = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= categories.length) return
        const a = categories[index]
        const b = categories[newIndex]
        editCategory.mutate({ id: a.id, updates: { sortOrder: b.sortOrder } })
        editCategory.mutate({ id: b.id, updates: { sortOrder: a.sortOrder } })
    }

    const handleDelete = (id: string) => {
        const cat = categories.find((c) => c.id === id)
        if (!cat) return
        setDeleteTarget(cat)
    }

    const confirmDelete = () => {
        if (!deleteTarget) return
        removeCategory.mutate(deleteTarget.id, {
            onSuccess: () => {
                toast({ title: "Deleted", description: `${deleteTarget.name} removed` })
                setDeleteTarget(null)
            },
            onError: (e) => {
                toast({ title: "Error", description: e.message, variant: "destructive" })
                setDeleteTarget(null)
            },
        })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    {title && <h3 className="text-sm font-semibold">{title}</h3>}
                    {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-3 w-3" />
                    Add
                </Button>
            </div>

            {/* List */}
            <div className="space-y-1">
                {categories.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-4 text-center">
                        No categories yet. Click Add to create one.
                    </p>
                )}
                {categories.map((cat, i) => (
                    <CategoryRow
                        key={cat.id}
                        category={cat}
                        index={i}
                        total={categories.length}
                        onEdit={(c) => setEditingCategory(c)}
                        onToggleActive={handleToggleActive}
                        onMove={handleMove}
                        onDelete={handleDelete}
                        compact={compact}
                        showColor={showColor}
                    />
                ))}
            </div>

            {/* Add dialog */}
            <CategoryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSave={handleAdd}
                isPending={addCategory.isPending}
                showColor={showColor}
                showDescription={showDescription}
                iconPreset={iconPreset}
            />

            {/* Edit dialog */}
            {editingCategory && (
                <CategoryDialog
                    open={!!editingCategory}
                    onOpenChange={(v) => { if (!v) setEditingCategory(null) }}
                    category={editingCategory}
                    onSave={handleEdit}
                    isPending={editCategory.isPending}
                    showColor={showColor}
                    showDescription={showDescription}
                    iconPreset={iconPreset}
                />
            )}

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this category. Consider archiving (toggling off) instead if you want to keep the data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

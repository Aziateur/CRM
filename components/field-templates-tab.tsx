"use client"

import { useState } from "react"
import { useFieldTemplates } from "@/hooks/use-field-templates"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import {
    ClipboardList,
    Plus,
    Pencil,
    Trash2,
    GripVertical,
    X,
    Search,
    Users,
    FileText,
} from "lucide-react"
import type { FieldTemplate, FieldDefinition } from "@/lib/store"

// ============================================================================
// ICON PICKER
// ============================================================================

const TEMPLATE_ICONS: { key: string; icon: React.ReactNode; label: string }[] = [
    { key: "clipboard-list", icon: <ClipboardList className="h-4 w-4" />, label: "Clipboard" },
    { key: "search", icon: <Search className="h-4 w-4" />, label: "Search" },
    { key: "users", icon: <Users className="h-4 w-4" />, label: "People" },
    { key: "file-text", icon: <FileText className="h-4 w-4" />, label: "Document" },
]

function getTemplateIcon(iconKey: string) {
    const found = TEMPLATE_ICONS.find((i) => i.key === iconKey)
    return found?.icon || <ClipboardList className="h-4 w-4" />
}

// ============================================================================
// FIELD TYPE COLOR BADGES
// ============================================================================

const fieldTypeColors: Record<string, string> = {
    text: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    number: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    select: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    multi_select: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    boolean: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    url: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    email: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    date: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
}

// ============================================================================
// TEMPLATE BUILDER DIALOG
// ============================================================================

interface TemplateBuilderProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    template: Partial<FieldTemplate> | null
    allFields: FieldDefinition[]
    onSave: (data: { name: string; description?: string; icon: string; fieldKeys: string[] }) => void
}

function TemplateBuilder({ open, onOpenChange, template, allFields, onSave }: TemplateBuilderProps) {
    const [name, setName] = useState(template?.name || "")
    const [description, setDescription] = useState(template?.description || "")
    const [icon, setIcon] = useState(template?.icon || "clipboard-list")
    const [selectedKeys, setSelectedKeys] = useState<string[]>(template?.fieldKeys || [])
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

    // Reset state when template changes
    useState(() => {
        setName(template?.name || "")
        setDescription(template?.description || "")
        setIcon(template?.icon || "clipboard-list")
        setSelectedKeys(template?.fieldKeys || [])
    })

    const availableFields = allFields.filter((f) => !selectedKeys.includes(f.fieldKey))
    const selectedFields = selectedKeys
        .map((key) => allFields.find((f) => f.fieldKey === key))
        .filter(Boolean) as FieldDefinition[]

    const handleAddField = (fieldKey: string) => {
        setSelectedKeys((prev) => [...prev, fieldKey])
    }

    const handleRemoveField = (fieldKey: string) => {
        setSelectedKeys((prev) => prev.filter((k) => k !== fieldKey))
    }

    const handleDragStart = (idx: number) => {
        setDraggedIdx(idx)
    }

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault()
        if (draggedIdx === null || draggedIdx === idx) return
        const newKeys = [...selectedKeys]
        const [dragged] = newKeys.splice(draggedIdx, 1)
        newKeys.splice(idx, 0, dragged)
        setSelectedKeys(newKeys)
        setDraggedIdx(idx)
    }

    const handleDragEnd = () => {
        setDraggedIdx(null)
    }

    const handleSave = () => {
        if (!name.trim()) return
        onSave({
            name: name.trim(),
            description: description.trim() || undefined,
            icon,
            fieldKeys: selectedKeys,
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>{template?.id ? "Edit Template" : "New Template"}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    {/* Name & Description */}
                    <div className="space-y-3">
                        <div>
                            <Label>Template Name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Marketing Audit"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Description (optional)</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What this prep work covers..."
                                className="mt-1 h-16 resize-none"
                            />
                        </div>
                    </div>

                    {/* Icon Picker */}
                    <div>
                        <Label className="text-xs text-muted-foreground">Icon</Label>
                        <div className="flex gap-2 mt-1">
                            {TEMPLATE_ICONS.map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => setIcon(item.key)}
                                    className={`p-2 rounded-md border transition-colors ${icon === item.key
                                            ? "border-primary bg-primary/10"
                                            : "border-transparent hover:bg-muted"
                                        }`}
                                    title={item.label}
                                >
                                    {item.icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Two-panel field picker */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Available Fields */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Available Fields</Label>
                            <div className="mt-1 border rounded-md p-2 space-y-1 max-h-[250px] overflow-y-auto">
                                {availableFields.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-4">All fields assigned</p>
                                )}
                                {availableFields.map((field) => (
                                    <button
                                        key={field.fieldKey}
                                        onClick={() => handleAddField(field.fieldKey)}
                                        className="w-full flex items-center justify-between p-2 rounded text-sm hover:bg-muted transition-colors text-left"
                                    >
                                        <span className="truncate">{field.fieldLabel}</span>
                                        <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${fieldTypeColors[field.fieldType] || ""}`}>
                                            {field.fieldType}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Selected Fields (draggable) */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Template Fields ({selectedKeys.length})</Label>
                            <div className="mt-1 border rounded-md p-2 space-y-1 max-h-[250px] overflow-y-auto">
                                {selectedFields.length === 0 && (
                                    <div className="border-2 border-dashed rounded-md p-4 text-center">
                                        <p className="text-xs text-muted-foreground">Click fields on the left to add them</p>
                                    </div>
                                )}
                                {selectedFields.map((field, idx) => (
                                    <div
                                        key={field.fieldKey}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={(e) => handleDragOver(e, idx)}
                                        onDragEnd={handleDragEnd}
                                        className={`flex items-center gap-2 p-2 rounded text-sm bg-background border transition-colors ${draggedIdx === idx ? "opacity-50" : ""
                                            }`}
                                    >
                                        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab shrink-0" />
                                        <span className="truncate flex-1">{field.fieldLabel}</span>
                                        <Badge variant="outline" className={`text-[10px] shrink-0 ${fieldTypeColors[field.fieldType] || ""}`}>
                                            {field.fieldType}
                                        </Badge>
                                        <button
                                            onClick={() => handleRemoveField(field.fieldKey)}
                                            className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!name.trim()}>
                        {template?.id ? "Save Changes" : "Create Template"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

function TemplateCard({
    template,
    fields,
    onEdit,
    onDelete,
}: {
    template: FieldTemplate
    fields: FieldDefinition[]
    onEdit: () => void
    onDelete: () => void
}) {
    const templateFields = template.fieldKeys
        .map((key) => fields.find((f) => f.fieldKey === key))
        .filter(Boolean) as FieldDefinition[]

    // Group field types for summary
    const typeCounts: Record<string, number> = {}
    templateFields.forEach((f) => {
        typeCounts[f.fieldType] = (typeCounts[f.fieldType] || 0) + 1
    })

    return (
        <Card className="group">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-muted">
                            {getTemplateIcon(template.icon)}
                        </div>
                        <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            {template.description && (
                                <p className="text-sm text-muted-foreground mt-0.5">{template.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={onDelete}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{template.fieldKeys.length} fields</Badge>
                    {Object.entries(typeCounts).map(([type, count]) => (
                        <Badge key={type} variant="outline" className={`text-[10px] ${fieldTypeColors[type] || ""}`}>
                            {count} {type}
                        </Badge>
                    ))}
                </div>
                {templateFields.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {templateFields.map((f) => (
                            <span key={f.fieldKey} className="text-xs text-muted-foreground">
                                {f.fieldLabel}
                                {templateFields.indexOf(f) < templateFields.length - 1 && " · "}
                            </span>
                        ))}
                    </div>
                )}
                {template.fieldKeys.some((key) => !fields.find((f) => f.fieldKey === key)) && (
                    <p className="text-xs text-amber-600 mt-2">⚠ Some fields have been removed</p>
                )}
            </CardContent>
        </Card>
    )
}

// ============================================================================
// MAIN TAB
// ============================================================================

export function FieldTemplatesTab() {
    const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useFieldTemplates()
    const { fields } = useFieldDefinitions()
    const { toast } = useToast()
    const [builderOpen, setBuilderOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<FieldTemplate | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<FieldTemplate | null>(null)

    const handleCreate = () => {
        setEditingTemplate(null)
        setBuilderOpen(true)
    }

    const handleEdit = (template: FieldTemplate) => {
        setEditingTemplate(template)
        setBuilderOpen(true)
    }

    const handleSave = async (data: { name: string; description?: string; icon: string; fieldKeys: string[] }) => {
        if (editingTemplate) {
            const ok = await updateTemplate(editingTemplate.id, data)
            if (ok) toast({ title: "Template updated" })
        } else {
            const result = await createTemplate(data)
            if (result) toast({ title: "Template created" })
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const ok = await deleteTemplate(deleteTarget.id)
        if (ok) toast({ title: "Template deleted" })
        setDeleteTarget(null)
    }

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Prep Templates</h3>
                    <p className="text-sm text-muted-foreground">
                        Group custom fields into named audit cards for lead research
                    </p>
                </div>
                <Button onClick={handleCreate} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    New Template
                </Button>
            </div>

            {templates.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <h4 className="font-medium mb-1">No templates yet</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            Create a template to group fields into a prep checklist — like &quot;Marketing Audit&quot; or &quot;Competitor Intel&quot;
                        </p>
                        <Button onClick={handleCreate} variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Create your first template
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {templates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            fields={fields}
                            onEdit={() => handleEdit(template)}
                            onDelete={() => setDeleteTarget(template)}
                        />
                    ))}
                </div>
            )}

            {/* Builder Dialog */}
            <TemplateBuilder
                open={builderOpen}
                onOpenChange={setBuilderOpen}
                template={editingTemplate}
                allFields={fields}
                onSave={handleSave}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This removes the template grouping only. Field definitions and lead data are not affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

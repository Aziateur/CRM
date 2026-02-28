"use client"

import { useState } from "react"
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/alert-dialog"
import {
    Eye,
    EyeOff,
    MoreVertical,
    ArrowUpCircle,
    ArrowDownCircle,
    Trash2,
    GripVertical,
    Loader2,
    Plus,
} from "lucide-react"
import type { FieldDefinition, FieldSection, FieldType } from "@/lib/store"

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
    core: { label: "Contact Info", description: "Essential contact fields shown at the top of the lead form" },
    detail: { label: "Details", description: "Additional information fields shown below contact info" },
}

function slugify(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

export function LeadFormTab() {
    const {
        fields,
        loading,
        toggleMask,
        promoteField,
        demoteField,
        deleteField,
        updateField,
        createField,
    } = useFieldDefinitions("lead")

    const [actionTarget, setActionTarget] = useState<{ field: FieldDefinition; action: "promote" | "demote" | "delete" } | null>(null)
    const [acting, setActing] = useState(false)
    const [showAddField, setShowAddField] = useState(false)
    const [newFieldLabel, setNewFieldLabel] = useState("")
    const [newFieldType, setNewFieldType] = useState<FieldType>("text")
    const [newFieldSection, setNewFieldSection] = useState<FieldSection>("detail")
    const [addingField, setAddingField] = useState(false)

    const handleAction = async () => {
        if (!actionTarget) return
        setActing(true)
        try {
            if (actionTarget.action === "promote") {
                await promoteField(actionTarget.field.id)
            } else if (actionTarget.action === "demote") {
                await demoteField(actionTarget.field.id)
            } else if (actionTarget.action === "delete") {
                await deleteField(actionTarget.field.id)
            }
        } finally {
            setActing(false)
            setActionTarget(null)
        }
    }

    const handleAddField = async () => {
        if (!newFieldLabel.trim()) return
        setAddingField(true)
        const result = await createField({
            fieldKey: slugify(newFieldLabel),
            fieldLabel: newFieldLabel.trim(),
            fieldType: newFieldType,
            section: newFieldSection,
        })
        if (result) {
            setShowAddField(false)
            setNewFieldLabel("")
            setNewFieldType("text")
            setNewFieldSection("detail")
        }
        setAddingField(false)
    }

    const actionLabels = {
        promote: { title: "Promote to Column", description: "This will create a real database column. Data migrates from JSONB. The field becomes non-maskable (always visible).", button: "Promote", variant: "default" as const },
        demote: { title: "Demote to Custom Field", description: "This will move this field back to JSONB storage. The database column is kept as a ghost column for safety. The field becomes maskable.", button: "Demote", variant: "destructive" as const },
        delete: { title: "Delete Field", description: "This will remove the field definition. Existing data in leads won't be deleted but will no longer be accessible.", button: "Delete", variant: "destructive" as const },
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const sections: FieldSection[] = ["core", "detail"]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Lead Form Layout</h2>
                    <p className="text-sm text-muted-foreground">
                        Control which fields appear on the lead form, their section, and their status.
                    </p>
                </div>
                <Button onClick={() => setShowAddField(true)} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Field
                </Button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[9px] px-1.5">Native</Badge>
                    <span className="text-muted-foreground">Built-in, always visible</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Badge variant="default" className="text-[9px] px-1.5 bg-emerald-600">Column</Badge>
                    <span className="text-muted-foreground">Promoted to DB column</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] px-1.5">Custom</Badge>
                    <span className="text-muted-foreground">JSONB, maskable</span>
                </div>
            </div>

            {/* Section cards */}
            {sections.map((section) => {
                const sectionFields = fields.filter((f) => f.section === section).sort((a, b) => a.position - b.position)
                const meta = SECTION_META[section]
                const hiddenCount = sectionFields.filter((f) => f.isMasked).length

                return (
                    <Card key={section}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">{meta?.label ?? section}</CardTitle>
                                    <CardDescription>{meta?.description}</CardDescription>
                                </div>
                                {hiddenCount > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                        <EyeOff className="h-3 w-3 mr-1" />{hiddenCount} hidden
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {sectionFields.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">No fields in this section</p>
                            ) : (
                                <div className="divide-y">
                                    {sectionFields.map((field) => (
                                        <FieldRow
                                            key={field.id}
                                            field={field}
                                            onToggleMask={(masked) => toggleMask(field.id, masked)}
                                            onSectionChange={(s) => updateField(field.id, { section: s })}
                                            onAction={(action) => setActionTarget({ field, action })}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}

            {/* Add Field Dialog */}
            <Dialog open={showAddField} onOpenChange={setShowAddField}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Field</DialogTitle>
                        <DialogDescription>
                            Create a new custom field for your leads.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Field Name</Label>
                            <Input
                                placeholder="e.g. Revenue, Industry, Priority..."
                                value={newFieldLabel}
                                onChange={(e) => setNewFieldLabel(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleAddField() }}
                            />
                            {newFieldLabel.trim() && (
                                <p className="text-xs text-muted-foreground">
                                    Key: <code className="bg-muted px-1 rounded">{slugify(newFieldLabel)}</code>
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as FieldType)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FIELD_TYPES.map((ft) => (
                                            <SelectItem key={ft.key} value={ft.key}>
                                                <span className="mr-2">{ft.icon}</span> {ft.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Section</Label>
                                <Select value={newFieldSection} onValueChange={(v) => setNewFieldSection(v as FieldSection)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="core">Contact Info</SelectItem>
                                        <SelectItem value="detail">Details</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddField(false)} disabled={addingField}>Cancel</Button>
                        <Button onClick={handleAddField} disabled={addingField || !newFieldLabel.trim()}>
                            {addingField ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Adding...</> : <><Plus className="h-4 w-4 mr-1" /> Add Field</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Action Confirmation Dialog */}
            <AlertDialog open={!!actionTarget} onOpenChange={(o) => { if (!o) setActionTarget(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionTarget ? `${actionLabels[actionTarget.action].title} — "${actionTarget.field.fieldLabel}"` : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionTarget ? actionLabels[actionTarget.action].description : ""}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAction}
                            disabled={acting}
                            className={actionTarget?.action !== "promote" ? "bg-red-600 hover:bg-red-700" : ""}
                        >
                            {acting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Working...</> : actionTarget ? actionLabels[actionTarget.action].button : ""}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ─── Individual field row ─────────────────────────────────────────────
interface FieldRowProps {
    field: FieldDefinition
    onToggleMask: (masked: boolean) => void
    onSectionChange: (section: FieldSection) => void
    onAction: (action: "promote" | "demote" | "delete") => void
}

function FieldRow({ field, onToggleMask, onSectionChange, onAction }: FieldRowProps) {
    const isNative = field.source === "native"

    return (
        <div className={`flex items-center gap-3 py-3 px-1 ${field.isMasked ? "opacity-50" : ""}`}>
            {/* Drag handle placeholder */}
            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />

            {/* Visibility toggle */}
            <Switch
                checked={!field.isMasked}
                onCheckedChange={(checked) => onToggleMask(!checked)}
                disabled={isNative}
                className="shrink-0"
            />

            {/* Label */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{field.fieldLabel}</span>
                <span className="text-xs text-muted-foreground">({field.fieldKey})</span>
            </div>

            {/* Status badge */}
            {isNative ? (
                <Badge variant="secondary" className="text-[9px] shrink-0 px-1.5">Native</Badge>
            ) : field.isPromoted ? (
                <Badge variant="default" className="text-[9px] shrink-0 px-1.5 bg-emerald-600 hover:bg-emerald-600">Column</Badge>
            ) : (
                <Badge variant="outline" className="text-[9px] shrink-0 px-1.5">Custom</Badge>
            )}

            {/* Section selector */}
            <Select
                value={field.section || "detail"}
                onValueChange={(val) => onSectionChange(val as FieldSection)}
            >
                <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="core">Contact Info</SelectItem>
                    <SelectItem value="detail">Details</SelectItem>
                </SelectContent>
            </Select>

            {/* Type display */}
            <span className="text-xs text-muted-foreground w-16 text-right shrink-0 capitalize">{field.fieldType}</span>

            {/* Actions */}
            {!isNative ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        {!field.isPromoted && (
                            <DropdownMenuItem onClick={() => onAction("promote")}>
                                <ArrowUpCircle className="h-4 w-4 mr-2" />
                                Promote to Column
                            </DropdownMenuItem>
                        )}
                        {field.isPromoted && (
                            <DropdownMenuItem onClick={() => onAction("demote")}>
                                <ArrowDownCircle className="h-4 w-4 mr-2" />
                                Demote to Custom
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                            onClick={() => onAction("delete")}
                            className="text-red-600 focus:text-red-600"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Field
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <div className="w-8 shrink-0" />
            )}
        </div>
    )
}

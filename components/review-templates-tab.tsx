"use client"

import { useState } from "react"
import { useReviewTemplates, type ReviewTemplate, type ReviewField } from "@/hooks/use-review-templates"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
    GripVertical,
    Save,
    ChevronDown,
    ChevronRight,
    Edit2,
    Copy,
    Lock,
    AlertTriangle,
} from "lucide-react"

// ─── Types ───

interface EditableField {
    key: string
    label: string
    fieldType: ReviewField["fieldType"]
    section: string
    config: Record<string, unknown>
    isRequired: boolean
}

// ─── Field Editor Row ───

function FieldEditorRow({
    field,
    index,
    onUpdate,
    onDelete,
}: {
    field: EditableField
    index: number
    onUpdate: (patch: Partial<EditableField>) => void
    onDelete: () => void
}) {
    const [expanded, setExpanded] = useState(false)
    const anchors = (field.config.anchors ?? {}) as Record<string, string>

    return (
        <div className="border rounded-lg p-3 space-y-3">
            {/* Header row */}
            <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                <Input
                    value={field.label}
                    onChange={(e) => onUpdate({ label: e.target.value })}
                    placeholder="Field label"
                    className="h-8 flex-1"
                />
                <Select
                    value={field.fieldType}
                    onValueChange={(v) => onUpdate({ fieldType: v as EditableField["fieldType"] })}
                >
                    <SelectTrigger className="w-36 h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="score">Score (1-5)</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="multi_select">Multi-Select</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="evidence_quote">Evidence Quote</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    value={field.section}
                    onChange={(e) => onUpdate({ section: e.target.value })}
                    placeholder="Section"
                    className="h-8 w-28"
                />
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-muted-foreground hover:text-foreground p-1"
                >
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <button
                    onClick={onDelete}
                    className="text-muted-foreground hover:text-red-500 p-1"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            {/* Expanded config */}
            {expanded && (
                <div className="ml-6 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Key (stable identifier)</Label>
                            <Input
                                value={field.key}
                                onChange={(e) => onUpdate({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                                placeholder="field_key"
                                className="h-8 font-mono text-xs"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <label className="flex items-center gap-1.5 text-xs">
                                <input
                                    type="checkbox"
                                    checked={field.isRequired}
                                    onChange={(e) => onUpdate({ isRequired: e.target.checked })}
                                    className="rounded"
                                />
                                Required
                            </label>
                        </div>
                    </div>

                    {/* Score-specific: calibration anchors */}
                    {field.fieldType === "score" && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Calibration Anchors</Label>
                            <p className="text-[10px] text-muted-foreground">
                                Define what each score means — turns &quot;4/5&quot; into actionable feedback
                            </p>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <div key={n} className="flex items-start gap-2">
                                    <Badge variant="outline" className="mt-1 shrink-0 w-6 justify-center">{n}</Badge>
                                    <Textarea
                                        value={anchors[String(n)] ?? ""}
                                        onChange={(e) => {
                                            const newAnchors = { ...anchors, [String(n)]: e.target.value }
                                            onUpdate({ config: { ...field.config, anchors: newAnchors } })
                                        }}
                                        placeholder={n === 1 ? "Worst case behavior..." : n === 5 ? "Best case behavior..." : ""}
                                        rows={1}
                                        className="resize-none text-xs"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Text-specific: placeholder */}
                    {field.fieldType === "text" && (
                        <div>
                            <Label className="text-xs">Placeholder text</Label>
                            <Input
                                value={(field.config.placeholder as string) ?? ""}
                                onChange={(e) =>
                                    onUpdate({ config: { ...field.config, placeholder: e.target.value } })
                                }
                                className="h-8 text-xs"
                            />
                        </div>
                    )}

                    {/* Evidence quote: prompt */}
                    {field.fieldType === "evidence_quote" && (
                        <div>
                            <Label className="text-xs">Selection prompt</Label>
                            <Input
                                value={(field.config.prompt as string) ?? ""}
                                onChange={(e) =>
                                    onUpdate({ config: { ...field.config, prompt: e.target.value } })
                                }
                                placeholder="Select the transcript lines that..."
                                className="h-8 text-xs"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Main Component ───

export function ReviewTemplatesTab() {
    const { templates, saveTemplate, deleteTemplate, loading, refetch: refetchTemplates } = useReviewTemplates()
    const [editing, setEditing] = useState<string | null>(null) // template id or "new"
    const [editingLocked, setEditingLocked] = useState(false) // is the template being edited locked?
    const [editingVersion, setEditingVersion] = useState(1)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [appliesTo, setAppliesTo] = useState<"quick" | "deep" | "both">("deep")
    const [fields, setFields] = useState<EditableField[]>([])
    const [saving, setSaving] = useState(false)

    const startEdit = (tmpl: ReviewTemplate) => {
        setEditing(tmpl.id)
        setEditingLocked(tmpl.isLocked)
        setEditingVersion(tmpl.version)
        setName(tmpl.name)
        setDescription(tmpl.description ?? "")
        setAppliesTo(tmpl.appliesTo)
        setFields(
            tmpl.fields.map((f) => ({
                key: f.key,
                label: f.label,
                fieldType: f.fieldType,
                section: f.section ?? "General",
                config: f.config as Record<string, unknown>,
                isRequired: f.isRequired,
            })),
        )
    }

    const startNew = () => {
        setEditing("new")
        setEditingLocked(false)
        setEditingVersion(1)
        setName("")
        setDescription("")
        setAppliesTo("deep")
        setFields([])
    }

    const duplicateTemplate = (tmpl: ReviewTemplate) => {
        setEditing("new")
        setName(`${tmpl.name} (copy)`)
        setDescription(tmpl.description ?? "")
        setAppliesTo(tmpl.appliesTo)
        setFields(
            tmpl.fields.map((f) => ({
                key: f.key,
                label: f.label,
                fieldType: f.fieldType,
                section: f.section ?? "General",
                config: f.config as Record<string, unknown>,
                isRequired: f.isRequired,
            })),
        )
    }

    const addField = () => {
        setFields((prev) => [
            ...prev,
            {
                key: `field_${prev.length + 1}`,
                label: "",
                fieldType: "score" as const,
                section: "General",
                config: { min: 1, max: 5, anchors: {} },
                isRequired: false,
            },
        ])
    }

    const updateField = (index: number, patch: Partial<EditableField>) => {
        setFields((prev) =>
            prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
        )
    }

    const deleteField = (index: number) => {
        setFields((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await saveTemplate(
                {
                    id: editing !== "new" ? editing! : undefined,
                    name,
                    description: description || null,
                    version: 1,
                    isActive: true,
                    isLocked: false,
                    appliesTo,
                },
                fields.map((f) => ({
                    key: f.key,
                    label: f.label,
                    fieldType: f.fieldType,
                    section: f.section || null,
                    config: f.config as ReviewField["config"],
                    sortOrder: 0,
                    isRequired: f.isRequired,
                })),
            )
            setEditing(null)
            // Refresh templates from DB instead of full page reload
            await refetchTemplates()
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading templates...</p>
    }

    // ─── Template List ───
    if (!editing) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold">Review Templates</h3>
                        <p className="text-sm text-muted-foreground">
                            Define how calls are scored — add dimensions, set calibration anchors, attach evidence fields
                        </p>
                    </div>
                    <Button onClick={startNew} size="sm" className="gap-1">
                        <Plus className="h-4 w-4" />
                        New Template
                    </Button>
                </div>

                {templates.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            No templates yet. The default &quot;Cold Call v1&quot; template will be created when the migration runs.
                        </CardContent>
                    </Card>
                ) : (
                    templates.map((tmpl) => (
                        <Card key={tmpl.id}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">{tmpl.name}</CardTitle>
                                        <Badge variant="outline" className="text-xs">v{tmpl.version}</Badge>
                                        <Badge variant={tmpl.isActive ? "default" : "secondary"} className="text-xs">
                                            {tmpl.isActive ? "Active" : "Draft"}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {tmpl.appliesTo}
                                        </Badge>
                                        {tmpl.isLocked && (
                                            <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50 gap-1">
                                                <Lock className="h-3 w-3" />
                                                Locked
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => duplicateTemplate(tmpl)}
                                            className="h-7 gap-1 text-xs"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            Duplicate
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => startEdit(tmpl)}
                                            className="h-7 gap-1 text-xs"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                            {tmpl.isLocked ? "New Version" : "Edit"}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={async () => {
                                                if (confirm(`Deactivate "${tmpl.name}"? Existing reviews will keep their data.`)) {
                                                    await deleteTemplate(tmpl.id)
                                                }
                                            }}
                                            className="h-7 gap-1 text-xs text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                                {tmpl.description && (
                                    <CardDescription>{tmpl.description}</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex flex-wrap gap-1.5">
                                    {tmpl.fields.map((f) => (
                                        <Badge key={f.key} variant="outline" className="text-xs">
                                            {f.label} ({f.fieldType})
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        )
    }

    // ─── Template Editor ───
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                    {editing === "new" ? "New Template" : editingLocked ? `New Version: ${name}` : `Edit: ${name}`}
                </h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving || !name}>
                        <Save className="mr-1 h-4 w-4" />
                        {saving ? "Saving..." : editingLocked ? `Save as v${editingVersion + 1}` : "Save Template"}
                    </Button>
                </div>
            </div>

            {/* Version bump warning for locked templates */}
            {editingLocked && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50/50 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium text-amber-800">
                            This template is locked (used in reviews)
                        </p>
                        <p className="text-amber-600 text-xs mt-0.5">
                            Saving will create <strong>v{editingVersion + 1}</strong> — the old version and its reviews remain untouched.
                        </p>
                    </div>
                </div>
            )}

            {/* Meta */}
            <Card>
                <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Template Name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Cold Call v2"
                                className="h-8"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Applies To</Label>
                            <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as typeof appliesTo)}>
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="deep">Deep Dive</SelectItem>
                                    <SelectItem value="quick">Quick Batch</SelectItem>
                                    <SelectItem value="both">Both</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Description</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What framework or methodology does this template follow?"
                            rows={2}
                            className="resize-none"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Fields */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm">Fields ({fields.length})</CardTitle>
                            <CardDescription>
                                Add scoring dimensions, text fields, and evidence quote fields
                            </CardDescription>
                        </div>
                        <Button size="sm" variant="outline" onClick={addField} className="h-7 gap-1 text-xs">
                            <Plus className="h-3.5 w-3.5" />
                            Add Field
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {fields.map((field, i) => (
                        <FieldEditorRow
                            key={i}
                            field={field}
                            index={i}
                            onUpdate={(patch) => updateField(i, patch)}
                            onDelete={() => deleteField(i)}
                        />
                    ))}
                    {fields.length === 0 && (
                        <p className="text-sm text-center text-muted-foreground py-6">
                            No fields yet. Click &quot;Add Field&quot; to start building your review template.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

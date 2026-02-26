"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Plus, MoreHorizontal, Pencil, Trash2, Search, X, GripVertical } from "lucide-react"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import type { FieldType, FieldDefinition } from "@/lib/store"

const fieldTypeConfig: Record<FieldType, { label: string; description: string; icon: string }> = {
  text: { label: "Text", description: "Single-line text input", icon: "Aa" },
  number: { label: "Number", description: "Numeric value", icon: "#" },
  select: { label: "Dropdown", description: "Pick one from a list", icon: "v" },
  multi_select: { label: "Multi-select", description: "Pick multiple from a list", icon: "[]" },
  date: { label: "Date", description: "Calendar date picker", icon: "D" },
  boolean: { label: "Yes / No", description: "Toggle switch", icon: "T" },
  url: { label: "URL", description: "Web link, opens in new tab", icon: "@" },
  email: { label: "Email", description: "Email address with mailto", icon: "@" },
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

const ENTITY_TYPES = [
  { key: "lead", label: "Leads" },
  { key: "contact", label: "Contacts" },
  { key: "opportunity", label: "Opportunities" },
]

// --- Proper options list manager ---
function OptionsManager({
  options,
  onChange,
}: {
  options: string[]
  onChange: (options: string[]) => void
}) {
  const [newOption, setNewOption] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const addOption = () => {
    const trimmed = newOption.trim()
    if (!trimmed || options.includes(trimmed)) return
    onChange([...options, trimmed])
    setNewOption("")
    inputRef.current?.focus()
  }

  const removeOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addOption()
    }
  }

  const handleDragStart = (idx: number) => {
    setDragIdx(idx)
  }

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === targetIdx) return
    const reordered = [...options]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(targetIdx, 0, moved)
    onChange(reordered)
    setDragIdx(targetIdx)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
  }

  return (
    <div className="space-y-2">
      <Label>Options</Label>
      {options.length > 0 && (
        <div className="border rounded-lg divide-y">
          {options.map((opt, i) => (
            <div
              key={`${opt}-${i}`}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 px-3 py-2 group hover:bg-muted/50 transition-colors ${
                dragIdx === i ? "opacity-50" : ""
              }`}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab shrink-0" />
              <span className="text-sm text-muted-foreground w-5 tabular-nums">{i + 1}</span>
              <span className="text-sm flex-1">{opt}</span>
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type an option and press Enter"
          className="h-9"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 shrink-0"
          onClick={addOption}
          disabled={!newOption.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      {options.length === 0 && (
        <p className="text-xs text-muted-foreground">Add at least one option for users to select from.</p>
      )}
    </div>
  )
}

function FieldList({ entityType }: { entityType: string }) {
  const { fields, loading, createField, updateField, deleteField } = useFieldDefinitions(entityType)
  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null)
  const [formLabel, setFormLabel] = useState("")
  const [formType, setFormType] = useState<FieldType>("text")
  const [formRequired, setFormRequired] = useState(false)
  const [formOptions, setFormOptions] = useState<string[]>([])

  const entityLabel = ENTITY_TYPES.find((e) => e.key === entityType)?.label ?? entityType

  const filtered = search
    ? fields.filter((f) =>
        f.fieldLabel.toLowerCase().includes(search.toLowerCase()) ||
        f.fieldKey.toLowerCase().includes(search.toLowerCase())
      )
    : fields

  const showOptions = formType === "select" || formType === "multi_select"

  const resetForm = () => {
    setFormLabel("")
    setFormType("text")
    setFormRequired(false)
    setFormOptions([])
    setEditingField(null)
  }

  const openAdd = () => {
    resetForm()
    setIsAddOpen(true)
  }

  const openEdit = (field: FieldDefinition) => {
    setFormLabel(field.fieldLabel)
    setFormType(field.fieldType)
    setFormRequired(field.isRequired)
    setFormOptions(field.options ?? [])
    setEditingField(field)
    setIsAddOpen(true)
  }

  const handleSave = async () => {
    if (!formLabel.trim()) return
    const options = showOptions ? formOptions : undefined

    if (editingField) {
      await updateField(editingField.id, {
        fieldLabel: formLabel.trim(),
        fieldType: formType,
        isRequired: formRequired,
        options,
      })
    } else {
      const key = slugify(formLabel)
      await createField({
        fieldKey: key,
        fieldLabel: formLabel.trim(),
        fieldType: formType,
        options,
        isRequired: formRequired,
      })
    }

    resetForm()
    setIsAddOpen(false)
  }

  const handleDelete = async (field: FieldDefinition) => {
    if (!confirm(`Delete field "${field.fieldLabel}"? This won't remove existing data.`)) return
    await deleteField(field.id)
  }

  const canSave = formLabel.trim() && (!showOptions || formOptions.length > 0)

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Loading fields...</p>
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter fields..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button size="sm" className="h-9" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />
            New {entityLabel.slice(0, -1)} Field
          </Button>
        </div>

        <div className="border rounded-lg">
          <div className="grid grid-cols-[2.5rem_1fr_8rem_2.5rem] gap-2 px-4 py-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>#</span>
            <span>Name</span>
            <span>Type</span>
            <span></span>
          </div>
          <div className="divide-y">
            {filtered.map((field, i) => (
              <div
                key={field.id}
                className="grid grid-cols-[2.5rem_1fr_8rem_2.5rem] gap-2 px-4 py-3 items-center group hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{field.fieldLabel}</span>
                    {field.isRequired && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">Required</Badge>
                    )}
                  </div>
                  {field.options && field.options.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {field.options.join(" / ")}
                    </p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{fieldTypeConfig[field.fieldType]?.label ?? field.fieldType}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(field)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(field)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {search ? "No fields match your filter." : `No custom fields defined for ${entityLabel.toLowerCase()}.`}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit Field" : `Add ${entityLabel.slice(0, -1)} Field`}</DialogTitle>
            <DialogDescription>
              {editingField
                ? `Editing "${editingField.fieldLabel}" — changes apply immediately.`
                : `Create a new custom field for ${entityLabel.toLowerCase()}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. Industry, Fleet Size, Revenue"
              />
              {!editingField && formLabel && (
                <p className="text-xs text-muted-foreground">
                  Internal key: <code className="bg-muted px-1 rounded text-xs">{slugify(formLabel)}</code>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(fieldTypeConfig) as [FieldType, typeof fieldTypeConfig[FieldType]][]).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setFormType(key)
                      if (key !== "select" && key !== "multi_select") {
                        setFormOptions([])
                      }
                    }}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all hover:bg-muted/50 ${
                      formType === key
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border"
                    }`}
                  >
                    <span className="text-xs font-mono bg-muted rounded px-1.5 py-0.5 mt-0.5 shrink-0 w-7 text-center">{config.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{config.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {showOptions && (
              <OptionsManager options={formOptions} onChange={setFormOptions} />
            )}

            <div className="pt-1 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Required field</Label>
                  <p className="text-xs text-muted-foreground">Must be filled when creating or editing a record</p>
                </div>
                <Switch checked={formRequired} onCheckedChange={setFormRequired} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {editingField ? "Save Changes" : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function FieldEditor() {
  const leadFields = useFieldDefinitions("lead")
  const contactFields = useFieldDefinitions("contact")
  const opportunityFields = useFieldDefinitions("opportunity")

  return (
    <Tabs defaultValue="lead">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Custom Fields</h3>
      </div>
      <TabsList>
        <TabsTrigger value="lead">
          Leads
          {!leadFields.loading && (
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{leadFields.fields.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="contact">
          Contacts
          {!contactFields.loading && (
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{contactFields.fields.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="opportunity">
          Opportunities
          {!opportunityFields.loading && (
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{opportunityFields.fields.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="lead">
        <FieldList entityType="lead" />
      </TabsContent>
      <TabsContent value="contact">
        <FieldList entityType="contact" />
      </TabsContent>
      <TabsContent value="opportunity">
        <FieldList entityType="opportunity" />
      </TabsContent>
    </Tabs>
  )
}

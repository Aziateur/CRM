"use client"

import { useState } from "react"
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
} from "@/components/ui/dialog"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Plus, MoreHorizontal, Pencil, Trash2, Search } from "lucide-react"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import type { FieldType, FieldDefinition } from "@/lib/store"

const fieldTypeLabels: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  select: "Dropdown",
  multi_select: "Multi-select",
  date: "Date",
  boolean: "Yes/No",
  url: "URL",
  email: "Email",
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

function FieldList({ entityType }: { entityType: string }) {
  const { fields, loading, createField, updateField, deleteField } = useFieldDefinitions(entityType)
  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null)
  const [formLabel, setFormLabel] = useState("")
  const [formType, setFormType] = useState<FieldType>("text")
  const [formRequired, setFormRequired] = useState(false)
  const [formOptions, setFormOptions] = useState("")

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
    setFormOptions("")
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
    setFormOptions(field.options?.join(", ") ?? "")
    setEditingField(field)
    setIsAddOpen(true)
  }

  const handleSave = async () => {
    if (!formLabel.trim()) return
    const options = showOptions
      ? formOptions.split(",").map((o) => o.trim()).filter(Boolean)
      : undefined

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
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{field.fieldLabel}</span>
                  {field.isRequired && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">Required</Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{fieldTypeLabels[field.fieldType] ?? field.fieldType}</span>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit Field" : `Add ${entityLabel.slice(0, -1)} Field`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. Industry, Fleet Size"
              />
              {!editingField && formLabel && (
                <p className="text-xs text-muted-foreground">
                  Key: <code className="bg-muted px-1 rounded">{slugify(formLabel)}</code>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as FieldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(fieldTypeLabels) as FieldType[]).map((ft) => (
                    <SelectItem key={ft} value={ft}>{fieldTypeLabels[ft]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showOptions && (
              <div className="space-y-2">
                <Label>Options (comma-separated)</Label>
                <Input
                  value={formOptions}
                  onChange={(e) => setFormOptions(e.target.value)}
                  placeholder="Option 1, Option 2, Option 3"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={formRequired} onCheckedChange={setFormRequired} />
              <Label>Required field</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formLabel.trim()}>
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

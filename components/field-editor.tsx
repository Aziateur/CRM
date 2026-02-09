"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Trash2, ChevronUp, ChevronDown, Settings2 } from "lucide-react"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import type { FieldType } from "@/lib/store"

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

export function FieldEditor() {
  const { fields, loading, createField, deleteField, moveField } = useFieldDefinitions("lead")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newType, setNewType] = useState<FieldType>("text")
  const [newRequired, setNewRequired] = useState(false)
  const [newOptions, setNewOptions] = useState("")

  const showOptions = newType === "select" || newType === "multi_select"

  const handleAdd = async () => {
    if (!newLabel.trim()) return
    const key = slugify(newLabel)
    const options = showOptions
      ? newOptions.split(",").map((o) => o.trim()).filter(Boolean)
      : undefined

    await createField({
      fieldKey: key,
      fieldLabel: newLabel.trim(),
      fieldType: newType,
      options,
      isRequired: newRequired,
    })

    setNewLabel("")
    setNewType("text")
    setNewRequired(false)
    setNewOptions("")
    setIsAddOpen(false)
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete field "${label}"? This won't remove existing data.`)) return
    await deleteField(id)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            Custom Fields
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-4 w-4" />
              Custom Fields
              <Badge variant="secondary" className="text-xs">{fields.length}</Badge>
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No custom fields defined. Add one to extend your lead data.
            </p>
          ) : (
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        disabled={i === 0}
                        onClick={() => moveField(field.id, "up")}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        disabled={i === fields.length - 1}
                        onClick={() => moveField(field.id, "down")}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{field.fieldLabel}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {fieldTypeLabels[field.fieldType] ?? field.fieldType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{field.fieldKey}</span>
                        {field.isRequired && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-red-600"
                    onClick={() => handleDelete(field.id, field.fieldLabel)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label *</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Industry, Fleet Size"
              />
              {newLabel && (
                <p className="text-xs text-muted-foreground">
                  Key: <code className="bg-muted px-1 rounded">{slugify(newLabel)}</code>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as FieldType)}>
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
                  value={newOptions}
                  onChange={(e) => setNewOptions(e.target.value)}
                  placeholder="Option 1, Option 2, Option 3"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={newRequired} onCheckedChange={setNewRequired} />
              <Label>Required field</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newLabel.trim()}>Add Field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

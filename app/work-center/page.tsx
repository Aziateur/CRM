"use client"

import { useState, useCallback } from "react"
import { Topbar } from "@/components/topbar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ListChecks, Settings2, Plus, Trash2, X, ChevronDown, ChevronRight,
  Check, Link as LinkIcon, FileText, CheckSquare, GripVertical,
} from "lucide-react"
import { useTaskTemplates, useTaskAssignments } from "@/hooks/use-task-templates"
import { getSupabase } from "@/lib/supabase"
import type { TaskTemplate, TemplateItem, TemplateItemType, TaskAssignment, TaskAssignmentItemData } from "@/lib/store"

// ─── ID generator ────────────────────────────────────────────────────────────

function newId(): string {
  return crypto.randomUUID().slice(0, 8)
}

// ─── Item type helpers ───────────────────────────────────────────────────────

const itemTypeLabels: Record<TemplateItemType, string> = {
  checkbox: "Checkbox",
  link: "Link",
  note: "Note",
  group: "Group",
}

const itemTypeIcons: Record<TemplateItemType, React.ReactNode> = {
  checkbox: <CheckSquare className="h-3.5 w-3.5" />,
  link: <LinkIcon className="h-3.5 w-3.5" />,
  note: <FileText className="h-3.5 w-3.5" />,
  group: <ListChecks className="h-3.5 w-3.5" />,
}

// ─── Progress helper ─────────────────────────────────────────────────────────

function countProgress(items: TemplateItem[], data: Record<string, TaskAssignmentItemData>): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const item of items) {
    if (item.type === "group" && item.children) {
      const sub = countProgress(item.children, data)
      done += sub.done
      total += sub.total
    } else {
      total++
      if (data[item.id]?.done) done++
    }
  }
  return { done, total }
}

// ============================================================================
// TASKS TAB — grouped by template, work through checklists
// ============================================================================

function TasksTab() {
  const { templates } = useTaskTemplates()
  const { assignments, toggleItem, updateItemValue } = useTaskAssignments()
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null)
  const [hideCompleted, setHideCompleted] = useState(false)
  const [leadNames, setLeadNames] = useState<Record<string, string>>({})

  // Fetch lead names for display
  const fetchLeadNames = useCallback(async (leadIds: string[]) => {
    if (leadIds.length === 0) return
    const missing = leadIds.filter((id) => !leadNames[id])
    if (missing.length === 0) return
    const supabase = getSupabase()
    const { data } = await supabase.from("leads").select("id, company").in("id", missing)
    if (data) {
      const names: Record<string, string> = {}
      for (const row of data) names[row.id as string] = (row.company as string) || "Unknown"
      setLeadNames((prev) => ({ ...prev, ...names }))
    }
  }, [leadNames])

  // Group assignments by template
  const grouped = new Map<string, TaskAssignment[]>()
  for (const a of assignments) {
    if (hideCompleted && a.status === "completed") continue
    const list = grouped.get(a.templateId) ?? []
    list.push(a)
    grouped.set(a.templateId, list)
  }

  // Fetch lead names when assignments change
  const allLeadIds = assignments.map((a) => a.leadId)
  if (allLeadIds.length > 0) {
    const missing = allLeadIds.filter((id) => !leadNames[id])
    if (missing.length > 0) fetchLeadNames(missing)
  }

  const toggleTemplate = (id: string) => {
    setExpandedTemplates((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (templates.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No task templates yet. Create one in the Templates tab to get started.</p>
      </div>
    )
  }

  const activeAssignments = assignments.filter((a) => a.status === "active")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {activeAssignments.length} active assignment{activeAssignments.length !== 1 ? "s" : ""} across {grouped.size} template{grouped.size !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setHideCompleted(!hideCompleted)}
        >
          {hideCompleted ? "Show completed" : "Hide completed"}
        </Button>
      </div>

      {templates.map((template) => {
        const templateAssignments = grouped.get(template.id)
        if (!templateAssignments || templateAssignments.length === 0) return null
        const isExpanded = expandedTemplates.has(template.id)
        const activeCount = templateAssignments.filter((a) => a.status === "active").length

        return (
          <Card key={template.id}>
            <CardHeader
              className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggleTemplate(template.id)}
            >
              <CardTitle className="text-sm flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {template.name}
                <Badge variant="secondary" className="text-xs ml-auto">
                  {templateAssignments.length} lead{templateAssignments.length !== 1 ? "s" : ""}
                </Badge>
                {activeCount > 0 && (
                  <Badge className="text-xs">{activeCount} active</Badge>
                )}
              </CardTitle>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0">
                <div className="divide-y">
                  {templateAssignments.map((assignment) => {
                    const { done, total } = countProgress(template.items, assignment.data)
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0
                    const isOpen = expandedAssignment === assignment.id
                    const leadName = leadNames[assignment.leadId] || "Loading..."

                    return (
                      <div key={assignment.id} className="py-2">
                        <div
                          className="flex items-center gap-3 cursor-pointer hover:bg-muted/30 rounded px-2 py-1 -mx-2 transition-colors"
                          onClick={() => setExpandedAssignment(isOpen ? null : assignment.id)}
                        >
                          <span className="text-sm font-medium flex-1">{leadName}</span>
                          <div className="flex items-center gap-2">
                            {assignment.status === "completed" ? (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-200">Done</Badge>
                            ) : (
                              <>
                                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">{done}/{total}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {isOpen && (
                          <div className="mt-2 ml-2 space-y-1">
                            <AssignmentChecklist
                              items={template.items}
                              data={assignment.data}
                              assignmentId={assignment.id}
                              templateItems={template.items}
                              onToggle={toggleItem}
                              onUpdateValue={updateItemValue}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {grouped.size === 0 && (
        <div className="border rounded-lg p-8 text-center">
          <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {hideCompleted ? "All tasks completed! Toggle to see them." : "No assignments yet. Assign templates to leads from the Leads page."}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Inline checklist for working through an assignment ──────────────────────

function AssignmentChecklist({
  items,
  data,
  assignmentId,
  templateItems,
  onToggle,
  onUpdateValue,
  depth = 0,
}: {
  items: TemplateItem[]
  data: Record<string, TaskAssignmentItemData>
  assignmentId: string
  templateItems: TemplateItem[]
  onToggle: (assignmentId: string, itemId: string, templateItems: TemplateItem[]) => void
  onUpdateValue: (assignmentId: string, itemId: string, value: string) => void
  depth?: number
}) {
  return (
    <div className={`space-y-1 ${depth > 0 ? "ml-5 border-l pl-3" : ""}`}>
      {items.map((item) => {
        const itemData = data[item.id] ?? { done: false }

        if (item.type === "group" && item.children) {
          const { done, total } = countProgress(item.children, data)
          return (
            <div key={item.id}>
              <div className="flex items-center gap-2 py-0.5">
                <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{done}/{total}</span>
              </div>
              <AssignmentChecklist
                items={item.children}
                data={data}
                assignmentId={assignmentId}
                templateItems={templateItems}
                onToggle={onToggle}
                onUpdateValue={onUpdateValue}
                depth={depth + 1}
              />
            </div>
          )
        }

        return (
          <div key={item.id} className="flex items-start gap-2 py-0.5">
            <input
              type="checkbox"
              checked={itemData.done}
              onChange={() => onToggle(assignmentId, item.id, templateItems)}
              className="rounded border-gray-300 h-4 w-4 mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className={`text-sm ${itemData.done ? "line-through text-muted-foreground" : ""}`}>
                {item.label}
              </span>
              {(item.type === "link" || item.type === "note") && (
                <Input
                  value={itemData.value ?? ""}
                  onChange={(e) => onUpdateValue(assignmentId, item.id, e.target.value)}
                  placeholder={item.type === "link" ? "Paste URL..." : "Add note..."}
                  className="h-7 text-xs mt-1"
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// TEMPLATES TAB — create/edit modular templates
// ============================================================================

function TemplatesTab() {
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useTaskTemplates()
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: "", description: "" })

  const handleCreate = async () => {
    const result = await createTemplate({ name: form.name, description: form.description || undefined })
    if (result) {
      setForm({ name: "", description: "" })
      setIsCreateOpen(false)
      setEditingTemplate(result)
    }
  }

  if (editingTemplate) {
    return (
      <TemplateBuilder
        template={editingTemplate}
        onUpdate={async (items) => {
          await updateTemplate(editingTemplate.id, { items })
          setEditingTemplate({ ...editingTemplate, items })
        }}
        onUpdateName={async (name) => {
          await updateTemplate(editingTemplate.id, { name })
          setEditingTemplate({ ...editingTemplate, name })
        }}
        onUpdateDescription={async (description) => {
          await updateTemplate(editingTemplate.id, { description })
          setEditingTemplate({ ...editingTemplate, description })
        }}
        onBack={() => setEditingTemplate(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Templates</h2>
          <p className="text-muted-foreground text-sm">Reusable checklists you can assign to leads</p>
        </div>
        <Button onClick={() => { setForm({ name: "", description: "" }); setIsCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No templates yet. Create one to define reusable task checklists.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEditingTemplate(t)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.name}</p>
                  {t.description && <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{t.items.length} item{t.items.length !== 1 ? "s" : ""}</Badge>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-red-600"
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id) }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Website Redesign" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Spec work for lead's website" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Template Builder ────────────────────────────────────────────────────────

function TemplateBuilder({
  template,
  onUpdate,
  onUpdateName,
  onUpdateDescription,
  onBack,
}: {
  template: TaskTemplate
  onUpdate: (items: TemplateItem[]) => Promise<void>
  onUpdateName: (name: string) => Promise<void>
  onUpdateDescription: (description: string) => Promise<void>
  onBack: () => void
}) {
  const [items, setItems] = useState<TemplateItem[]>(template.items)
  const [addType, setAddType] = useState<TemplateItemType>("checkbox")
  const [addLabel, setAddLabel] = useState("")
  const [addParentId, setAddParentId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(template.name)
  const [descValue, setDescValue] = useState(template.description ?? "")

  const saveItems = async (updated: TemplateItem[]) => {
    setItems(updated)
    await onUpdate(updated)
  }

  const handleAddItem = async () => {
    if (!addLabel.trim()) return
    const newItem: TemplateItem = { id: newId(), label: addLabel.trim(), type: addType }
    if (addType === "group") newItem.children = []

    let updated: TemplateItem[]
    if (addParentId) {
      updated = items.map((item) =>
        item.id === addParentId && item.children
          ? { ...item, children: [...item.children, newItem] }
          : item
      )
    } else {
      updated = [...items, newItem]
    }
    await saveItems(updated)
    setAddLabel("")
    setAddParentId(null)
  }

  const handleRemoveItem = async (itemId: string, parentId?: string) => {
    let updated: TemplateItem[]
    if (parentId) {
      updated = items.map((item) =>
        item.id === parentId && item.children
          ? { ...item, children: item.children.filter((c) => c.id !== itemId) }
          : item
      )
    } else {
      updated = items.filter((item) => item.id !== itemId)
    }
    await saveItems(updated)
  }

  const handleUpdateLabel = async (itemId: string, label: string, parentId?: string) => {
    let updated: TemplateItem[]
    if (parentId) {
      updated = items.map((item) =>
        item.id === parentId && item.children
          ? { ...item, children: item.children.map((c) => c.id === itemId ? { ...c, label } : c) }
          : item
      )
    } else {
      updated = items.map((item) => item.id === itemId ? { ...item, label } : item)
    }
    await saveItems(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7">&larr; Back</Button>
        {editingName ? (
          <Input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={async () => { await onUpdateName(nameValue); setEditingName(false) }}
            onKeyDown={async (e) => { if (e.key === "Enter") { await onUpdateName(nameValue); setEditingName(false) } }}
            className="h-8 text-lg font-semibold w-64"
            autoFocus
          />
        ) : (
          <h3
            className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
            onClick={() => setEditingName(true)}
          >
            {template.name}
          </h3>
        )}
      </div>

      <Input
        value={descValue}
        onChange={(e) => setDescValue(e.target.value)}
        onBlur={() => onUpdateDescription(descValue)}
        placeholder="Description (optional)"
        className="h-8 text-sm text-muted-foreground"
      />

      {/* Items list */}
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id}>
            <ItemRow
              item={item}
              onRemove={() => handleRemoveItem(item.id)}
              onUpdateLabel={(label) => handleUpdateLabel(item.id, label)}
              onAddChild={item.type === "group" ? () => setAddParentId(item.id) : undefined}
            />
            {item.type === "group" && item.children && (
              <div className="ml-6 border-l pl-3 space-y-1">
                {item.children.map((child) => (
                  <ItemRow
                    key={child.id}
                    item={child}
                    onRemove={() => handleRemoveItem(child.id, item.id)}
                    onUpdateLabel={(label) => handleUpdateLabel(child.id, label, item.id)}
                  />
                ))}
                {addParentId === item.id && (
                  <div className="flex items-center gap-2 py-1">
                    <Select value={addType} onValueChange={(v) => setAddType(v as TemplateItemType)}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="link">Link</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={addLabel}
                      onChange={(e) => setAddLabel(e.target.value)}
                      placeholder="Item label..."
                      className="h-7 text-xs flex-1"
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddItem() }}
                      autoFocus
                    />
                    <Button size="sm" className="h-7" onClick={handleAddItem} disabled={!addLabel.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => { setAddParentId(null); setAddLabel("") }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add item controls */}
      {addParentId === null && (
        <div className="flex items-center gap-2 border rounded-lg p-2">
          <Select value={addType} onValueChange={(v) => setAddType(v as TemplateItemType)}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(itemTypeLabels) as TemplateItemType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  <div className="flex items-center gap-1.5">
                    {itemTypeIcons[t]}
                    {itemTypeLabels[t]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            placeholder="Item label..."
            className="h-8 flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") handleAddItem() }}
          />
          <Button size="sm" onClick={handleAddItem} disabled={!addLabel.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      )}
    </div>
  )
}

function ItemRow({
  item,
  onRemove,
  onUpdateLabel,
  onAddChild,
}: {
  item: TemplateItem
  onRemove: () => void
  onUpdateLabel: (label: string) => void
  onAddChild?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(item.label)

  return (
    <div className="flex items-center gap-2 py-1 px-2 -mx-2 rounded hover:bg-muted/30 transition-colors group">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
      {itemTypeIcons[item.type]}
      {editing ? (
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => { onUpdateLabel(label); setEditing(false) }}
          onKeyDown={(e) => { if (e.key === "Enter") { onUpdateLabel(label); setEditing(false) } }}
          className="h-7 text-sm flex-1"
          autoFocus
        />
      ) : (
        <span
          className="text-sm flex-1 cursor-pointer"
          onClick={() => setEditing(true)}
        >
          {item.label}
        </span>
      )}
      <Badge variant="outline" className="text-[10px]">{itemTypeLabels[item.type]}</Badge>
      {onAddChild && (
        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onAddChild}>
          <Plus className="h-3 w-3" />
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function WorkCenterPage() {
  const [activeTab, setActiveTab] = useState("tasks")

  return (
    <>
      <Topbar title="Work Center" />
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="tasks" className="gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <TasksTab />
          </TabsContent>

          <TabsContent value="templates">
            <TemplatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

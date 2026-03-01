"use client"

import { useState, useEffect } from "react"
import { useWorkflows } from "@/hooks/use-workflows"
import { useSequences } from "@/hooks/use-sequences"
import { describeWorkflow } from "@/lib/workflow-engine"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Zap } from "lucide-react"
import type { Workflow, WorkflowTriggerType, WorkflowActionType, Sequence } from "@/lib/store"

const triggerLabels: Record<WorkflowTriggerType, string> = {
  stage_change: "Stage changes",
  new_lead: "New lead created",
  tag_added: "Tag added",
  tag_removed: "Tag removed",
  field_changed: "Field changed",
  lead_idle: "Lead idle (days)",
  task_overdue: "Task overdue",
  outcome_logged: "Call outcome logged",
}

const actionLabels: Record<WorkflowActionType, string> = {
  change_stage: "Change stage",
  add_tag: "Add tag",
  remove_tag: "Remove tag",
  create_task: "Create task",
  update_field: "Update field",
  send_notification: "Show notification",
  enroll_sequence: "Enroll in sequence",
}

interface WorkflowForm {
  name: string
  description: string
  triggerType: WorkflowTriggerType
  triggerConfig: Record<string, string>
  actionType: WorkflowActionType
  actionConfig: Record<string, string>
}

const emptyForm: WorkflowForm = {
  name: "",
  description: "",
  triggerType: "stage_change",
  triggerConfig: {},
  actionType: "add_tag",
  actionConfig: {},
}

function TriggerConfigFields({ type, config, onChange }: { type: WorkflowTriggerType; config: Record<string, string>; onChange: (c: Record<string, string>) => void }) {
  switch (type) {
    case "stage_change":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">From stage (optional)</Label>
            <Input value={config.from_stage || ""} onChange={(e) => onChange({ ...config, from_stage: e.target.value })} placeholder="Any" className="h-8" />
          </div>
          <div>
            <Label className="text-xs">To stage</Label>
            <Input value={config.to_stage || ""} onChange={(e) => onChange({ ...config, to_stage: e.target.value })} placeholder="e.g. Interested" className="h-8" />
          </div>
        </div>
      )
    case "tag_added":
    case "tag_removed":
      return (
        <div>
          <Label className="text-xs">Tag name (blank = any)</Label>
          <Input value={config.tag_name || ""} onChange={(e) => onChange({ ...config, tag_name: e.target.value })} placeholder="e.g. Hot Lead" className="h-8" />
        </div>
      )
    case "field_changed":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Field key</Label>
            <Input value={config.field_key || ""} onChange={(e) => onChange({ ...config, field_key: e.target.value })} placeholder="e.g. deal_value" className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Condition</Label>
            <Input value={config.condition || ""} onChange={(e) => onChange({ ...config, condition: e.target.value })} placeholder="equals / greater_than" className="h-8" />
          </div>
        </div>
      )
    case "outcome_logged":
      return (
        <div>
          <Label className="text-xs">Outcome (blank = any)</Label>
          <Input value={config.outcome || ""} onChange={(e) => onChange({ ...config, outcome: e.target.value })} placeholder="e.g. Meeting set" className="h-8" />
        </div>
      )
    case "lead_idle":
      return (
        <div>
          <Label className="text-xs">Days idle</Label>
          <Input type="number" value={config.days || ""} onChange={(e) => onChange({ ...config, days: e.target.value })} placeholder="7" className="h-8" />
        </div>
      )
    default:
      return null
  }
}

function ActionConfigFields({ type, config, onChange, sequences }: { type: WorkflowActionType; config: Record<string, string>; onChange: (c: Record<string, string>) => void; sequences: Sequence[] }) {
  switch (type) {
    case "change_stage":
      return (
        <div>
          <Label className="text-xs">Target stage</Label>
          <Input value={config.stage_name || ""} onChange={(e) => onChange({ ...config, stage_name: e.target.value })} placeholder="e.g. Meeting Booked" className="h-8" />
        </div>
      )
    case "add_tag":
    case "remove_tag":
      return (
        <div>
          <Label className="text-xs">Tag name</Label>
          <Input value={config.tag_name || ""} onChange={(e) => onChange({ ...config, tag_name: e.target.value })} placeholder="e.g. Priority" className="h-8" />
        </div>
      )
    case "create_task":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Task title</Label>
            <Input value={config.title || ""} onChange={(e) => onChange({ ...config, title: e.target.value })} placeholder="Follow up with lead" className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Due in (days)</Label>
            <Input type="number" value={config.due_days || ""} onChange={(e) => onChange({ ...config, due_days: e.target.value })} placeholder="3" className="h-8" />
          </div>
        </div>
      )
    case "update_field":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Field key</Label>
            <Input value={config.field_key || ""} onChange={(e) => onChange({ ...config, field_key: e.target.value })} className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input value={config.value || ""} onChange={(e) => onChange({ ...config, value: e.target.value })} className="h-8" />
          </div>
        </div>
      )
    case "send_notification":
      return (
        <div>
          <Label className="text-xs">Message</Label>
          <Input value={config.message || ""} onChange={(e) => onChange({ ...config, message: e.target.value })} placeholder="Use {company}, {stage}" className="h-8" />
        </div>
      )
    case "enroll_sequence":
      return (
        <div>
          <Label className="text-xs">Sequence</Label>
          <Select value={config.sequence_id || ""} onValueChange={(v) => onChange({ ...config, sequence_id: v })}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Select sequence..." /></SelectTrigger>
            <SelectContent>
              {sequences.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    default:
      return null
  }
}

// ─── Shared Workflow Dialog ──────────────────────────────────────────────────

interface WorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  form: WorkflowForm
  onFormChange: (form: WorkflowForm | ((prev: WorkflowForm) => WorkflowForm)) => void
  sequences: Sequence[]
  onSave: () => void
  saveLabel: string
}

function WorkflowDialog({ open, onOpenChange, title, form, onFormChange, sequences, onSave, saveLabel }: WorkflowDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => onFormChange((f) => ({ ...f, name: e.target.value }))} placeholder="Auto-tag hot leads" />
          </div>
          <div className="space-y-2">
            <Label>When (trigger)</Label>
            <Select value={form.triggerType} onValueChange={(v) => onFormChange((f) => ({ ...f, triggerType: v as WorkflowTriggerType, triggerConfig: v === f.triggerType ? f.triggerConfig : {} }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(triggerLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TriggerConfigFields type={form.triggerType} config={form.triggerConfig} onChange={(c) => onFormChange((f) => ({ ...f, triggerConfig: c }))} />
          </div>
          <div className="space-y-2">
            <Label>Then (action)</Label>
            <Select value={form.actionType} onValueChange={(v) => onFormChange((f) => ({ ...f, actionType: v as WorkflowActionType, actionConfig: v === f.actionType ? f.actionConfig : {} }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(actionLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ActionConfigFields type={form.actionType} config={form.actionConfig} onChange={(c) => onFormChange((f) => ({ ...f, actionConfig: c }))} sequences={sequences} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={!form.name.trim()}>{saveLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── WorkflowEditor ──────────────────────────────────────────────────────────

function workflowToForm(w: Workflow): WorkflowForm {
  const tc = (w.triggerConfig ?? {}) as Record<string, unknown>
  const ac = (w.actionConfig ?? {}) as Record<string, unknown>
  const triggerConfig: Record<string, string> = {}
  const actionConfig: Record<string, string> = {}
  for (const [k, v] of Object.entries(tc)) triggerConfig[k] = String(v ?? "")
  for (const [k, v] of Object.entries(ac)) actionConfig[k] = String(v ?? "")
  return {
    name: w.name,
    description: w.description ?? "",
    triggerType: w.triggerType,
    triggerConfig,
    actionType: w.actionType,
    actionConfig,
  }
}

export function WorkflowEditor() {
  const { workflows, createWorkflow, updateWorkflow, deleteWorkflow } = useWorkflows()
  const { sequences } = useSequences()

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState<WorkflowForm>(emptyForm)

  // Edit dialog
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [editForm, setEditForm] = useState<WorkflowForm>(emptyForm)

  useEffect(() => {
    if (editingWorkflow) {
      setEditForm(workflowToForm(editingWorkflow))
    }
  }, [editingWorkflow])

  const handleCreate = async () => {
    const result = await createWorkflow({
      name: form.name,
      description: form.description || undefined,
      triggerType: form.triggerType,
      triggerConfig: form.triggerConfig,
      actionType: form.actionType,
      actionConfig: form.actionConfig,
    })
    if (result) {
      setForm(emptyForm)
      setIsCreateOpen(false)
    }
  }

  const handleEdit = async () => {
    if (!editingWorkflow) return
    await updateWorkflow(editingWorkflow.id, {
      name: editForm.name,
      description: editForm.description || undefined,
      triggerType: editForm.triggerType,
      triggerConfig: editForm.triggerConfig,
      actionType: editForm.actionType,
      actionConfig: editForm.actionConfig,
    })
    setEditingWorkflow(null)
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateWorkflow(id, { isActive })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Workflows</h3>
        <Button size="sm" onClick={() => { setForm(emptyForm); setIsCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> New Workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <div className="border rounded-lg p-6 text-center">
          <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No workflows yet. Create one to automate actions.</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {workflows.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-4 py-3">
              <div
                className="min-w-0 flex-1 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                onClick={() => setEditingWorkflow(w)}
              >
                <div className="flex items-center gap-2">
                  <Zap className={`h-4 w-4 ${w.isActive ? "text-amber-500" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">{w.name}</span>
                  {!w.isActive && <Badge variant="outline" className="text-xs">Paused</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{describeWorkflow(w)}</p>
                <div className="flex items-center gap-3 mt-1">
                  {w.executionCount > 0 && (
                    <span className="text-xs text-muted-foreground">Ran {w.executionCount}×</span>
                  )}
                  {w.lastExecutedAt && (
                    <span className="text-xs text-muted-foreground">
                      Last: {new Date(w.lastExecutedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={w.isActive} onCheckedChange={(checked) => handleToggleActive(w.id, checked)} />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => deleteWorkflow(w.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <WorkflowDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="New Workflow"
        form={form}
        onFormChange={setForm}
        sequences={sequences}
        onSave={handleCreate}
        saveLabel="Create Workflow"
      />

      {/* Edit Dialog */}
      <WorkflowDialog
        open={editingWorkflow !== null}
        onOpenChange={(open) => { if (!open) setEditingWorkflow(null) }}
        title="Edit Workflow"
        form={editForm}
        onFormChange={setEditForm}
        sequences={sequences}
        onSave={handleEdit}
        saveLabel="Save"
      />
    </div>
  )
}

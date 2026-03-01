"use client"

import { useState, useEffect } from "react"
import { useSequences, useSequenceSteps } from "@/hooks/use-sequences"
import { useTemplates } from "@/hooks/use-templates"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, ArrowRight, Phone, Mail, Clock, CheckSquare, Pause, X } from "lucide-react"
import type { Sequence, SequenceStep, SequenceStepType } from "@/lib/store"

// ─── Constants ───────────────────────────────────────────────────────────────

const stepTypeIcons: Record<SequenceStepType, React.ReactNode> = {
  call: <Phone className="h-4 w-4 text-blue-500" />,
  email: <Mail className="h-4 w-4 text-green-500" />,
  sms: <Mail className="h-4 w-4 text-purple-500" />,
  task: <CheckSquare className="h-4 w-4 text-orange-500" />,
  wait: <Pause className="h-4 w-4 text-muted-foreground" />,
}

const stepTypeLabels: Record<SequenceStepType, string> = {
  call: "Call",
  email: "Email",
  sms: "SMS",
  task: "Task",
  wait: "Wait",
}

const allowedStepTypes: SequenceStepType[] = ["call", "task", "wait"]

// ─── Step Config Form (per-type content fields) ─────────────────────────────

interface StepConfigFieldsProps {
  type: SequenceStepType
  config: Record<string, string>
  onChange: (config: Record<string, string>) => void
}

function ChecklistBuilder({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Checklist (SOP steps)</Label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
          <Input
            value={item}
            onChange={(e) => {
              const next = [...items]
              next[i] = e.target.value
              onChange(next)
            }}
            placeholder="e.g. Research company on LinkedIn"
            className="h-8 flex-1"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-600"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-full bg-transparent" onClick={() => onChange([...items, ""])}>
        <Plus className="h-3 w-3 mr-1" /> Add checklist item
      </Button>
    </div>
  )
}

function parseChecklistLabels(configChecklist: string | undefined): string[] {
  if (!configChecklist) return []
  try {
    const parsed = JSON.parse(configChecklist)
    if (Array.isArray(parsed)) return parsed.map((c: { label?: string }) => c.label ?? "")
    return []
  } catch {
    return []
  }
}

function serializeChecklist(labels: string[]): string {
  return JSON.stringify(labels.filter((l) => l.trim()).map((label) => ({ label, done: false })))
}

function StepConfigFields({ type, config, onChange }: StepConfigFieldsProps) {
  switch (type) {
    case "task": {
      const checklistItems = parseChecklistLabels(config.checklist)
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={config.title || ""}
              onChange={(e) => onChange({ ...config, title: e.target.value })}
              placeholder="Pre-call prep"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Textarea
              value={config.description || ""}
              onChange={(e) => onChange({ ...config, description: e.target.value })}
              placeholder="Brief context for the rep..."
              rows={2}
            />
          </div>
          <ChecklistBuilder
            items={checklistItems}
            onChange={(labels) => onChange({ ...config, checklist: serializeChecklist(labels) })}
          />
        </div>
      )
    }
    case "call":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Objective</Label>
            <Input
              value={config.objective || ""}
              onChange={(e) => onChange({ ...config, objective: e.target.value })}
              placeholder="Book a discovery call"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Talking Points</Label>
            <Textarea
              value={config.talkingPoints || ""}
              onChange={(e) => onChange({ ...config, talkingPoints: e.target.value })}
              placeholder="Key points to cover..."
              rows={3}
            />
          </div>
        </div>
      )
    default:
      return null
  }
}

// ─── Step summary for timeline ───────────────────────────────────────────────

function getStepSummary(step: SequenceStep): string | null {
  const cfg = step.config as Record<string, string> | undefined
  if (!cfg) return null

  switch (step.stepType) {
    case "task": {
      const title = cfg.title
      if (!title) return null
      let checklistCount = 0
      try {
        const parsed = JSON.parse(cfg.checklist || "[]")
        if (Array.isArray(parsed)) checklistCount = parsed.length
      } catch { /* ignore */ }
      return checklistCount > 0 ? `${title} \u00b7 ${checklistCount} item${checklistCount !== 1 ? "s" : ""}` : title
    }
    case "call":
      return cfg.objective || null
    default:
      return null
  }
}

// ─── Step form state helpers ─────────────────────────────────────────────────

interface StepForm {
  stepType: SequenceStepType
  delayDays: number
  templateId: string
  config: Record<string, string>
}

const emptyStepForm: StepForm = { stepType: "call", delayDays: 0, templateId: "", config: {} }

function stepToForm(step: SequenceStep): StepForm {
  const rawConfig = (step.config ?? {}) as Record<string, unknown>
  const config: Record<string, string> = {}
  for (const [k, v] of Object.entries(rawConfig)) {
    config[k] = typeof v === "string" ? v : JSON.stringify(v)
  }
  return {
    stepType: step.stepType,
    delayDays: step.delayDays,
    templateId: step.templateId ?? "",
    config,
  }
}

// ─── SequenceDetail ──────────────────────────────────────────────────────────

function SequenceStepCountBadge({ sequenceId }: { sequenceId: string }) {
  const { steps } = useSequenceSteps(sequenceId)
  if (steps.length === 0) return null
  return (
    <div className="flex items-center gap-1 mt-1">
      <Badge variant="outline" className="text-xs">{steps.length} step{steps.length !== 1 ? "s" : ""}</Badge>
    </div>
  )
}

function SequenceDetail({ sequence, onBack }: { sequence: Sequence; onBack: () => void }) {
  const { steps, addStep, updateStep, removeStep } = useSequenceSteps(sequence.id)
  const { templates } = useTemplates()

  // Add step dialog
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newStep, setNewStep] = useState<StepForm>(emptyStepForm)

  // Edit step dialog
  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null)
  const [editForm, setEditForm] = useState<StepForm>(emptyStepForm)

  useEffect(() => {
    if (editingStep) {
      setEditForm(stepToForm(editingStep))
    }
  }, [editingStep])

  const handleAddStep = async () => {
    await addStep({
      stepType: newStep.stepType,
      delayDays: newStep.delayDays,
      templateId: newStep.templateId || undefined,
      config: newStep.config,
    })
    setNewStep(emptyStepForm)
    setIsAddOpen(false)
  }

  const handleEditStep = async () => {
    if (!editingStep) return
    await updateStep(editingStep.id, {
      stepType: editForm.stepType,
      delayDays: editForm.delayDays,
      templateId: editForm.templateId || undefined,
      config: editForm.config,
    })
    setEditingStep(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7">&larr; Back</Button>
        <h3 className="text-lg font-semibold">{sequence.name}</h3>
      </div>
      {sequence.description && <p className="text-sm text-muted-foreground">{sequence.description}</p>}

      {/* Steps timeline */}
      <div className="space-y-1">
        {steps.map((step, i) => {
          const template = step.templateId ? templates.find((t) => t.id === step.templateId) : null
          const summary = getStepSummary(step)
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center bg-background">
                  {stepTypeIcons[step.stepType]}
                </div>
                {i < steps.length - 1 && <div className="w-0.5 h-8 bg-border" />}
              </div>
              <div
                className="flex-1 pt-1 cursor-pointer hover:bg-muted/50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
                onClick={() => setEditingStep(step)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-10">Step {i + 1}</span>
                    <span className="text-sm font-medium">{stepTypeLabels[step.stepType]}</span>
                    {step.delayDays > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-0.5" />
                        +{step.delayDays}d
                      </Badge>
                    )}
                    {template && (
                      <Badge variant="secondary" className="text-xs">{template.name}</Badge>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-red-600"
                    onClick={(e) => { e.stopPropagation(); removeStep(step.id) }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {summary && (
                  <p className="text-xs text-muted-foreground truncate max-w-sm mt-0.5">{summary}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Button variant="outline" className="w-full bg-transparent" onClick={() => setIsAddOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Add Step
      </Button>

      {/* Add Step Dialog */}
      <StepDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Add Step"
        form={newStep}
        onFormChange={setNewStep}
        templates={templates}
        onSave={handleAddStep}
        saveLabel="Add Step"
      />

      {/* Edit Step Dialog */}
      <StepDialog
        open={editingStep !== null}
        onOpenChange={(open) => { if (!open) setEditingStep(null) }}
        title="Edit Step"
        form={editForm}
        onFormChange={setEditForm}
        templates={templates}
        onSave={handleEditStep}
        saveLabel="Save"
      />
    </div>
  )
}

// ─── Shared Step Dialog ──────────────────────────────────────────────────────

interface StepDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  form: StepForm
  onFormChange: (form: StepForm | ((prev: StepForm) => StepForm)) => void
  templates: Array<{ id: string; name: string; category?: string }>
  onSave: () => void
  saveLabel: string
}

function StepDialog({ open, onOpenChange, title, form, onFormChange, templates, onSave, saveLabel }: StepDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Step type</Label>
            <Select
              value={form.stepType}
              onValueChange={(v) =>
                onFormChange((s) => ({ ...s, stepType: v as SequenceStepType, config: v === s.stepType ? s.config : {} }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allowedStepTypes.map((k) => (
                  <SelectItem key={k} value={k}>{stepTypeLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Delay (days after previous step)</Label>
            <Input
              type="number"
              min={0}
              value={form.delayDays}
              onChange={(e) => onFormChange((s) => ({ ...s, delayDays: parseInt(e.target.value) || 0 }))}
            />
          </div>
          {form.stepType === "call" && (
            <div className="space-y-2">
              <Label>Template (optional)</Label>
              <Select
                value={form.templateId || "none"}
                onValueChange={(v) => onFormChange((s) => ({ ...s, templateId: v === "none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="No template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.filter((t) => t.category === "call").map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <StepConfigFields
            type={form.stepType}
            config={form.config}
            onChange={(c) => onFormChange((s) => ({ ...s, config: c }))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>{saveLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── SequenceManager (list view) ─────────────────────────────────────────────

export function SequenceManager() {
  const { sequences, createSequence, updateSequence, deleteSequence } = useSequences()
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: "", description: "" })

  const handleCreate = async () => {
    const result = await createSequence(form)
    if (result) {
      setForm({ name: "", description: "" })
      setIsCreateOpen(false)
      setSelectedSequence(result)
    }
  }

  if (selectedSequence) {
    return <SequenceDetail sequence={selectedSequence} onBack={() => setSelectedSequence(null)} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sequences</h2>
          <p className="text-muted-foreground text-sm">Multi-step outreach cadences for your leads</p>
        </div>
        <Button onClick={() => { setForm({ name: "", description: "" }); setIsCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> New Sequence
        </Button>
      </div>

      {sequences.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <ArrowRight className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No sequences yet. Create one to define multi-step outreach plans.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sequences.map((seq) => (
            <Card key={seq.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedSequence(seq)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{seq.name}</p>
                    <Badge variant={seq.isActive ? "default" : "secondary"} className="text-xs">
                      {seq.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  {seq.description && <p className="text-sm text-muted-foreground mt-0.5">{seq.description}</p>}
                  <SequenceStepCountBadge sequenceId={seq.id} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={seq.isActive}
                    onCheckedChange={(checked) => { updateSequence(seq.id, { isActive: checked }) }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-red-600"
                    onClick={(e) => { e.stopPropagation(); deleteSequence(seq.id) }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Sequence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="New Lead Cadence" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="5-step outreach over 2 weeks" rows={2} />
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

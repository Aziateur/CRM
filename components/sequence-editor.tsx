"use client"

import { useState } from "react"
import { useSequences, useSequenceSteps } from "@/hooks/use-sequences"
import { useTemplates } from "@/hooks/use-templates"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, ArrowRight, Phone, Mail, Clock, CheckSquare, Pause } from "lucide-react"
import type { Sequence, SequenceStepType } from "@/lib/store"

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

function SequenceDetail({ sequence, onBack }: { sequence: Sequence; onBack: () => void }) {
  const { steps, addStep, removeStep } = useSequenceSteps(sequence.id)
  const { templates } = useTemplates()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newStep, setNewStep] = useState({ stepType: "call" as SequenceStepType, delayDays: 0, templateId: "" })

  const handleAddStep = async () => {
    await addStep({
      stepType: newStep.stepType,
      delayDays: newStep.delayDays,
      templateId: newStep.templateId || undefined,
    })
    setNewStep({ stepType: "call", delayDays: 0, templateId: "" })
    setIsAddOpen(false)
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
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center bg-background">
                  {stepTypeIcons[step.stepType]}
                </div>
                {i < steps.length - 1 && <div className="w-0.5 h-8 bg-border" />}
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-600" onClick={() => removeStep(step.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Button variant="outline" className="w-full bg-transparent" onClick={() => setIsAddOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Add Step
      </Button>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Step</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Step type</Label>
              <Select value={newStep.stepType} onValueChange={(v) => setNewStep((s) => ({ ...s, stepType: v as SequenceStepType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(stepTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delay (days after previous step)</Label>
              <Input type="number" min={0} value={newStep.delayDays} onChange={(e) => setNewStep((s) => ({ ...s, delayDays: parseInt(e.target.value) || 0 }))} />
            </div>
            {(newStep.stepType === "call" || newStep.stepType === "email") && (
              <div className="space-y-2">
                <Label>Template (optional)</Label>
                <Select value={newStep.templateId || "none"} onValueChange={(v) => setNewStep((s) => ({ ...s, templateId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="No template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.filter((t) => t.category === newStep.stepType).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStep}>Add Step</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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

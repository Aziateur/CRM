"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useProjectId } from "@/hooks/use-project-id"
import { useTasks } from "@/hooks/use-tasks"
import { usePipelineStages } from "@/hooks/use-pipeline-stages"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import { DynamicFieldRenderer } from "@/components/dynamic-field-renderer"
import { TagToggle } from "@/components/tag-manager"
import { SequenceEnrollmentWidget } from "@/components/sequence-enrollment"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  Plus,
  Phone,
  FileText,
  Mic,
  Trash2,
  ChevronRight,
  X,
  AlertCircle,
  Star,
  HelpCircle,
  Target,
  Check,
  Clock,
} from "lucide-react"
import {
  segmentOptions,
  contactRoleOptions,
  constraintOptions,
  type Lead,
  type Attempt,
  type Contact,
  type ContactRole,
  type ConstraintOption,
} from "@/lib/store"
import { getOutcomeColor } from "@/components/leads-table"
import { InteractionsTimeline } from "@/components/interactions-timeline"
import { saveLeadField, SaveIndicator } from "@/lib/auto-save"

function timeSince(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  if (diffHours < 1) return "Just now"
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "1 day ago"
  return `${diffDays} days ago`
}

const validObjectiveVerbs = ["Confirm", "Disqualify", "Book", "Identify", "Test"]

const taskTypeLabels: Record<string, string> = {
  call_back: "Call",
  follow_up: "Follow up",
  meeting: "Meeting",
  email: "Email",
  custom: "Task",
}

interface LeadDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead | null
  attempts: Attempt[]
  onLeadUpdated: (lead: Lead) => void
  onLogAttempt: () => void
  onViewAttempt: (attempt: Attempt) => void
  onCall?: () => void
}

export function LeadDrawer({
  open,
  onOpenChange,
  lead,
  attempts,
  onLeadUpdated,
  onLogAttempt,
  onViewAttempt,
  onCall,
}: LeadDrawerProps) {
  const { toast } = useToast()
  const projectId = useProjectId()
  const { stages } = usePipelineStages()
  const { fields: fieldDefinitions } = useFieldDefinitions("lead")
  const { tasks, completeTask } = useTasks({ leadId: lead?.id })
  const [editedLead, setEditedLead] = useState<Lead | null>(null)
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [newContact, setNewContact] = useState({ name: "", phone: "", role: "Other" as ContactRole })
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  // Note handler passed to InteractionsTimeline
  const handleAddNote = async (text: string) => {
    const supabase = getSupabase()
    await supabase.from("lead_activities").insert([{
      lead_id: lead!.id,
      activity_type: "note",
      title: "Note",
      description: text,
    }])
  }

  // Sync editedLead when switching to a different lead
  useEffect(() => {
    if (lead) {
      setEditedLead({ ...lead })
      setSaveStatus("idle")
    }
  }, [lead?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentLead = editedLead && editedLead.id === lead?.id ? editedLead : lead

  const leadAttempts = lead
    ? attempts
      .filter((a) => a.leadId === lead.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : []
  const lastAttempt = leadAttempts[0] || null

  const objectiveIsValid = currentLead?.nextCallObjective
    ? validObjectiveVerbs.some((v) => currentLead.nextCallObjective?.startsWith(v))
    : false

  // Auto-save a single field on blur
  const autoSave = async (field: string, value: unknown) => {
    if (!editedLead) return
    setSaveStatus("saving")
    const ok = await saveLeadField(editedLead.id, field, value)
    if (ok) {
      const updatedLead = { ...editedLead }
      onLeadUpdated(updatedLead)
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000)
    } else {
      setSaveStatus("error")
      toast({ variant: "destructive", title: "Auto-save failed" })
    }
  }

  const handleStageChange = async (newStage: string) => {
    if (!editedLead) return
    const stage = stages.find((s) => s.name === newStage)
    const updated = {
      ...editedLead,
      stage: newStage,
      stageChangedAt: new Date().toISOString(),
      closeProbability: stage?.defaultProbability ?? editedLead.closeProbability,
    }
    setEditedLead(updated)

    // Persist immediately (stage changes shouldn't require clicking Save)
    const supabase = getSupabase()
    const { error } = await supabase
      .from("leads")
      .update({
        stage: newStage,
        stage_changed_at: updated.stageChangedAt,
        close_probability: updated.closeProbability ?? null,
      })
      .eq("id", editedLead.id)

    if (!error) {
      onLeadUpdated(updated)
    }
  }

  const handleCustomFieldChange = async (fieldKey: string, value: unknown) => {
    if (!editedLead) return
    const newCustomFields = { ...(editedLead.customFields || {}), [fieldKey]: value }
    setEditedLead({ ...editedLead, customFields: newCustomFields })
    await autoSave("custom_fields", newCustomFields)
  }

  const handleAddContact = async () => {
    if (!editedLead || !newContact.name) return

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("contacts")
      .insert([{ lead_id: editedLead.id, name: newContact.name, phone: newContact.phone || null, role: newContact.role, project_id: projectId }])
      .select()
      .single()

    if (data) {
      const contact: Contact = { id: data.id, name: data.name, phone: data.phone, role: data.role }
      const updated = { ...editedLead, contacts: [...editedLead.contacts, contact] }
      setEditedLead(updated)
      onLeadUpdated(updated)
      setNewContact({ name: "", phone: "", role: "Other" })
      setIsAddContactOpen(false)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!editedLead) return
    const supabase = getSupabase()
    const { error } = await supabase.from("contacts").delete().eq("id", contactId)
    if (error) return
    const updated = { ...editedLead, contacts: editedLead.contacts.filter((c) => c.id !== contactId) }
    setEditedLead(updated)
    onLeadUpdated(updated)
  }

  const handleSetPrimaryContact = async (contactId: string) => {
    if (!editedLead) return
    const contact = editedLead.contacts.find((c) => c.id === contactId)
    if (!contact) return
    const reordered = [contact, ...editedLead.contacts.filter((c) => c.id !== contactId)]
    setEditedLead({ ...editedLead, contacts: reordered })
    // Persist to DB
    const supabase = getSupabase()
    // Clear old primary, set new
    await supabase.from("contacts").update({ is_primary: false }).eq("lead_id", editedLead.id)
    await supabase.from("contacts").update({ is_primary: true }).eq("id", contactId)
  }

  const handleRemoveFact = async (index: number) => {
    if (!editedLead) return
    const newFacts = [...(editedLead.confirmedFacts || [])]
    newFacts.splice(index, 1)
    setEditedLead({ ...editedLead, confirmedFacts: newFacts })
    await autoSave("confirmed_facts", newFacts)
  }

  const handleRemoveQuestion = async (index: number) => {
    if (!editedLead) return
    const newQs = [...(editedLead.openQuestions || [])]
    newQs.splice(index, 1)
    setEditedLead({ ...editedLead, openQuestions: newQs })
    await autoSave("open_questions", newQs)
  }

  const handleToggleConstraint = async (constraint: ConstraintOption) => {
    if (!editedLead) return
    const current = editedLead.constraints || []
    const newConstraints = current.includes(constraint)
      ? current.filter((c) => c !== constraint)
      : [...current, constraint]
    setEditedLead({ ...editedLead, constraints: newConstraints })
    await autoSave("constraints", newConstraints)
  }

  const ed = editedLead || lead
  if (!ed) return null

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[90vw] p-0 flex flex-col">
          {/* HEADER */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{ed.company}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{ed.segment}</Badge>
                  <TagToggle leadId={ed.id} />
                  {/* Stage selector */}
                  <Select value={ed.stage || "New"} onValueChange={handleStageChange}>
                    <SelectTrigger className="h-6 w-auto text-xs gap-1 border-0 px-2" style={{ color: stages.find((s) => s.name === (ed.stage || "New"))?.color }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ed.phone && onCall && (
                  <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={onCall}>
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                )}
                <Button size="sm" variant="outline" className="bg-transparent" onClick={onLogAttempt}>
                  Log Attempt
                </Button>
                <SaveIndicator status={saveStatus} />
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
<div className="p-6 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

    {/* COLUMN 1: STRATEGY & REALITY */}
    <div className="space-y-6">
        {/* ACCOUNT REALITY CARD */}
        <Card className={!ed.nextCallObjective ? "border-amber-500" : ""}>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-sm font-medium">Account Reality</CardTitle>
                    <Tooltip>
                        <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs">Map the customer's reality. What do we know (Facts), what don't we know (Open Questions), and what's the next move?</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Confirmed Facts</Label>
                        <span className="text-xs text-muted-foreground">{(ed.confirmedFacts || []).length}/5</span>
                    </div>
                    <div className="space-y-2">
                        {(ed.confirmedFacts || []).map((fact, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-sm">•</span>
                                <Input value={fact} onChange={(e) => { const nf = [...(ed.confirmedFacts || [])]; nf[i] = e.target.value.slice(0, 120); setEditedLead({ ...ed, confirmedFacts: nf }) }} onBlur={() => autoSave("confirmed_facts", ed.confirmedFacts)} maxLength={120} className="flex-1" />
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveFact(i)}><X className="h-4 w-4" /></Button>
                            </div>
                        ))}
                        {(ed.confirmedFacts || []).length < 5 && (
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setEditedLead({ ...ed, confirmedFacts: [...(ed.confirmedFacts || []), ""] })}>
                                <Plus className="h-4 w-4 mr-1" /> Add Fact
                            </Button>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Open Questions */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Open Questions</Label>
                        <span className="text-xs text-muted-foreground">{(ed.openQuestions || []).length}/3</span>
                    </div>
                    <div className="space-y-2">
                        {(ed.openQuestions || []).map((q, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-sm">•</span>
                                <Input value={q} onChange={(e) => { const nq = [...(ed.openQuestions || [])]; nq[i] = e.target.value.slice(0, 120); setEditedLead({ ...ed, openQuestions: nq }) }} onBlur={() => autoSave("open_questions", ed.openQuestions)} placeholder="Do they... / Can they... / Will they..." maxLength={120} className="flex-1" />
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveQuestion(i)}><X className="h-4 w-4" /></Button>
                            </div>
                        ))}
                        {(ed.openQuestions || []).length < 3 && (
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setEditedLead({ ...ed, openQuestions: [...(ed.openQuestions || []), ""] })}>
                                <Plus className="h-4 w-4 mr-1" /> Add Question
                            </Button>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Next Call Objective */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            Next Call Objective
                            {!ed.nextCallObjective && <AlertCircle className="h-4 w-4 text-amber-500" />}
                        </Label>
                    </div>
                    <div className="space-y-1">
                        <Input value={ed.nextCallObjective || ""} onChange={(e) => setEditedLead({ ...ed, nextCallObjective: e.target.value })} onBlur={() => autoSave("next_call_objective", ed.nextCallObjective)} placeholder="Confirm whether fuel contracts renew quarterly or annually." className={!objectiveIsValid && ed.nextCallObjective ? "border-amber-500" : ""} />
                        <p className="text-xs text-muted-foreground">Must start with: Confirm, Disqualify, Book, Identify, or Test</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>

    {/* COLUMN 2: EXECUTION & CONTEXT */}
    <div className="space-y-6">
        {/* PENDING TASKS */}
        {tasks.length > 0 && (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        Pending Tasks ({tasks.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {tasks.map((task) => {
                            const isOverdue = new Date(task.dueAt) < new Date(new Date().toDateString())
                            return (
                                <div key={task.id} className={`flex items-center justify-between p-2 rounded border ${isOverdue ? "border-red-200 bg-red-50" : ""}`}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">{taskTypeLabels[task.type] ?? task.type}</Badge>
                                            <span className="text-sm">{task.title}</span>
                                        </div>
                                        <span className={`text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                                            Due: {new Date(task.dueAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => completeTask(task.id)}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        )}

        {/* LEAD INFO */}
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Lead Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    <div>
                        <Label className="text-xs text-muted-foreground">Segment</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" value={ed.segment} onChange={(e) => { setEditedLead({ ...ed, segment: e.target.value }); autoSave("segment", e.target.value) }}>
                            {segmentOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">Decision Maker?</Label>
                        <div className="flex gap-1 mt-1">
                            {(["yes", "no", "unknown"] as const).map((v) => (
                                <Button key={v} type="button" size="sm" variant={ed.isDecisionMaker === v ? "default" : "outline"} className={`px-2 ${ed.isDecisionMaker === v ? "" : "bg-transparent"}`} onClick={() => { setEditedLead({ ...ed, isDecisionMaker: v }); autoSave("is_decision_maker", v) }}>
                                    {v === "yes" ? "Yes" : v === "no" ? "No" : "?"}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">Fleet Owner?</Label>
                        <div className="flex gap-1 mt-1">
                            {(["yes", "no", "unknown"] as const).map((v) => (
                                <Button key={v} type="button" size="sm" variant={ed.isFleetOwner === v ? "default" : "outline"} className={`px-2 ${ed.isFleetOwner === v ? "" : "bg-transparent"}`} onClick={() => { setEditedLead({ ...ed, isFleetOwner: v }); autoSave("is_fleet_owner", v) }}>
                                    {v === "yes" ? "Yes" : v === "no" ? "No" : "?"}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <Label className="text-xs text-muted-foreground">Operational Context</Label>
                    <Textarea value={ed.operationalContext || ""} onChange={(e) => setEditedLead({ ...ed, operationalContext: e.target.value })} onBlur={() => autoSave("operational_context", ed.operationalContext)} placeholder="Facts about their operating environment, not opinions." className="mt-1" rows={2} />
                </div>

                <div>
                    <Label className="text-xs text-muted-foreground">Constraints</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {constraintOptions.map((c) => (
                            <Badge key={c} variant={(ed.constraints || []).includes(c) ? "default" : "outline"} className="cursor-pointer" onClick={() => handleToggleConstraint(c)}>{c}</Badge>
                        ))}
                    </div>
                    <Input value={ed.constraintOther || ""} onChange={(e) => setEditedLead({ ...ed, constraintOther: e.target.value })} onBlur={() => autoSave("constraint_other", ed.constraintOther)} placeholder="Other constraint..." className="mt-2" />
                </div>

                <div>
                    <Label className="text-xs text-muted-foreground">Opportunity Angle</Label>
                    <Input value={ed.opportunityAngle || ""} onChange={(e) => setEditedLead({ ...ed, opportunityAngle: e.target.value.slice(0, 100) })} onBlur={() => autoSave("opportunity_angle", ed.opportunityAngle)} placeholder="One-sentence reason this product could matter to them." className="mt-1" maxLength={100} />
                </div>

                <div>
                    <Label className="text-xs text-muted-foreground">Deal Value</Label>
                    <Input type="number" value={ed.dealValue ?? ""} onChange={(e) => setEditedLead({ ...ed, dealValue: e.target.value ? Number(e.target.value) : undefined })} onBlur={() => autoSave("deal_value", ed.dealValue ?? null)} placeholder="0.00" className="mt-1" />
                </div>

                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="advanced" className="border-none">
                        <AccordionTrigger className="text-xs text-muted-foreground py-2">Advanced</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3">
                                {(["website", "email", "address", "leadSource"] as const).map((field) => {
                                    const label = field === "leadSource" ? "Lead Source" : field.charAt(0).toUpperCase() + field.slice(1)
                                    const dbField = field === "leadSource" ? "lead_source" : field
                                    return (
                                        <div key={field}>
                                            <Label className="text-xs text-muted-foreground">{label}</Label>
                                            <Input value={(ed[field] as string) || ""} onChange={(e) => setEditedLead({ ...ed, [field]: e.target.value })} onBlur={() => autoSave(dbField, ed[field])} className="mt-1" />
                                        </div>
                                    )
                                })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>

        {/* CUSTOM FIELDS */}
        {fieldDefinitions.length > 0 && (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Custom Fields</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {fieldDefinitions.map((field) => (
                        <DynamicFieldRenderer
                            key={field.id}
                            field={field}
                            value={ed.customFields?.[field.fieldKey] ?? null}
                            onChange={(val) => handleCustomFieldChange(field.fieldKey, val)}
                            readOnly={false}
                        />
                    ))}
                </CardContent>
            </Card>
        )}

        {/* CONTACTS */}
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Contacts</CardTitle>
                    <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setIsAddContactOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {ed.contacts.length > 0 ? (
                    <div className="space-y-2">
                        {ed.contacts.map((contact, i) => (
                            <div key={contact.id} className="flex items-center justify-between p-2 rounded border">
                                <div className="flex items-center gap-3">
                                    <Button size="icon" variant="ghost" className={i === 0 ? "text-amber-500" : "text-muted-foreground"} onClick={() => handleSetPrimaryContact(contact.id)}>
                                        <Star className={`h-4 w-4 ${i === 0 ? "fill-current" : ""}`} />
                                    </Button>
                                    <div>
                                        <p className="text-sm font-medium">{contact.name}</p>
                                        {contact.phone && <a href={`tel:${contact.phone}`} className="text-xs text-primary hover:underline">{contact.phone}</a>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {contactRoleOptions.map((role) => (
                                            <Button key={role} size="sm" variant={contact.role === role ? "default" : "outline"} className={contact.role === role ? "" : "bg-transparent"} onClick={async () => {
                                                const nc = [...ed.contacts]; nc[i] = { ...contact, role }; setEditedLead({ ...ed, contacts: nc })
                                                const supabase = getSupabase()
                                                await supabase.from("contacts").update({ role }).eq("id", contact.id)
                                            }}>{role}</Button>
                                        ))}
                                    </div>
                                    <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-red-600" onClick={() => handleDeleteContact(contact.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No contacts yet</p>
                )}
            </CardContent>
        </Card>
    </div>

    {/* COLUMN 3: HISTORY & ENGAGEMENT */}
    <div className="space-y-6">
        {/* LAST ATTEMPT (Quick Glance) */}
        {lastAttempt ? (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Last Attempt</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center mb-2">
                        <Badge className={getOutcomeColor(lastAttempt.outcome)} variant="secondary">{lastAttempt.outcome}</Badge>
                        <span className="text-xs text-muted-foreground">{timeSince(lastAttempt.timestamp)}</span>
                    </div>
                    {lastAttempt.note && <p className="text-sm text-muted-foreground italic mb-2">"{lastAttempt.note}"</p>}
                    <div className="flex items-center gap-4 text-xs">
                        {lastAttempt.dmReached && <span className="flex items-center gap-1 text-green-600"><Check className="h-3 w-3" /> DM Reached</span>}
                        {lastAttempt.nextAction && <span>Next: {lastAttempt.nextAction}</span>}
                        {(lastAttempt.transcript?.length || lastAttempt.callTranscriptText) && <FileText className="h-4 w-4 text-muted-foreground" />}
                    </div>
                </CardContent>
            </Card>
        ) : (
            <Card className="bg-muted/30">
                <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground text-center">No attempts yet</p>
                </CardContent>
            </Card>
        )}

        {/* UNIFIED INTERACTIONS TIMELINE */}
        <InteractionsTimeline
            leadId={ed.id}
            attempts={leadAttempts}
            onViewAttempt={onViewAttempt}
            onAddNote={handleAddNote}
        />

        {/* SEQUENCES */}
        <SequenceEnrollmentWidget leadId={ed.id} />
    </div>
</div>

          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ADD CONTACT MODAL */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="Contact name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="+1 555-0100" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex gap-2">
                {contactRoleOptions.map((role) => (
                  <Button key={role} type="button" variant={newContact.role === role ? "default" : "outline"} className={newContact.role === role ? "" : "bg-transparent"} size="sm" onClick={() => setNewContact({ ...newContact, role })}>{role}</Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setIsAddContactOpen(false)}>Cancel</Button>
            <Button onClick={handleAddContact} disabled={!newContact.name}>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

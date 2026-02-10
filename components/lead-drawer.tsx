"use client"

import { useState } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
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
  Edit3,
  Save,
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
import { CallsPanel } from "@/components/CallsPanel"
import { useLeadActivities } from "@/hooks/use-lead-activities"
import { MessageSquare, Send } from "lucide-react"

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
  const { stages } = usePipelineStages()
  const { fields: fieldDefinitions } = useFieldDefinitions("lead")
  const { tasks, completeTask } = useTasks({ leadId: lead?.id })
  const [isEditing, setIsEditing] = useState(false)
  const [editedLead, setEditedLead] = useState<Lead | null>(null)
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [newContact, setNewContact] = useState({ name: "", phone: "", role: "Other" as ContactRole })
  const { activities, addNote } = useLeadActivities(lead?.id ?? null)
  const [noteText, setNoteText] = useState("")

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    await addNote(noteText)
    setNoteText("")
  }

  // Sync editedLead when lead changes
  const currentLead = editedLead && editedLead.id === lead?.id ? editedLead : lead
  if (lead && (!editedLead || editedLead.id !== lead.id)) {
    queueMicrotask(() => {
      setEditedLead({ ...lead })
      setIsEditing(false)
    })
  }

  const leadAttempts = lead
    ? attempts
        .filter((a) => a.leadId === lead.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : []
  const lastAttempt = leadAttempts[0] || null

  const objectiveIsValid = currentLead?.nextCallObjective
    ? validObjectiveVerbs.some((v) => currentLead.nextCallObjective?.startsWith(v))
    : false

  const handleSave = async () => {
    if (!editedLead) return

    const supabase = getSupabase()
    const { error } = await supabase
      .from("leads")
      .update({
        company: editedLead.company,
        phone: editedLead.phone,
        segment: editedLead.segment,
        is_decision_maker: editedLead.isDecisionMaker,
        is_fleet_owner: editedLead.isFleetOwner,
        operational_context: editedLead.operationalContext,
        confirmed_facts: editedLead.confirmedFacts,
        open_questions: editedLead.openQuestions,
        next_call_objective: editedLead.nextCallObjective,
        constraints: editedLead.constraints,
        constraint_other: editedLead.constraintOther,
        opportunity_angle: editedLead.opportunityAngle,
        website: editedLead.website,
        email: editedLead.email,
        address: editedLead.address,
        lead_source: editedLead.leadSource,
        stage: editedLead.stage,
        deal_value: editedLead.dealValue ?? null,
        custom_fields: editedLead.customFields ?? {},
      })
      .eq("id", editedLead.id)

    if (error) {
      toast({ variant: "destructive", title: "Failed to save", description: error.message })
      return
    }

    onLeadUpdated(editedLead)
    setIsEditing(false)
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

  const handleCustomFieldChange = (fieldKey: string, value: unknown) => {
    if (!editedLead) return
    setEditedLead({
      ...editedLead,
      customFields: { ...(editedLead.customFields || {}), [fieldKey]: value },
    })
  }

  const handleAddContact = async () => {
    if (!editedLead || !newContact.name) return

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("contacts")
      .insert([{ lead_id: editedLead.id, name: newContact.name, phone: newContact.phone || null, role: newContact.role }])
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

  const handleSetPrimaryContact = (contactId: string) => {
    if (!editedLead) return
    const contact = editedLead.contacts.find((c) => c.id === contactId)
    if (!contact) return
    setEditedLead({ ...editedLead, contacts: [contact, ...editedLead.contacts.filter((c) => c.id !== contactId)] })
  }

  const handleRemoveFact = (index: number) => {
    if (!editedLead) return
    const newFacts = [...(editedLead.confirmedFacts || [])]
    newFacts.splice(index, 1)
    setEditedLead({ ...editedLead, confirmedFacts: newFacts })
  }

  const handleRemoveQuestion = (index: number) => {
    if (!editedLead) return
    const newQs = [...(editedLead.openQuestions || [])]
    newQs.splice(index, 1)
    setEditedLead({ ...editedLead, openQuestions: newQs })
  }

  const handleToggleConstraint = (constraint: ConstraintOption) => {
    if (!editedLead) return
    const current = editedLead.constraints || []
    if (current.includes(constraint)) {
      setEditedLead({ ...editedLead, constraints: current.filter((c) => c !== constraint) })
    } else {
      setEditedLead({ ...editedLead, constraints: [...current, constraint] })
    }
  }

  const ed = editedLead || lead
  if (!ed) return null

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
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
                {isEditing ? (
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* LAST ATTEMPT SUMMARY */}
              {lastAttempt ? (
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Last Attempt</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getOutcomeColor(lastAttempt.outcome)} variant="secondary">{lastAttempt.outcome}</Badge>
                        {lastAttempt.why && <span className="text-sm text-muted-foreground">Why: {lastAttempt.why}</span>}
                        {lastAttempt.repMistake && <span className="text-sm text-red-600">Mistake: {lastAttempt.repMistake}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {lastAttempt.recordingUrl && <Mic className="h-4 w-4 text-muted-foreground" />}
                        {(lastAttempt.transcript?.length || lastAttempt.callTranscriptText) && <FileText className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm text-muted-foreground">{timeSince(lastAttempt.timestamp)}</span>
                      </div>
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

              {/* CALLS PANEL */}
              <CallsPanel leadId={ed.id} phone={ed.phone} />

              {/* ACCOUNT REALITY CARD */}
              <Card className={!ed.nextCallObjective ? "border-amber-500" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Account Reality
                    </CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>The single source of truth about this account. Only facts you would bet money on.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Confirmed Facts */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Confirmed Facts</Label>
                      <span className="text-xs text-muted-foreground">{(ed.confirmedFacts || []).length}/5</span>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        {(ed.confirmedFacts || []).map((fact, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-sm">•</span>
                            <Input value={fact} onChange={(e) => { const nf = [...(ed.confirmedFacts || [])]; nf[i] = e.target.value.slice(0, 120); setEditedLead({ ...ed, confirmedFacts: nf }) }} maxLength={120} className="flex-1" />
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveFact(i)}><X className="h-4 w-4" /></Button>
                          </div>
                        ))}
                        {(ed.confirmedFacts || []).length < 5 && (
                          <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setEditedLead({ ...ed, confirmedFacts: [...(ed.confirmedFacts || []), ""] })}>
                            <Plus className="h-4 w-4 mr-1" /> Add Fact
                          </Button>
                        )}
                      </div>
                    ) : (
                      <ul className="space-y-1">
                        {(ed.confirmedFacts || []).length > 0
                          ? ed.confirmedFacts?.map((fact, i) => (
                              <li key={i} className="text-sm flex items-start gap-2"><span className="text-muted-foreground">•</span><span>{fact}</span></li>
                            ))
                          : <li className="text-sm text-muted-foreground italic">No confirmed facts yet</li>}
                      </ul>
                    )}
                  </div>

                  <Separator />

                  {/* Open Questions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Open Questions</Label>
                      <span className="text-xs text-muted-foreground">{(ed.openQuestions || []).length}/3</span>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        {(ed.openQuestions || []).map((q, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-sm">•</span>
                            <Input value={q} onChange={(e) => { const nq = [...(ed.openQuestions || [])]; nq[i] = e.target.value.slice(0, 120); setEditedLead({ ...ed, openQuestions: nq }) }} placeholder="Do they... / Can they... / Will they..." maxLength={120} className="flex-1" />
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveQuestion(i)}><X className="h-4 w-4" /></Button>
                          </div>
                        ))}
                        {(ed.openQuestions || []).length < 3 && (
                          <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setEditedLead({ ...ed, openQuestions: [...(ed.openQuestions || []), ""] })}>
                            <Plus className="h-4 w-4 mr-1" /> Add Question
                          </Button>
                        )}
                      </div>
                    ) : (
                      <ul className="space-y-1">
                        {(ed.openQuestions || []).length > 0
                          ? ed.openQuestions?.map((q, i) => (
                              <li key={i} className="text-sm flex items-start gap-2"><span className="text-muted-foreground">•</span><span>{q}</span></li>
                            ))
                          : <li className="text-sm text-muted-foreground italic">No open questions yet</li>}
                      </ul>
                    )}
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
                    {isEditing ? (
                      <div className="space-y-1">
                        <Input value={ed.nextCallObjective || ""} onChange={(e) => setEditedLead({ ...ed, nextCallObjective: e.target.value })} placeholder="Confirm whether fuel contracts renew quarterly or annually." className={!objectiveIsValid && ed.nextCallObjective ? "border-amber-500" : ""} />
                        <p className="text-xs text-muted-foreground">Must start with: Confirm, Disqualify, Book, Identify, or Test</p>
                      </div>
                    ) : (
                      <p className={`text-sm ${!ed.nextCallObjective ? "text-amber-500 italic" : ""}`}>
                        {ed.nextCallObjective || "No objective set - click Edit to add one"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* LEAD INFO */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Lead Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Segment</Label>
                      {isEditing ? (
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" value={ed.segment} onChange={(e) => setEditedLead({ ...ed, segment: e.target.value })}>
                          {segmentOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <p className="text-sm mt-1">{ed.segment}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Decision Maker?</Label>
                      {isEditing ? (
                        <div className="flex gap-1 mt-1">
                          {(["yes", "no", "unknown"] as const).map((v) => (
                            <Button key={v} type="button" size="sm" variant={ed.isDecisionMaker === v ? "default" : "outline"} className={ed.isDecisionMaker === v ? "" : "bg-transparent"} onClick={() => setEditedLead({ ...ed, isDecisionMaker: v })}>
                              {v === "yes" ? "Yes" : v === "no" ? "No" : "?"}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm mt-1 capitalize">{ed.isDecisionMaker || "Unknown"}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Fleet Owner?</Label>
                      {isEditing ? (
                        <div className="flex gap-1 mt-1">
                          {(["yes", "no", "unknown"] as const).map((v) => (
                            <Button key={v} type="button" size="sm" variant={ed.isFleetOwner === v ? "default" : "outline"} className={ed.isFleetOwner === v ? "" : "bg-transparent"} onClick={() => setEditedLead({ ...ed, isFleetOwner: v })}>
                              {v === "yes" ? "Yes" : v === "no" ? "No" : "?"}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm mt-1 capitalize">{ed.isFleetOwner || "Unknown"}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Operational Context</Label>
                    {isEditing ? (
                      <Textarea value={ed.operationalContext || ""} onChange={(e) => setEditedLead({ ...ed, operationalContext: e.target.value })} placeholder="Facts about their operating environment, not opinions." className="mt-1" rows={2} />
                    ) : (
                      <p className="text-sm mt-1 text-muted-foreground">{ed.operationalContext || "-"}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Constraints</Label>
                    {isEditing ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {constraintOptions.map((c) => (
                          <Badge key={c} variant={(ed.constraints || []).includes(c) ? "default" : "outline"} className="cursor-pointer" onClick={() => handleToggleConstraint(c)}>{c}</Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(ed.constraints || []).length > 0
                          ? ed.constraints?.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)
                          : <span className="text-sm text-muted-foreground">-</span>}
                      </div>
                    )}
                    {isEditing && (
                      <Input value={ed.constraintOther || ""} onChange={(e) => setEditedLead({ ...ed, constraintOther: e.target.value })} placeholder="Other constraint..." className="mt-2" />
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Opportunity Angle</Label>
                    {isEditing ? (
                      <Input value={ed.opportunityAngle || ""} onChange={(e) => setEditedLead({ ...ed, opportunityAngle: e.target.value.slice(0, 100) })} placeholder="One-sentence reason this product could matter to them." className="mt-1" maxLength={100} />
                    ) : (
                      <p className="text-sm mt-1 text-muted-foreground">{ed.opportunityAngle || "-"}</p>
                    )}
                  </div>

                  {/* Deal Value (pipeline) */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Deal Value</Label>
                    {isEditing ? (
                      <Input type="number" value={ed.dealValue ?? ""} onChange={(e) => setEditedLead({ ...ed, dealValue: e.target.value ? Number(e.target.value) : undefined })} placeholder="0.00" className="mt-1" />
                    ) : (
                      <p className="text-sm mt-1 text-muted-foreground">{ed.dealValue != null ? `$${ed.dealValue.toLocaleString()}` : "-"}</p>
                    )}
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="advanced" className="border-none">
                      <AccordionTrigger className="text-xs text-muted-foreground py-2">Advanced</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {(["website", "email", "address", "leadSource"] as const).map((field) => {
                            const label = field === "leadSource" ? "Lead Source" : field.charAt(0).toUpperCase() + field.slice(1)
                            return (
                              <div key={field}>
                                <Label className="text-xs text-muted-foreground">{label}</Label>
                                {isEditing ? (
                                  <Input value={(ed[field] as string) || ""} onChange={(e) => setEditedLead({ ...ed, [field]: e.target.value })} className="mt-1" />
                                ) : (
                                  <p className="text-sm mt-1">{(ed[field] as string) || "-"}</p>
                                )}
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
                        readOnly={!isEditing}
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
                    {isEditing && (
                      <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setIsAddContactOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {ed.contacts.length > 0 ? (
                    <div className="space-y-2">
                      {ed.contacts.map((contact, i) => (
                        <div key={contact.id} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex items-center gap-3">
                            <Button size="icon" variant="ghost" className={i === 0 ? "text-amber-500" : "text-muted-foreground"} onClick={() => isEditing && handleSetPrimaryContact(contact.id)} disabled={!isEditing}>
                              <Star className={`h-4 w-4 ${i === 0 ? "fill-current" : ""}`} />
                            </Button>
                            <div>
                              <p className="text-sm font-medium">{contact.name}</p>
                              {contact.phone && <a href={`tel:${contact.phone}`} className="text-xs text-primary hover:underline">{contact.phone}</a>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <div className="flex gap-1">
                                {contactRoleOptions.map((role) => (
                                  <Button key={role} size="sm" variant={contact.role === role ? "default" : "outline"} className={contact.role === role ? "" : "bg-transparent"} onClick={() => {
                                    const nc = [...ed.contacts]; nc[i] = { ...contact, role }; setEditedLead({ ...ed, contacts: nc })
                                  }}>{role}</Button>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="outline">{contact.role}</Badge>
                            )}
                            {isEditing && (
                              <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-red-600" onClick={() => handleDeleteContact(contact.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No contacts yet</p>
                  )}
                </CardContent>
              </Card>

              {/* NOTES & ACTIVITY */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4" />
                    Notes & Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
                      placeholder="Add a note..."
                      className="flex-1"
                    />
                    <Button size="icon" variant="ghost" onClick={handleAddNote} disabled={!noteText.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {activities.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3 text-sm">
                          <div className="shrink-0 mt-1">
                            {activity.activityType === "note" && <MessageSquare className="h-3.5 w-3.5 text-blue-500" />}
                            {activity.activityType === "stage_change" && <ChevronRight className="h-3.5 w-3.5 text-amber-500" />}
                            {activity.activityType === "created" && <Plus className="h-3.5 w-3.5 text-green-500" />}
                            {activity.activityType === "imported" && <Plus className="h-3.5 w-3.5 text-purple-500" />}
                            {activity.activityType === "field_edit" && <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">{timeSince(activity.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SEQUENCES */}
              <SequenceEnrollmentWidget leadId={ed.id} />

              {/* ATTEMPTS TIMELINE */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Attempts ({leadAttempts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {leadAttempts.length > 0 ? (
                    <div className="space-y-2">
                      {leadAttempts.map((attempt) => (
                        <div key={attempt.id} className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onViewAttempt(attempt)}>
                          <div className="flex items-center gap-2">
                            <Badge className={getOutcomeColor(attempt.outcome)} variant="secondary">{attempt.outcome}</Badge>
                            {attempt.why && <span className="text-xs text-muted-foreground">{attempt.why}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {attempt.recordingUrl && <Mic className="h-3 w-3 text-muted-foreground" />}
                            {(attempt.transcript?.length || attempt.callTranscriptText) && <FileText className="h-3 w-3 text-muted-foreground" />}
                            <span className="text-xs text-muted-foreground">{timeSince(attempt.timestamp)}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No attempts yet</p>
                  )}
                </CardContent>
              </Card>
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

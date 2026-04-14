"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useProjectId } from "@/hooks/use-project-id"
import { useTasks } from "@/hooks/use-tasks"
import { usePipelineStages } from "@/hooks/use-pipeline-stages"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import { useCategories } from "@/hooks/use-categories"
import { DynamicFieldRenderer } from "@/components/dynamic-field-renderer"

import { CategoryIcon } from "@/components/category-icon"
import { TagToggle } from "@/components/tag-manager"
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
  contactRoleOptions,
  DEFAULT_STAGE,
  type Lead,
  type Attempt,
  type Contact,
  type ContactRole,
} from "@/lib/store"
import { getOutcomeColor } from "@/components/leads-table"
import { InteractionsTimeline } from "@/components/interactions-timeline"
import { CallsPanel } from "@/components/CallsPanel"
import { saveLeadField, SaveIndicator } from "@/lib/auto-save"
import { emitWorkflowEvent } from "@/lib/workflow-engine"

import { SchemaRenderer, WidgetProps, WidgetRegistry } from "@/components/schema-renderer"
import { AccountRealityWidget } from "@/components/widgets/account-reality"
import { PendingTasksWidget } from "@/components/widgets/pending-tasks"
import { ContactsListWidget } from "@/components/widgets/contacts-list"
import { LastAttemptWidget } from "@/components/widgets/last-attempt"

const TimelineWidget = (props: WidgetProps) => (
  <InteractionsTimeline
    leadId={props.lead.id}
    attempts={props.widgetContext?.leadAttempts || []}
    onViewAttempt={props.widgetContext?.onViewAttempt}
    onAddNote={props.widgetContext?.handleAddNote}
  />
)

const CallsWidget = (props: WidgetProps) => (
  <CallsPanel leadId={props.lead.id} phone={props.lead.phone} />
)

const drawerWidgets: WidgetRegistry = {
  account_reality: AccountRealityWidget,
  pending_tasks: PendingTasksWidget,
  last_attempt: LastAttemptWidget,
  interactions_timeline: TimelineWidget,
  calls_panel: CallsWidget,
}

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
  const { categories: segmentCategories } = useCategories("segment")
  const [editedLead, setEditedLead] = useState<Lead | null>(null)
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
    const oldStage = editedLead.stage
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

      // Emit workflow event
      emitWorkflowEvent({
        type: "stage_change",
        leadId: editedLead.id,
        payload: { from_stage: oldStage, to_stage: newStage },
        timestamp: new Date().toISOString(),
      })
    }
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
                  <TagToggle leadId={ed.id} />
                  {/* Stage selector */}
                  <Select value={ed.stage || DEFAULT_STAGE} onValueChange={handleStageChange}>
                    <SelectTrigger className="h-6 w-auto text-xs gap-1 border-0 px-2" style={{ color: stages.find((s) => s.name === (ed.stage || DEFAULT_STAGE))?.color }}>
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
                  {/* Segment selector */}
                  <Select value={ed.segment || "Unknown"} onValueChange={async (val) => {
                    if (!editedLead) return
                    const updated = { ...editedLead, segment: val }
                    setEditedLead(updated)
                    await autoSave("segment", val)
                    onLeadUpdated(updated)
                  }}>
                    <SelectTrigger className="h-6 w-auto text-xs gap-1 border-0 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {segmentCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <CategoryIcon icon={cat.icon} className="h-3 w-3" />
                            {cat.name}
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
            <div className="p-6 pb-20 space-y-6">
              {/* Hardcoded Contacts List Widget at the top for true B2B architecture */}
              <div className="w-full">
                <ContactsListWidget 
                  lead={ed} 
                  updateLead={(id, updates) => setEditedLead((prev) => prev ? { ...prev, ...updates } : null)} 
                />
              </div>

              <SchemaRenderer
                viewType="lead_drawer"
                lead={ed}
                updateLead={(id, updates) => setEditedLead((prev) => prev ? { ...prev, ...updates } : null)}
                widgets={drawerWidgets}
                widgetContext={{
                  leadAttempts: leadAttempts,
                  onViewAttempt,
                  handleAddNote
                }}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}

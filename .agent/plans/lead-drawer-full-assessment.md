# Lead Drawer System — Full Code Assessment

Every file, every function, every line explained. What is automatic, what is manual, what is broken.

---

## FILE 1: `components/lead-drawer.tsx` (839 lines)

This is the main component. It renders the right-side panel when you click a lead.

### Lines 1-79: Imports

```tsx
"use client"                                          // Required — this component uses browser APIs (useState, events)

import { useState } from "react"                     // React state for editing, modals, note text
import { getSupabase } from "@/lib/supabase"          // Database client singleton
import { useToast } from "@/hooks/use-toast"          // Toast notifications for errors
import { useProjectId } from "@/hooks/use-project-id" // Gets current project ID from auth context
import { useTasks } from "@/hooks/use-tasks"           // Fetches pending tasks for this lead
import { usePipelineStages } from "@/hooks/use-pipeline-stages" // Fetches pipeline stage definitions (New, Contacted, etc.)
import { useFieldDefinitions } from "@/hooks/use-field-definitions" // Custom field schemas
import { DynamicFieldRenderer } from "@/components/dynamic-field-renderer" // Renders custom fields based on type
import { TagToggle } from "@/components/tag-manager"   // Tag attach/detach popover
import { SequenceEnrollmentWidget } from "@/components/sequence-enrollment" // Sequence enrollment card
import { Badge } from "@/components/ui/badge"          // UI: colored label
import { Button } from "@/components/ui/button"        // UI: button
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // UI: card container
import { Input } from "@/components/ui/input"          // UI: text input
import { Label } from "@/components/ui/label"          // UI: form label
import { Textarea } from "@/components/ui/textarea"    // UI: multi-line input
import { ScrollArea } from "@/components/ui/scroll-area" // UI: scrollable container
import { Separator } from "@/components/ui/separator"  // UI: horizontal line
import { Sheet, SheetContent } from "@/components/ui/sheet" // UI: the slide-out drawer itself
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion" // UI: collapsible section
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip" // UI: hover tooltip
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog" // UI: modal dialog (for Add Contact)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // UI: dropdown (for stage)
import {
  Plus, Phone, FileText, Mic, Trash2, ChevronRight,
  Edit3, Save, X, AlertCircle, Star, HelpCircle, Target, Check, Clock,
} from "lucide-react"                                  // Icons
import {
  segmentOptions,      // ["SMB", "Mid-Market", "Enterprise", "Unknown"] — dropdown choices for segment
  contactRoleOptions,  // ["DM", "Gatekeeper", "Other"] — dropdown choices for contact role
  constraintOptions,   // ["Locked contract", "Budget freeze", ...] — constraint chips
  type Lead,           // Full lead type with 30+ fields
  type Attempt,        // Attempt type with outcome, why, recording, transcript, etc.
  type Contact,        // Contact type: id, name, role, phone
  type ContactRole,    // "DM" | "Gatekeeper" | "Other"
  type ConstraintOption, // The 6 constraint strings
} from "@/lib/store"
import { getOutcomeColor } from "@/components/leads-table" // Returns CSS class for outcome badge color
import { CallsPanel } from "@/components/CallsPanel"       // OpenPhone call recordings panel
import { useLeadActivities } from "@/hooks/use-lead-activities" // Notes & activity feed
import { MessageSquare, Send } from "lucide-react"         // More icons
```

**What this tells us:** The drawer pulls data from 6 different hooks (tasks, stages, field definitions, activities, plus lead and attempts passed as props). It has no central data context — everything is fetched independently.

---

### Lines 80-100: Helper functions and constants

```tsx
function timeSince(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  if (diffHours < 1) return "Just now"     // < 1 hour
  if (diffHours < 24) return `${diffHours}h ago`  // 1-23 hours
  if (diffDays === 1) return "1 day ago"    // exactly 1 day
  return `${diffDays} days ago`             // 2+ days
}
// USED BY: Last Attempt timestamp, Activity feed timestamps, Attempts timeline timestamps
// TYPE: AUTOMATIC — computed from timestamp, no user input

const validObjectiveVerbs = ["Confirm", "Disqualify", "Book", "Identify", "Test"]
// USED BY: Next Call Objective validation (line 157)
// PURPOSE: The objective MUST start with one of these verbs. If it doesn't, shows amber warning.

const taskTypeLabels: Record<string, string> = {
  call_back: "Call",       // Display label for task type badge
  follow_up: "Follow up",
  meeting: "Meeting",
  email: "Email",
  custom: "Task",
}
// USED BY: Pending Tasks card (line 401)
```

---

### Lines 102-111: Props interface

```tsx
interface LeadDrawerProps {
  open: boolean                             // Is the drawer visible?
  onOpenChange: (open: boolean) => void     // Callback when drawer opens/closes
  lead: Lead | null                         // The lead to display (passed from parent)
  attempts: Attempt[]                       // ALL attempts for ALL leads (filtered inside)
  onLeadUpdated: (lead: Lead) => void       // Callback when lead data changes (updates parent state)
  onLogAttempt: () => void                  // Callback to open Log Attempt modal (controlled by parent)
  onViewAttempt: (attempt: Attempt) => void // Callback to open Attempt Detail modal (controlled by parent)
  onCall?: () => void                       // Callback for the Call button (optional, controlled by parent)
}
```

**IMPORTANT:** The drawer does NOT own the Log Attempt or Attempt Detail modals. Those are controlled by the parent (`app/page.tsx`). The drawer just fires callbacks to tell the parent "open that modal."

---

### Lines 113-155: Component setup and state

```tsx
export function LeadDrawer({
  open, onOpenChange, lead, attempts, onLeadUpdated, onLogAttempt, onViewAttempt, onCall,
}: LeadDrawerProps) {
  const { toast } = useToast()                           // For error notifications
  const projectId = useProjectId()                       // Current project scope
  const { stages } = usePipelineStages()                 // AUTOMATIC: Fetches pipeline stages from DB on mount
  const { fields: fieldDefinitions } = useFieldDefinitions("lead") // AUTOMATIC: Fetches custom field schemas
  const { tasks, completeTask } = useTasks({ leadId: lead?.id })   // AUTOMATIC: Fetches pending tasks WHERE lead_id = this lead AND completed_at IS NULL
  const [isEditing, setIsEditing] = useState(false)      // MANUAL: toggled by Edit/Save buttons
  const [editedLead, setEditedLead] = useState<Lead | null>(null)  // Local copy of lead for editing
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)  // Controls Add Contact modal
  const [newContact, setNewContact] = useState({ name: "", phone: "", role: "Other" as ContactRole })
  const { activities, addNote } = useLeadActivities(lead?.id ?? null) // AUTOMATIC: Fetches from lead_activities table
  const [noteText, setNoteText] = useState("")           // Text in the note input field

  const handleAddNote = async () => {                    // MANUAL: User presses Enter or clicks Send
    if (!noteText.trim()) return                          // Ignore empty notes
    await addNote(noteText)                               // IMMEDIATE DB WRITE: Inserts into lead_activities
    setNoteText("")                                       // Clear the input
  }

  // Sync editedLead when the lead prop changes (e.g., when switching between leads)
  const currentLead = editedLead && editedLead.id === lead?.id ? editedLead : lead
  if (lead && (!editedLead || editedLead.id !== lead.id)) {
    queueMicrotask(() => {                               // queueMicrotask avoids setState during render
      setEditedLead({ ...lead })                          // Clone the lead into local editing state
      setIsEditing(false)                                 // Exit edit mode when switching leads
    })
  }

  // Filter attempts for THIS lead only, sort newest first
  const leadAttempts = lead
    ? attempts
      .filter((a) => a.leadId === lead.id)  // IMPORTANT: `attempts` prop contains ALL attempts for ALL leads
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : []
  const lastAttempt = leadAttempts[0] || null             // AUTOMATIC: The most recent attempt (used in Last Attempt card)

  // Validate the Next Call Objective format
  const objectiveIsValid = currentLead?.nextCallObjective
    ? validObjectiveVerbs.some((v) => currentLead.nextCallObjective?.startsWith(v))
    : false
  // TYPE: AUTOMATIC validation — checks if objective starts with Confirm/Disqualify/Book/Identify/Test
```

**🔴 BUG:** `attempts` contains ALL attempts for the entire project. Every time ANY lead's drawer opens, it scans the full array. For 10,000 attempts this is O(n) on every render.

---

### Lines 161-197: handleSave — the global Save button

```tsx
const handleSave = async () => {
  if (!editedLead) return

  const supabase = getSupabase()
  const { error } = await supabase
    .from("leads")
    .update({
      company: editedLead.company,               // Company name
      phone: editedLead.phone,                    // Phone number
      segment: editedLead.segment,                // SMB/Mid-Market/Enterprise/Unknown
      is_decision_maker: editedLead.isDecisionMaker, // yes/no/unknown
      is_fleet_owner: editedLead.isFleetOwner,       // yes/no/unknown
      operational_context: editedLead.operationalContext, // Free text
      confirmed_facts: editedLead.confirmedFacts, // String array, max 5, max 120 chars each
      open_questions: editedLead.openQuestions,    // String array, max 3, max 120 chars each
      next_call_objective: editedLead.nextCallObjective, // Single string
      constraints: editedLead.constraints,         // Array of constraint chips
      constraint_other: editedLead.constraintOther,  // Free text "other" constraint
      opportunity_angle: editedLead.opportunityAngle, // Single string, max 100 chars
      website: editedLead.website,
      email: editedLead.email,
      address: editedLead.address,
      lead_source: editedLead.leadSource,
      stage: editedLead.stage,                    // Pipeline stage name
      deal_value: editedLead.dealValue ?? null,   // Number or null
      custom_fields: editedLead.customFields ?? {},  // JSONB blob
    })
    .eq("id", editedLead.id)                      // WHERE id = this lead

  if (error) {
    toast({ variant: "destructive", title: "Failed to save", description: error.message })
    return
  }

  onLeadUpdated(editedLead)  // Tell parent to update its state
  setIsEditing(false)         // Exit edit mode
}
```

**TYPE:** MANUAL — only runs when user clicks Save button.
**SAVES:** 17 fields in one UPDATE statement.
**🔴 PROBLEM:** Does NOT log this change to lead_activities. No activity trail is created.
**🔴 PROBLEM:** Includes `stage` in the batch save, but stage is ALSO saved immediately by `handleStageChange`. If user changes stage AND edits other fields, stage gets saved TWICE.

---

### Lines 199-224: handleStageChange — IMMEDIATE save (no Edit button needed)

```tsx
const handleStageChange = async (newStage: string) => {
  if (!editedLead) return
  const stage = stages.find((s) => s.name === newStage)      // Look up stage definition
  const updated = {
    ...editedLead,
    stage: newStage,                                           // Set new stage name
    stageChangedAt: new Date().toISOString(),                   // AUTOMATIC: timestamp of stage change
    closeProbability: stage?.defaultProbability ?? editedLead.closeProbability, // AUTOMATIC: pull default probability from stage definition
  }
  setEditedLead(updated)

  // Persist IMMEDIATELY — stage changes don't require the Save button
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
    onLeadUpdated(updated)  // Tell parent immediately
  }
}
```

**TYPE:** MANUAL trigger (user picks from dropdown) → AUTOMATIC save (no Save button needed)
**AUTOMATIC VALUE:** `closeProbability` is auto-set from the stage's `defaultProbability` (e.g., "Interested" = 30%, "Meeting Booked" = 60%)
**🔴 PROBLEM:** Does NOT log to lead_activities. Activity feed won't show "Stage changed from X to Y".
**🔴 PROBLEM:** Does NOT check if lead is already at a higher stage. User can accidentally downgrade.

---

### Lines 226-293: Field editing handlers

```tsx
// Custom field change — only modifies local state, nothing saved until Save button
const handleCustomFieldChange = (fieldKey: string, value: unknown) => {
  if (!editedLead) return
  setEditedLead({
    ...editedLead,
    customFields: { ...(editedLead.customFields || {}), [fieldKey]: value },
  })
}
// TYPE: MANUAL (edit mode only), NOT saved until Save button

// Add contact — IMMEDIATE DB write (no Save button)
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
    onLeadUpdated(updated)           // Notify parent immediately
    setNewContact({ name: "", phone: "", role: "Other" })
    setIsAddContactOpen(false)
  }
}
// TYPE: MANUAL trigger, IMMEDIATE save. Inconsistent with other fields.
// 🔴 PROBLEM: Does NOT log to lead_activities.

// Delete contact — IMMEDIATE DB write (no Save button)
const handleDeleteContact = async (contactId: string) => {
  if (!editedLead) return
  const supabase = getSupabase()
  const { error } = await supabase.from("contacts").delete().eq("id", contactId)
  if (error) return
  const updated = { ...editedLead, contacts: editedLead.contacts.filter((c) => c.id !== contactId) }
  setEditedLead(updated)
  onLeadUpdated(updated)             // Notify parent immediately
}
// TYPE: MANUAL trigger, IMMEDIATE save. No confirmation dialog.
// 🔴 PROBLEM: No undo. No confirmation. Does NOT log to lead_activities.

// Set primary contact — LOCAL STATE ONLY (reorders array, first contact = primary)
const handleSetPrimaryContact = (contactId: string) => {
  if (!editedLead) return
  const contact = editedLead.contacts.find((c) => c.id === contactId)
  if (!contact) return
  setEditedLead({ ...editedLead, contacts: [contact, ...editedLead.contacts.filter((c) => c.id !== contactId)] })
}
// TYPE: MANUAL, LOCAL ONLY. The reorder is NOT saved to DB — "primary" is just being first in the array.
// 🔴 PROBLEM: Primary contact resets on page reload because array order isn't persisted.

// Remove a confirmed fact — LOCAL STATE ONLY (saved only on Save button click)
const handleRemoveFact = (index: number) => {
  if (!editedLead) return
  const newFacts = [...(editedLead.confirmedFacts || [])]
  newFacts.splice(index, 1)
  setEditedLead({ ...editedLead, confirmedFacts: newFacts })
}
// TYPE: MANUAL, requires Save button

// Remove an open question — LOCAL STATE ONLY
const handleRemoveQuestion = (index: number) => {
  if (!editedLead) return
  const newQs = [...(editedLead.openQuestions || [])]
  newQs.splice(index, 1)
  setEditedLead({ ...editedLead, openQuestions: newQs })
}
// TYPE: MANUAL, requires Save button

// Toggle a constraint chip — LOCAL STATE ONLY
const handleToggleConstraint = (constraint: ConstraintOption) => {
  if (!editedLead) return
  const current = editedLead.constraints || []
  if (current.includes(constraint)) {
    setEditedLead({ ...editedLead, constraints: current.filter((c) => c !== constraint) })
  } else {
    setEditedLead({ ...editedLead, constraints: [...current, constraint] })
  }
}
// TYPE: MANUAL, requires Save button
```

---

### SAVE BEHAVIOR SUMMARY TABLE

| Action | When it saves | Where |
|--------|--------------|-------|
| Change stage (dropdown) | **IMMEDIATELY** | `leads` table |
| Add contact | **IMMEDIATELY** | `contacts` table |
| Delete contact | **IMMEDIATELY** | `contacts` table |
| Add note | **IMMEDIATELY** | `lead_activities` table |
| Complete task | **IMMEDIATELY** | `tasks` table |
| Toggle tag | **IMMEDIATELY** | `lead_tags` table |
| Edit confirmed facts | **Only on Save click** | `leads` table |
| Edit open questions | **Only on Save click** | `leads` table |
| Edit next call objective | **Only on Save click** | `leads` table |
| Edit segment | **Only on Save click** | `leads` table |
| Edit decision maker | **Only on Save click** | `leads` table |
| Edit constraints | **Only on Save click** | `leads` table |
| Edit opportunity angle | **Only on Save click** | `leads` table |
| Edit deal value | **Only on Save click** | `leads` table |
| Edit custom fields | **Only on Save click** | `leads` table |
| Set primary contact | **NEVER** — local state only | Not saved |

**🔴 This is the core confusion. The user has no way to know which actions are instant and which require Save.**

---

### Lines 298-351: HEADER (sticky top bar)

```tsx
const ed = editedLead || lead
if (!ed) return null           // If no lead selected, render nothing

return (
  <TooltipProvider>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">

        {/* STICKY HEADER - stays at top while scrolling */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <div className="flex items-start justify-between">

            {/* LEFT: Company name + metadata */}
            <div>
              <h2 className="text-xl font-semibold">{ed.company}</h2>  {/* Company name, read-only */}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{ed.segment}</Badge>           {/* Segment badge (SMB/etc), read-only */}
                <TagToggle leadId={ed.id} />                            {/* MANUAL: Tag attach/detach popover */}

                {/* Stage dropdown - IMMEDIATE save, no Edit mode required */}
                <Select value={ed.stage || "New"} onValueChange={handleStageChange}>
                  <SelectTrigger className="h-6 w-auto text-xs gap-1 border-0 px-2"
                    style={{ color: stages.find((s) => s.name === (ed.stage || "New"))?.color }}>
                    {/* Text color matches stage color (blue for Contacted, purple for Interested, etc.) */}
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

            {/* RIGHT: Action buttons */}
            <div className="flex items-center gap-2">
              {ed.phone && onCall && (
                <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={onCall}>
                  <Phone className="h-4 w-4 mr-1" /> Call
                </Button>
                // MANUAL: Calls parent's handleCall. Opens tel: link, copies number, auto-creates attempt + call_session if sandbox mode
              )}
              <Button size="sm" variant="outline" className="bg-transparent" onClick={onLogAttempt}>
                Log Attempt
              </Button>
              {/* MANUAL: Opens LogAttemptModal (controlled by parent) */}

              {isEditing ? (
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
                // MANUAL: Saves all edited fields to DB
              ) : (
                <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-1" /> Edit
                </Button>
                // MANUAL: Enters edit mode
              )}
            </div>
          </div>
        </div>
```

---

### Lines 353-420: Scrollable body — Last Attempt + Tasks + Calls Panel

```tsx
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">

            {/* ═══ CARD 1: LAST ATTEMPT ═══ */}
            {lastAttempt ? (
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Last Attempt</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* AUTOMATIC: Outcome badge with color coding */}
                      <Badge className={getOutcomeColor(lastAttempt.outcome)} variant="secondary">
                        {lastAttempt.outcome}
                      </Badge>
                      {/* AUTOMATIC: "Why" reason (only if outcome was "DM reached → No interest") */}
                      {lastAttempt.why && <span className="text-sm text-muted-foreground">Why: {lastAttempt.why}</span>}
                      {/* AUTOMATIC: Rep mistake (optional, logged during attempt) */}
                      {lastAttempt.repMistake && <span className="text-sm text-red-600">Mistake: {lastAttempt.repMistake}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* AUTOMATIC: Icons showing if recording and/or transcript exist */}
                      {lastAttempt.recordingUrl && <Mic className="h-4 w-4 text-muted-foreground" />}
                      {(lastAttempt.transcript?.length || lastAttempt.callTranscriptText) && <FileText className="h-4 w-4 text-muted-foreground" />}
                      {/* AUTOMATIC: Relative timestamp */}
                      <span className="text-sm text-muted-foreground">{timeSince(lastAttempt.timestamp)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // No attempts yet — show placeholder
              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground text-center">No attempts yet</p>
                </CardContent>
              </Card>
            )}
            // 🔴 PROBLEM: This card is READ-ONLY. You can't click it to see attempt details.
            // 🔴 PROBLEM: It shows the SAME data as the Attempts timeline at the bottom — duplicated.


            {/* ═══ CARD 2: PENDING TASKS ═══ */}
            {tasks.length > 0 && (  // AUTOMATIC: Only shown if there are pending tasks
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" /> Pending Tasks ({tasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.map((task) => {
                      // AUTOMATIC: Overdue detection
                      const isOverdue = new Date(task.dueAt) < new Date(new Date().toDateString())
                      return (
                        <div key={task.id} className={`flex items-center justify-between p-2 rounded border ${isOverdue ? "border-red-200 bg-red-50" : ""}`}>
                          {/* AUTOMATIC: Red border + background if overdue */}
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {taskTypeLabels[task.type] ?? task.type}
                                {/* AUTOMATIC: Maps task type to human label (call_back → "Call") */}
                              </Badge>
                              <span className="text-sm">{task.title}</span>
                              {/* AUTOMATIC: Title was auto-generated by LogAttemptModal (e.g., "Follow up with CompanyName") */}
                            </div>
                            <span className={`text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                              Due: {new Date(task.dueAt).toLocaleDateString()}
                            </span>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => completeTask(task.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          {/* MANUAL: Click ✓ to complete. IMMEDIATE DB write: sets completed_at = now() */}
                          {/* 🔴 PROBLEM: Does NOT log to lead_activities */}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            // 🔴 PROBLEM: No way to CREATE a task from here. Tasks are only auto-created by LogAttempt.


            {/* ═══ CARD 3: CALL HISTORY (SANDBOX) ═══ */}
            <CallsPanel leadId={ed.id} phone={ed.phone} />
            // Renders the CallsPanel component (see FILE 2 below)
            // 🔴 PROBLEM: Duplicates data from the Attempts timeline
            // 🔴 PROBLEM: "(Sandbox)" label suggests test data, but it shows real OpenPhone recordings
```

---

### Lines 422-529: Account Reality card

```tsx
            {/* ═══ CARD 4: ACCOUNT REALITY ═══ */}
            <Card className={!ed.nextCallObjective ? "border-amber-500" : ""}>
            {/* AUTOMATIC: Amber border if Next Call Objective is not set */}

              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" /> Account Reality
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>The single source of truth about this account. Only facts you would bet money on.</p>
                    </TooltipContent>
                  </Tooltip>
                  {/* MANUAL: Hover to see tooltip */}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">

                {/* ── Confirmed Facts (max 5, max 120 chars each) ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Confirmed Facts</Label>
                    <span className="text-xs text-muted-foreground">{(ed.confirmedFacts || []).length}/5</span>
                    {/* AUTOMATIC: Counter showing current/max */}
                  </div>

                  {isEditing ? (
                    // EDIT MODE: Show input fields for each fact
                    <div className="space-y-2">
                      {(ed.confirmedFacts || []).map((fact, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm">•</span>
                          <Input value={fact}
                            onChange={(e) => {
                              const nf = [...(ed.confirmedFacts || [])]
                              nf[i] = e.target.value.slice(0, 120) // AUTOMATIC: Enforces 120 char limit
                              setEditedLead({ ...ed, confirmedFacts: nf })
                            }}
                            maxLength={120} className="flex-1" />
                          <Button size="icon" variant="ghost" onClick={() => handleRemoveFact(i)}>
                            <X className="h-4 w-4" />
                          </Button>
                          {/* MANUAL: Remove fact (local state only, needs Save) */}
                        </div>
                      ))}
                      {(ed.confirmedFacts || []).length < 5 && (
                        <Button size="sm" variant="outline" className="bg-transparent"
                          onClick={() => setEditedLead({ ...ed, confirmedFacts: [...(ed.confirmedFacts || []), ""] })}>
                          <Plus className="h-4 w-4 mr-1" /> Add Fact
                        </Button>
                        // MANUAL: Adds empty fact to array (local state only, needs Save)
                      )}
                    </div>
                  ) : (
                    // VIEW MODE: Show bullet list
                    <ul className="space-y-1">
                      {(ed.confirmedFacts || []).length > 0
                        ? ed.confirmedFacts?.map((fact, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-muted-foreground">•</span><span>{fact}</span>
                          </li>
                        ))
                        : <li className="text-sm text-muted-foreground italic">No confirmed facts yet</li>}
                    </ul>
                  )}
                </div>

                <Separator />

                {/* ── Open Questions (max 3, max 120 chars each) ── */}
                {/* Same pattern as Confirmed Facts: edit mode shows inputs, view mode shows bullets */}
                {/* MANUAL in edit mode, requires Save button */}
                {/* Placeholder text: "Do they... / Can they... / Will they..." */}

                <Separator />

                {/* ── Next Call Objective ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      Next Call Objective
                      {!ed.nextCallObjective && <AlertCircle className="h-4 w-4 text-amber-500" />}
                      {/* AUTOMATIC: Amber warning icon if no objective set */}
                    </Label>
                  </div>
                  {isEditing ? (
                    <div className="space-y-1">
                      <Input value={ed.nextCallObjective || ""}
                        onChange={(e) => setEditedLead({ ...ed, nextCallObjective: e.target.value })}
                        placeholder="Confirm whether fuel contracts renew quarterly or annually."
                        className={!objectiveIsValid && ed.nextCallObjective ? "border-amber-500" : ""} />
                        {/* AUTOMATIC: Amber border if text exists but doesn't start with a valid verb */}
                      <p className="text-xs text-muted-foreground">
                        Must start with: Confirm, Disqualify, Book, Identify, or Test
                      </p>
                    </div>
                  ) : (
                    <p className={`text-sm ${!ed.nextCallObjective ? "text-amber-500 italic" : ""}`}>
                      {ed.nextCallObjective || "No objective set - click Edit to add one"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            // 🔴 PROBLEM: ALL of Account Reality requires Edit mode + Save. These are the most frequently
            //    updated fields after a call, yet they have the highest friction path.
```

---

### Lines 531-649: Lead Info card + Advanced accordion

```tsx
            {/* ═══ CARD 5: LEAD INFO ═══ */}
            // Contains: Segment dropdown, Decision Maker? (yes/no/?), Fleet Owner? (yes/no/?),
            // Operational Context textarea, Constraints chips, Constraint Other input,
            // Opportunity Angle input (max 100 chars), Deal Value number input
            //
            // ALL require Edit mode + Save button
            // 🔴 PROBLEM: "Fleet Owner" is domain-specific (fleet management CRM). Not generic.
            //
            // Advanced accordion (collapsed by default): Website, Email, Address, Lead Source
            // ALL require Edit mode + Save button
```

---

### Lines 651-722: Custom Fields + Contacts cards

```tsx
            {/* ═══ CARD 6: CUSTOM FIELDS ═══ */}
            // AUTOMATIC: Only rendered if fieldDefinitions.length > 0
            // Uses DynamicFieldRenderer which supports: text, number, select, multi_select, date, boolean, url, email
            // Requires Edit mode + Save button

            {/* ═══ CARD 7: CONTACTS ═══ */}
            // Shows list of contacts with: star (primary), name, phone (tel: link), role badge
            // MANUAL: Add button (edit mode only) → opens Add Contact dialog
            // MANUAL: Delete button (edit mode only) → IMMEDIATE delete from DB
            // MANUAL: Set primary (edit mode only) → LOCAL STATE ONLY (not persisted!)
            // MANUAL: Change role (edit mode only) → LOCAL STATE ONLY until Save
            // 🔴 PROBLEM: Add/Delete are IMMEDIATE but role changes need Save. Inconsistent.
```

---

### Lines 724-800: Notes & Activity + Sequences + Attempts Timeline

```tsx
            {/* ═══ CARD 8: NOTES & ACTIVITY ═══ */}
            // Input field + Send button. Enter key submits.
            // MANUAL: Types note → press Enter → IMMEDIATE write to lead_activities table
            // AUTOMATIC: Shows activity feed from lead_activities table (up to 50 items)
            // Activity types supported in UI: note, call, stage_change, tag_change,
            //   field_change, task_created, task_completed, email, sms
            // 🔴 PROBLEM: Only "note" type is ever written. All other types show icons but
            //   NO CODE in this file or any other writes those activity types.
            //   The logActivity() function exists in the hook but is NEVER called.

            {/* ═══ CARD 9: SEQUENCES ═══ */}
            <SequenceEnrollmentWidget leadId={ed.id} />
            // AUTOMATIC: Hidden if no sequences exist in system
            // MANUAL: Enroll, Advance, Pause, Resume, Exit buttons
            // All sequence operations are IMMEDIATE saves

            {/* ═══ CARD 10: ATTEMPTS TIMELINE ═══ */}
            // Shows ALL attempts for this lead, sorted newest first
            // Each row shows: outcome badge, why reason, recording icon, transcript icon, timestamp, → arrow
            // MANUAL: Click a row → calls onViewAttempt → parent opens AttemptDetailModal
            // 🔴 PROBLEM: This duplicates the Last Attempt card (card 1) and the Call History panel (card 3)
```

---

### Lines 806-838: Add Contact Dialog

```tsx
            {/* ADD CONTACT MODAL */}
            // Triggered by "Add" button in Contacts card (edit mode only)
            // Fields: Name (required), Phone (optional), Role (DM/Gatekeeper/Other)
            // MANUAL: Fill form → click "Add Contact"
            // IMMEDIATE DB write to contacts table
            // 🔴 PROBLEM: No validation on phone format
```

---

## FILE 2: `components/CallsPanel.tsx` (145 lines)

This is the "Call History (Sandbox)" card.

```tsx
interface CallArtifact {
  id: string
  created_at: string
  direction: string       // "inbound" | "outbound"
  status: string          // "completed" | "initiated" | etc
  transcript_text?: string // Plain text transcript from OpenPhone
  recording_url?: string   // Audio URL from OpenPhone
}

export function CallsPanel({ leadId, phone }: { leadId?: string; phone?: string }) {
  // AUTOMATIC: Fetches from v_calls_with_artifacts view
  // Filters by phone_e164 (preferred) or lead_id
  // Sorted by created_at DESC

  // AUTOMATIC: Entire component hidden unless NEXT_PUBLIC_SANDBOX_CALLS env var is set
  if (!process.env.NEXT_PUBLIC_SANDBOX_CALLS) return null

  // For each call:
  //   - Date + time label
  //   - Direction badge ("inbound" / "outbound")
  //   - Status badge ("completed" / "initiated")
  //   - Audio player (native HTML <audio> element)
  //   - "Open recording" link (opens in new tab)
  //   - Collapsible transcript (show/hide toggle)
}
```

**DATA SOURCE:** `v_calls_with_artifacts` — a Supabase view that joins `call_sessions` with OpenPhone webhook data.

**🔴 PROBLEM:** This data OVERLAPS with the `attempts` table:
- If an attempt has `recording_url` and `callTranscriptText`, the same recording shows in BOTH the Attempts timeline and this panel
- The call_sessions table is populated by the Call button (auto-creates with status "initiated") and by OpenPhone webhooks via N8N
- The attempts table is populated by LogAttemptModal and is ALSO joined to call recordings via `v_attempts_enriched` view

---

## FILE 3: `components/log-attempt-modal.tsx` (215 lines)

This is the modal that opens when you click "Log Attempt."

```tsx
// STATE:
// - outcome: one of 5 options (MANUAL click required)
// - why: one of 5 options (MANUAL, only shown if outcome is "DM reached → No interest")
// - repMistake: one of 4 options (MANUAL, optional toggle)
// - note: free text, max 120 chars (MANUAL)

const handleSave = async () => {
  // MANUAL trigger: user clicks "Save Attempt" button

  // AUTOMATIC COMPUTATIONS on save:
  // 1. dm_reached — derived from outcome
  //    - "No connect" → false
  //    - "Gatekeeper only" → false
  //    - "DM reached → No interest" → true
  //    - "DM reached → Some interest" → true
  //    - "Meeting set" → true
  //
  // 2. next_action — derived from outcome + why
  //    - "No connect" → "Call again"
  //    - "Gatekeeper only" → "Call again"
  //    - "DM → No interest" + Targeting/Value/Trust → "Drop"
  //    - "DM → No interest" + Money/Timing → "Follow up"
  //    - "DM → Some interest" → "Follow up"
  //    - "Meeting set" → "Meeting scheduled"

  // DB WRITE: Inserts one row into attempts table
  const { data, error } = await supabase
    .from("attempts")
    .insert([attemptData])
    .select()
    .single()

  // AUTOMATIC: Fire-and-forget task creation based on outcome
  // Uses getDefaultTaskForOutcome() from store.ts:
  //
  // | Outcome                         | Task Type    | Title                              | Due  |
  // |--------------------------------|-------------|--------------------------------------|------|
  // | No connect                      | call_back   | "Call back {company}"               | +1d  |
  // | Gatekeeper only                 | call_back   | "Call back {company}"               | +1d  |
  // | DM → No interest + Targeting    | (none)      |                                      |      |
  // | DM → No interest + Value        | (none)      |                                      |      |
  // | DM → No interest + Trust        | (none)      |                                      |      |
  // | DM → No interest + Money        | follow_up   | "Follow up with {company}"          | +14d |
  // | DM → No interest + Timing       | follow_up   | "Follow up with {company}"          | +14d |
  // | DM → Some interest              | follow_up   | "Follow up with {company}"          | +2d  |
  // | Meeting set                     | meeting     | "Prepare for meeting with {company}" | +1d  |

  // 🔴 PROBLEM: Does NOT log to lead_activities
  // 🔴 PROBLEM: Does NOT auto-update the lead's stage (e.g., "Meeting set" should auto-promote to "Meeting Booked")
}
```

---

## FILE 4: `components/attempt-detail-modal.tsx` (200 lines)

Opens when you click an attempt in the timeline.

```tsx
// DISPLAYS: outcome badge, why badge, rep mistake badge, note text,
//   next action label, audio recording player, transcript (structured or plain text)

// SPECIAL FEATURE: "Did this attempt change our understanding?" prompt
//   → "Yes - Add to Account Reality" button
//   → Choose: "Confirmed Fact" or "Open Question"
//   → Type the fact/question (max 120 chars)
//   → Click "Add"
//   → IMMEDIATE DB write: updates leads.confirmed_facts or leads.open_questions
//   → THIS IS THE ONLY WAY TO ADD AN ACCOUNT REALITY ITEM WITHOUT ENTERING EDIT MODE
//
// 🔴 PROBLEM: This shortcut exists in the Attempt Detail modal but NOT in the drawer itself.
//   Most users never discover it because they close the modal immediately after seeing the details.
```

---

## FILE 5: `hooks/use-lead-activities.ts` (144 lines)

```tsx
export function useLeadActivities(leadId: string | null) {
  // AUTOMATIC: Fetches lead_activities WHERE lead_id = leadId, ORDER BY created_at DESC, LIMIT 50
  // Returns: { activities, loading, addNote, logActivity, refetch }

  // addNote(text) — USED by the drawer's note input
  //   Inserts: { lead_id, activity_type: "note", title: "Note", description: text }
  //   IMMEDIATE DB write

  // logActivity(type, title, description?, metadata?) — EXISTS but NEVER CALLED
  //   Could write: call, stage_change, tag_change, field_change, task_created, task_completed, email, sms
  //   But NO component in the entire codebase calls this function.
  //
  // 🔴 ROOT CAUSE of empty activity feed:
  //   The hook provides logActivity() but nobody uses it.
  //   Only addNote() is called (from the drawer's note input).
}
```

---

## FILE 6: `app/page.tsx` — The parent that owns the drawer (Lines 124-158)

```tsx
// The Call button handler (parent owns this, drawer just calls onCall):
const handleCall = async () => {
  if (!selectedLead || !selectedLead.phone) return
  const phone = selectedLead.phone.replace(/[^+\d]/g, "") // Strip non-numeric except +
  const w = window.open(`tel:${phone}`, "_blank")          // MANUAL: Opens phone dialer
  try { await navigator.clipboard.writeText(phone) } catch {} // AUTOMATIC: Copies to clipboard

  if (process.env.NEXT_PUBLIC_SANDBOX_CALLS === "true") {
    // 🔴 AUTOMATIC: Creates a FAKE "No connect" attempt before anyone picks up
    const { data: attempt, error } = await supabase.from("attempts").insert([{
      lead_id: selectedLead.id,
      timestamp: new Date().toISOString(),
      outcome: "No connect",       // ← FAKE: assumes no one answered
      dm_reached: false,
      next_action: "Call again",
      duration_sec: 0,
      project_id: projectId,
    }]).select().single()

    if (!error && attempt) {
      // 🔴 AUTOMATIC: Also creates a call_sessions row
      await supabase.from("call_sessions").insert([{
        attempt_id: attempt.id,
        lead_id: selectedLead.id,
        phone_e164: phone,
        direction: "outgoing",
        status: "initiated",
        started_at: new Date().toISOString(),
        project_id: projectId,
      }])
    }
  }
}

// These callbacks connect the drawer to the modals:
const handleLeadUpdated = (updated: Lead) => {
  setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
  setSelectedLead((prev) => (prev?.id === updated.id ? updated : prev))
}

const handleAttemptLogged = (attempt: Attempt) => {
  setAttempts([attempt, ...attempts])
  // 🔴 PROBLEM: Does NOT refetch tasks. The auto-created task from LogAttemptModal
  //   won't appear in the drawer's Pending Tasks until the user closes and reopens the drawer.
}
```

---

## FILE 7: `lib/store.ts` — The automation rules

```tsx
// getDefaultNextAction(outcome, why) — AUTOMATIC computation
// Called by LogAttemptModal to determine what happens next
//
// "No connect"                       → "Call again"
// "Gatekeeper only"                  → "Call again"
// "DM reached → No interest" + Targeting → "Drop"
// "DM reached → No interest" + Value     → "Drop"
// "DM reached → No interest" + Trust     → "Drop"
// "DM reached → No interest" + Money     → "Follow up"
// "DM reached → No interest" + Timing    → "Follow up"
// "DM reached → Some interest"           → "Follow up"
// "Meeting set"                          → "Meeting scheduled"

// getDefaultTaskForOutcome(outcome, why, companyName) — AUTOMATIC task creation
// Called by LogAttemptModal (fire-and-forget)
// Returns { type, title, dueDays } or null (for Drop outcomes)

// getEffectiveStage(lead, attempts) — AUTOMATIC stage derivation
// Used by the MAIN TABLE (not the drawer!) to show stages
// Logic: if lead.stage is set and not "New", use it. Otherwise compute from attempts.
// 🔴 PROBLEM: This creates TWO stage systems:
//   - Drawer uses lead.stage (manual, from dropdown)
//   - Table uses getEffectiveStage (auto-derived, can override to something different)
//   These can show DIFFERENT stages for the same lead in different views.
```

---

## COMPLETE INTERACTION MAP

| # | What | Trigger | Saves to DB? | When? | Logged to Activity? |
|---|------|---------|-------------|-------|-------------------|
| 1 | Change stage | Manual (dropdown) | ✅ Yes (leads) | Immediately | ❌ No |
| 2 | Click Call | Manual (button) | ✅ Yes (attempts + call_sessions) | Immediately | ❌ No |
| 3 | Log Attempt | Manual (modal) | ✅ Yes (attempts) | On modal Save | ❌ No |
| 4 | Auto-create Task | Automatic (after #3) | ✅ Yes (tasks) | Fire-and-forget | ❌ No |
| 5 | Complete Task | Manual (✓ button) | ✅ Yes (tasks) | Immediately | ❌ No |
| 6 | Add Note | Manual (Enter key) | ✅ Yes (lead_activities) | Immediately | ✅ Yes (this IS the activity) |
| 7 | Add Contact | Manual (dialog) | ✅ Yes (contacts) | Immediately | ❌ No |
| 8 | Delete Contact | Manual (trash icon) | ✅ Yes (contacts) | Immediately | ❌ No |
| 9 | Set Primary Contact | Manual (star icon) | ❌ No (local only) | Never | ❌ No |
| 10 | Toggle Tag | Manual (popover) | ✅ Yes (lead_tags) | Immediately | ❌ No |
| 11 | Edit Confirmed Facts | Manual (input) | ✅ Yes (leads) | On Save click | ❌ No |
| 12 | Edit Open Questions | Manual (input) | ✅ Yes (leads) | On Save click | ❌ No |
| 13 | Edit Next Call Objective | Manual (input) | ✅ Yes (leads) | On Save click | ❌ No |
| 14 | Edit Segment | Manual (dropdown) | ✅ Yes (leads) | On Save click | ❌ No |
| 15 | Edit Decision Maker | Manual (toggle) | ✅ Yes (leads) | On Save click | ❌ No |
| 16 | Edit Fleet Owner | Manual (toggle) | ✅ Yes (leads) | On Save click | ❌ No |
| 17 | Edit Operational Context | Manual (textarea) | ✅ Yes (leads) | On Save click | ❌ No |
| 18 | Edit Constraints | Manual (chips) | ✅ Yes (leads) | On Save click | ❌ No |
| 19 | Edit Opportunity Angle | Manual (input) | ✅ Yes (leads) | On Save click | ❌ No |
| 20 | Edit Deal Value | Manual (number) | ✅ Yes (leads) | On Save click | ❌ No |
| 21 | Edit Custom Fields | Manual (dynamic) | ✅ Yes (leads) | On Save click | ❌ No |
| 22 | Enroll in Sequence | Manual (popover) | ✅ Yes (sequence_enrollments) | Immediately | ❌ No |
| 23 | Advance/Pause/Resume/Exit Sequence | Manual (buttons) | ✅ Yes (sequence_enrollments) | Immediately | ❌ No |
| 24 | Click Attempt row | Manual (click) | ❌ No | — | — |
| 25 | Add to Account Reality from Attempt Detail | Manual (dialog) | ✅ Yes (leads) | Immediately | ❌ No |
| 26 | Auto-compute dm_reached | Automatic | ✅ Yes (attempts) | With attempt save | — |
| 27 | Auto-compute next_action | Automatic | ✅ Yes (attempts) | With attempt save | — |
| 28 | Auto-compute close_probability | Automatic | ✅ Yes (leads) | With stage change | — |
| 29 | Auto-compute stage_changed_at | Automatic | ✅ Yes (leads) | With stage change | — |
| 30 | Objective validation | Automatic | ❌ No (visual only) | — | — |
| 31 | Overdue task highlighting | Automatic | ❌ No (visual only) | — | — |

**Of 31 interactions, only 1 (#6, Add Note) writes to the activity feed.**

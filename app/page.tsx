"use client"
export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Plus, Phone, Clock, User, Building2, Play, FileText, Mic, Trash2, 
  ChevronRight, Edit3, Save, X, AlertCircle, Star, HelpCircle, Target
} from "lucide-react"
import {
  leads as initialLeads,
  attempts as initialAttempts,
  segmentOptions,
  attemptOutcomeOptions,
  whyReasonOptions,
  repMistakeOptions,
  contactRoleOptions,
  constraintOptions,
  getDerivedStage,
  getDerivedStatus,
  getDefaultNextAction,
  isDmReached,
  type Lead,
  type Attempt,
  type Contact,
  type AttemptOutcome,
  type WhyReason,
  type RepMistake,
  type DerivedStage,
  type ContactRole,
  type ConstraintOption,
} from "@/lib/store"

// Helper to format time since
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

const getOutcomeColor = (outcome: AttemptOutcome) => {
  const colors: Record<AttemptOutcome, string> = {
    "No connect": "bg-muted text-muted-foreground",
    "Gatekeeper only": "bg-orange-100 text-orange-800",
    "DM reached → No interest": "bg-red-100 text-red-800",
    "DM reached → Some interest": "bg-blue-100 text-blue-800",
    "Meeting set": "bg-green-100 text-green-800",
  }
  return colors[outcome] || "bg-muted text-muted-foreground"
}

// Verb prefixes for Next Call Objective validation
const validObjectiveVerbs = ["Confirm", "Disqualify", "Book", "Identify", "Test"]

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])

  useEffect(() => {
    const fetchData = async () => {
      // Fetch leads
      console.log("[LeadsPage] Fetching leads from Supabase...")
      const supabase = getSupabase()
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*, contacts(*)')
        .order('created_at', { ascending: false })
      
      console.log("[LeadsPage] Fetch result:", { leadsData, leadsError, count: leadsData?.length })

      if (leadsData) {
        const mappedLeads: Lead[] = leadsData.map((l: any) => ({
          id: l.id,
          company: l.company,
          phone: l.phone,
          segment: l.segment || "Unknown",
          isDecisionMaker: l.is_decision_maker || l.isDecisionMaker || "unknown",
          isFleetOwner: l.is_fleet_owner || l.isFleetOwner || "unknown",
          confirmedFacts: l.confirmed_facts || l.confirmedFacts || [],
          openQuestions: l.open_questions || l.openQuestions || [],
          nextCallObjective: l.next_call_objective || l.nextCallObjective,
          operationalContext: l.operational_context || l.operationalContext,
          constraints: l.constraints || [],
          constraintOther: l.constraint_other || l.constraintOther,
          opportunityAngle: l.opportunity_angle || l.opportunityAngle,
          website: l.website,
          email: l.email,
          address: l.address,
          leadSource: l.lead_source || l.leadSource,
          contacts: (l.contacts || []).map((c: any) => ({
             id: c.id,
             name: c.name,
             role: c.role || "Other",
             phone: c.phone,
             email: c.email
          })),
          createdAt: l.created_at || l.createdAt || new Date().toISOString()
        }))
        setLeads(mappedLeads)
      }

      // Fetch attempts
      const { data: attemptsData } = await supabase
        .from('attempts')
        .select('*')
        .order('created_at', { ascending: false })

      if (attemptsData) {
         const mappedAttempts: Attempt[] = attemptsData.map((a: any) => ({
            id: a.id,
            leadId: a.lead_id || a.leadId,
            contactId: a.contact_id || a.contactId,
            timestamp: a.timestamp,
            outcome: a.outcome,
            why: a.why,
            repMistake: a.rep_mistake || a.repMistake,
            dmReached: a.dm_reached || a.dmReached,
            nextAction: a.next_action || a.nextAction,
            nextActionAt: a.next_action_at || a.nextActionAt,
            note: a.note,
            durationSec: a.duration_sec || a.durationSec || 0,
            experimentTag: a.experiment_tag || a.experimentTag,
            sessionId: a.session_id || a.sessionId,
            createdAt: a.created_at || a.createdAt || new Date().toISOString(),
            recordingUrl: a.recording_url,
            transcript: a.transcript
         }))
         setAttempts(mappedAttempts)
      }
    }
    fetchData()
  }, [])
  
  // Filters
  const [segmentFilter, setSegmentFilter] = useState<string>("all")
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Add Lead dialog
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false)
  const [newLead, setNewLead] = useState({
    company: "",
    phone: "",
    segment: "Unknown",
  })

  // Lead drawer state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isEditingLead, setIsEditingLead] = useState(false)
  const [editedLead, setEditedLead] = useState<Lead | null>(null)
  
  // Attempt detail modal
  const [viewingAttempt, setViewingAttempt] = useState<Attempt | null>(null)
  const [showAddToReality, setShowAddToReality] = useState(false)
  const [newFactOrQuestion, setNewFactOrQuestion] = useState("")
  const [addToType, setAddToType] = useState<"fact" | "question">("fact")
  
  // Log attempt modal
  const [isLogAttemptOpen, setIsLogAttemptOpen] = useState(false)
  const [newAttempt, setNewAttempt] = useState<{
    outcome: AttemptOutcome | null
    why: WhyReason | null
    repMistake: RepMistake | null
    note: string
  }>({ outcome: null, why: null, repMistake: null, note: "" })
  
  // Add contact modal
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [newContact, setNewContact] = useState({ name: "", phone: "", role: "Other" as ContactRole })

  // Compute derived fields for each lead
  const leadsWithDerived = useMemo(() => {
    return leads.map(lead => {
      const leadAttempts = attempts
        .filter(a => a.leadId === lead.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      return {
        ...lead,
        derivedStage: getDerivedStage(leadAttempts),
        derivedStatus: getDerivedStatus(leadAttempts),
        lastAttempt: leadAttempts[0] || null,
        attemptCount: leadAttempts.length,
      }
    })
  }, [leads, attempts])

  const filteredLeads = leadsWithDerived.filter((lead) => {
    const matchesSegment = segmentFilter === "all" || lead.segment === segmentFilter
    const matchesOutcome = outcomeFilter === "all" || lead.lastAttempt?.outcome === outcomeFilter
    const matchesSearch = lead.company.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSegment && matchesOutcome && matchesSearch
  })

  const handleAddLead = async () => {
    if (!newLead.company) return

    console.log("[LeadsPage] Attempting to add lead:", newLead)
    const supabase = getSupabase()
    const { data, error } = await supabase.from('leads').insert([{
      company: newLead.company,
      phone: newLead.phone || null,
      segment: newLead.segment,
    }]).select().single()

    console.log("[LeadsPage] Insert response:", { data, error })
    if (error) console.error("[LeadsPage] Lead add failed")
    else console.log("[LeadsPage] Lead added successfully")

    if (error) {
        console.error("Error adding lead:", error)
        return
    }

    if (data) {
        const lead: Lead = {
          id: data.id,
          company: data.company,
          phone: data.phone,
          segment: data.segment,
          isDecisionMaker: "unknown",
          isFleetOwner: "unknown",
          contacts: [],
          createdAt: data.created_at,
        }

        setLeads([lead, ...leads])
        setNewLead({ company: "", phone: "", segment: "Unknown" })
        setIsAddLeadOpen(false)
    }
  }

  const openLeadDrawer = (lead: typeof leadsWithDerived[0]) => {
    setSelectedLead(lead)
    setEditedLead({ ...lead })
    setIsDrawerOpen(true)
    setIsEditingLead(false)
  }

  const selectedLeadAttempts = selectedLead 
    ? attempts
        .filter(a => a.leadId === selectedLead.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : []

  const lastAttempt = selectedLeadAttempts[0] || null

  const handleSaveLead = async () => {
    if (!editedLead) return

    const supabase = getSupabase()
    const { error } = await supabase.from('leads').update({
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
        lead_source: editedLead.leadSource
    }).eq('id', editedLead.id)

    if (error) {
        console.error("Error updating lead:", error)
        return
    }

    setLeads(leads.map(l => l.id === editedLead.id ? editedLead : l))
    setSelectedLead(editedLead)
    setIsEditingLead(false)
  }

  const handleLogAttempt = async () => {
    if (!selectedLead || !newAttempt.outcome) return
    
    const attemptData = {
      lead_id: selectedLead.id,
      timestamp: new Date().toISOString(),
      outcome: newAttempt.outcome,
      why: newAttempt.why || null,
      rep_mistake: newAttempt.repMistake || null,
      dm_reached: isDmReached(newAttempt.outcome),
      next_action: getDefaultNextAction(newAttempt.outcome, newAttempt.why || undefined),
      note: newAttempt.note || null,
      duration_sec: 0,
    }

    const supabase = getSupabase()
    const { data, error } = await supabase.from('attempts').insert([attemptData]).select().single()
    
    if (error) {
        console.error("Error logging attempt:", error)
        return
    }

    if (data) {
        const attempt: Attempt = {
           id: data.id,
           leadId: data.lead_id,
           timestamp: data.timestamp,
           outcome: data.outcome,
           why: data.why,
           repMistake: data.rep_mistake,
           dmReached: data.dm_reached,
           nextAction: data.next_action,
           note: data.note,
           durationSec: data.duration_sec,
           createdAt: data.created_at
        }
    
        setAttempts([attempt, ...attempts])
        setNewAttempt({ outcome: null, why: null, repMistake: null, note: "" })
        setIsLogAttemptOpen(false)
    }
  }

  const handleAddContact = async () => {
    if (!editedLead || !newContact.name) return
    
    const supabase = getSupabase()
    const { data, error } = await supabase.from('contacts').insert([{
        lead_id: editedLead.id,
        name: newContact.name,
        phone: newContact.phone || null,
        role: newContact.role
    }]).select().single()

    if (data) {
        const contact: Contact = {
            id: data.id,
            name: data.name,
            phone: data.phone,
            role: data.role
        }
    
        setEditedLead({
          ...editedLead,
          contacts: [...editedLead.contacts, contact]
        })
        
        // Also update leads list
        setLeads(leads.map(l => l.id === editedLead.id ? { ...l, contacts: [...l.contacts, contact] } : l))

        setNewContact({ name: "", phone: "", role: "Other" })
        setIsAddContactOpen(false)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!editedLead) return
    
    const supabase = getSupabase()
    const { error } = await supabase.from('contacts').delete().eq('id', contactId)
    
    if (error) {
        console.error("Error deleting contact:", error)
        return
    }

    const updatedLead = {
      ...editedLead,
      contacts: editedLead.contacts.filter(c => c.id !== contactId)
    }
    setEditedLead(updatedLead)
    setLeads(leads.map(l => l.id === editedLead.id ? updatedLead : l))
  }

  const handleSetPrimaryContact = (contactId: string) => {
    if (!editedLead) return
    // For now just move it to first position as "primary"
    const contact = editedLead.contacts.find(c => c.id === contactId)
    if (!contact) return
    setEditedLead({
      ...editedLead,
      contacts: [contact, ...editedLead.contacts.filter(c => c.id !== contactId)]
    })
  }

  const handleAddToAccountReality = async () => {
    if (!editedLead || !newFactOrQuestion.trim()) return
    
    if (addToType === "fact") {
      const currentFacts = editedLead.confirmedFacts || []
      if (currentFacts.length >= 5) return // MAX 5 facts
      setEditedLead({
        ...editedLead,
        confirmedFacts: [...currentFacts, newFactOrQuestion.slice(0, 120)]
      })
    } else {
      const currentQuestions = editedLead.openQuestions || []
      if (currentQuestions.length >= 3) return // MAX 3 questions
      setEditedLead({
        ...editedLead,
        openQuestions: [...currentQuestions, newFactOrQuestion.slice(0, 120)]
      })
    }
    
    setNewFactOrQuestion("")
    setShowAddToReality(false)
    setViewingAttempt(null)
    // Auto-save
    if (editedLead) {
      const updatedLead = addToType === "fact" 
        ? { ...editedLead, confirmedFacts: [...(editedLead.confirmedFacts || []), newFactOrQuestion.slice(0, 120)] }
        : { ...editedLead, openQuestions: [...(editedLead.openQuestions || []), newFactOrQuestion.slice(0, 120)] }
      
      const supabase = getSupabase()
      const { error } = await supabase.from('leads').update({
        confirmed_facts: updatedLead.confirmedFacts,
        open_questions: updatedLead.openQuestions
      }).eq('id', updatedLead.id)
      
      if (!error) {
          setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l))
          setSelectedLead(updatedLead)
          setEditedLead(updatedLead)
      }
    }
  }

  const handleRemoveFact = (index: number) => {
    if (!editedLead) return
    const newFacts = [...(editedLead.confirmedFacts || [])]
    newFacts.splice(index, 1)
    setEditedLead({ ...editedLead, confirmedFacts: newFacts })
  }

  const handleRemoveQuestion = (index: number) => {
    if (!editedLead) return
    const newQuestions = [...(editedLead.openQuestions || [])]
    newQuestions.splice(index, 1)
    setEditedLead({ ...editedLead, openQuestions: newQuestions })
  }

  const handleToggleConstraint = (constraint: ConstraintOption) => {
    if (!editedLead) return
    const current = editedLead.constraints || []
    if (current.includes(constraint)) {
      setEditedLead({ ...editedLead, constraints: current.filter(c => c !== constraint) })
    } else {
      setEditedLead({ ...editedLead, constraints: [...current, constraint] })
    }
  }

  const showWhyField = newAttempt.outcome === "DM reached → No interest"

  // Validate Next Call Objective starts with valid verb
  const objectiveIsValid = editedLead?.nextCallObjective 
    ? validObjectiveVerbs.some(v => editedLead.nextCallObjective?.startsWith(v))
    : false

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen">
        <Topbar
          title="Leads"
          showSearch
          searchPlaceholder="Search companies..."
          onSearchChange={setSearchQuery}
          actions={
            <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                  <DialogDescription>Enter basic lead info. Details can be added later.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      value={newLead.company}
                      onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      placeholder="+1 555-0100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Segment</Label>
                    <Select
                      value={newLead.segment}
                      onValueChange={(value) => setNewLead({ ...newLead, segment: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        {segmentOptions.map((seg) => (
                          <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="bg-transparent" onClick={() => setIsAddLeadOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLead} disabled={!newLead.company}>
                    Add Lead
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="flex-1 p-6">
          {/* Minimal Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                {segmentOptions.map((seg) => (
                  <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Last Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                {attemptOutcomeOptions.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lead Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Company</TableHead>
                  <TableHead className="w-[140px]">Phone</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Last Outcome</TableHead>
                  <TableHead>Next Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openLeadDrawer(lead)}
                  >
                    <TableCell className="font-medium">{lead.company}</TableCell>
                    <TableCell>
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.segment}</Badge>
                    </TableCell>
                    <TableCell>
                      {lead.lastAttempt ? (
                        <Badge className={getOutcomeColor(lead.lastAttempt.outcome)} variant="secondary">
                          {lead.lastAttempt.outcome}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">New</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.lastAttempt ? (
                        <span className="text-sm">{lead.lastAttempt.nextAction}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Call</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Showing {filteredLeads.length} of {leads.length} leads
          </p>
        </div>

        {/* ================================================================
            ATTEMPT DETAIL MODAL WITH GUARDRAIL
            ================================================================ */}
        <Dialog open={viewingAttempt !== null} onOpenChange={(open) => {
          if (!open) {
            setViewingAttempt(null)
            setShowAddToReality(false)
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Attempt Details</DialogTitle>
              <DialogDescription>
                {viewingAttempt && new Date(viewingAttempt.timestamp).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            {viewingAttempt && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getOutcomeColor(viewingAttempt.outcome)} variant="secondary">
                    {viewingAttempt.outcome}
                  </Badge>
                  {viewingAttempt.why && (
                    <Badge variant="outline">Why: {viewingAttempt.why}</Badge>
                  )}
                  {viewingAttempt.repMistake && (
                    <Badge variant="outline" className="text-red-600">Mistake: {viewingAttempt.repMistake}</Badge>
                  )}
                </div>
                
                {viewingAttempt.note && (
                  <p className="text-sm text-muted-foreground italic">{viewingAttempt.note}</p>
                )}
                
                <div className="text-sm text-muted-foreground">
                  Next action: {viewingAttempt.nextAction}
                </div>

                {viewingAttempt.recordingUrl && (
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Recording</Label>
                    <audio controls className="w-full mt-1" src={viewingAttempt.recordingUrl}>
                      <track kind="captions" />
                    </audio>
                  </div>
                )}

                {viewingAttempt.transcript && viewingAttempt.transcript.length > 0 && (
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Transcript</Label>
                    <ScrollArea className="h-48 mt-1 border rounded p-2">
                      {viewingAttempt.transcript.map((segment, i) => (
                        <div key={i} className={`p-2 mb-1 rounded text-sm ${segment.speaker === 'agent' ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'}`}>
                          <span className="text-xs font-medium capitalize">{segment.speaker === 'agent' ? 'You' : 'Contact'}: </span>
                          {segment.content}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}

                <Separator />

                {/* GUARDRAIL: Did this attempt change our understanding? */}
                {!showAddToReality ? (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium mb-3">Did this attempt change our understanding?</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="bg-transparent"
                        onClick={() => setShowAddToReality(true)}
                      >
                        Yes - Add to Account Reality
                      </Button>
                      <Button 
                        variant="ghost"
                        onClick={() => setViewingAttempt(null)}
                      >
                        No - Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Add to Account Reality</p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={addToType === "fact" ? "default" : "outline"}
                        className={addToType === "fact" ? "" : "bg-transparent"}
                        onClick={() => setAddToType("fact")}
                      >
                        Confirmed Fact
                      </Button>
                      <Button 
                        size="sm" 
                        variant={addToType === "question" ? "default" : "outline"}
                        className={addToType === "question" ? "" : "bg-transparent"}
                        onClick={() => setAddToType("question")}
                      >
                        Open Question
                      </Button>
                    </div>
                    <Input
                      value={newFactOrQuestion}
                      onChange={(e) => setNewFactOrQuestion(e.target.value)}
                      placeholder={addToType === "fact" 
                        ? "Enter confirmed fact (max 120 chars)" 
                        : "Do they... / Can they... / Will they..."}
                      maxLength={120}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleAddToAccountReality} disabled={!newFactOrQuestion.trim()}>
                        Add
                      </Button>
                      <Button variant="ghost" onClick={() => setShowAddToReality(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ================================================================
            LOG ATTEMPT MODAL
            ================================================================ */}
        <Dialog open={isLogAttemptOpen} onOpenChange={setIsLogAttemptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Attempt</DialogTitle>
              <DialogDescription>
                {selectedLead?.company}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Outcome Selection */}
              <div className="space-y-2">
                <Label>Outcome *</Label>
                <div className="grid grid-cols-1 gap-2">
                  {attemptOutcomeOptions.map((outcome) => (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => setNewAttempt({ ...newAttempt, outcome, why: null })}
                      className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                        newAttempt.outcome === outcome 
                          ? `${getOutcomeColor(outcome)} border-2` 
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {outcome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Why (conditional) */}
              {showWhyField && (
                <div className="space-y-2">
                  <Label>Why? *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {whyReasonOptions.map((why) => (
                      <button
                        key={why}
                        type="button"
                        onClick={() => setNewAttempt({ ...newAttempt, why })}
                        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                          newAttempt.why === why 
                            ? "border-primary bg-primary/10 font-medium" 
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {why}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rep Mistake (optional) */}
              {newAttempt.outcome && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Rep Mistake? (optional)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {repMistakeOptions.map((mistake) => (
                      <button
                        key={mistake}
                        type="button"
                        onClick={() => setNewAttempt({ 
                          ...newAttempt, 
                          repMistake: newAttempt.repMistake === mistake ? null : mistake 
                        })}
                        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                          newAttempt.repMistake === mistake 
                            ? "border-red-500 bg-red-50 font-medium" 
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {mistake}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Note (optional) */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Note (optional)</Label>
                <Input
                  value={newAttempt.note}
                  onChange={(e) => setNewAttempt({ ...newAttempt, note: e.target.value })}
                  placeholder="Brief note (max 120 chars)"
                  maxLength={120}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="bg-transparent" onClick={() => setIsLogAttemptOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleLogAttempt} 
                disabled={!newAttempt.outcome || (showWhyField && !newAttempt.why)}
              >
                Save Attempt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ================================================================
            ADD CONTACT MODAL
            ================================================================ */}
        <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Contact name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+1 555-0100"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex gap-2">
                  {contactRoleOptions.map((role) => (
                    <Button
                      key={role}
                      type="button"
                      variant={newContact.role === role ? "default" : "outline"}
                      className={newContact.role === role ? "" : "bg-transparent"}
                      size="sm"
                      onClick={() => setNewContact({ ...newContact, role })}
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="bg-transparent" onClick={() => setIsAddContactOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddContact} disabled={!newContact.name}>
                Add Contact
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ================================================================
            LEAD DRAWER - FINAL STRUCTURE
            ================================================================ */}
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
            {selectedLead && editedLead && (
              <>
                {/* 1. HEADER (sticky) */}
                <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedLead.company}</h2>
                      <Badge variant="outline" className="mt-1">{selectedLead.segment}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedLead.phone && (
                        <Button asChild variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                          <a href={`tel:${selectedLead.phone}`}>
                            <Phone className="h-4 w-4 mr-1" />
                            Call
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setIsLogAttemptOpen(true)}>
                        Log Attempt
                      </Button>
                      {isEditingLead ? (
                        <Button size="sm" onClick={handleSaveLead}>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setIsEditingLead(true)}>
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {/* 2. LAST ATTEMPT SUMMARY (FIRST after header) */}
                    {lastAttempt ? (
                      <Card className="bg-muted/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Last Attempt</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getOutcomeColor(lastAttempt.outcome)} variant="secondary">
                                {lastAttempt.outcome}
                              </Badge>
                              {lastAttempt.why && (
                                <span className="text-sm text-muted-foreground">Why: {lastAttempt.why}</span>
                              )}
                              {lastAttempt.repMistake && (
                                <span className="text-sm text-red-600">Mistake: {lastAttempt.repMistake}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {lastAttempt.recordingUrl && (
                                <Mic className="h-4 w-4 text-muted-foreground" />
                              )}
                              {lastAttempt.transcript && lastAttempt.transcript.length > 0 && (
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm text-muted-foreground">
                                {timeSince(lastAttempt.timestamp)}
                              </span>
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

                    {/* 3. ACCOUNT REALITY CARD (Core Card) */}
                    <Card className={!editedLead.nextCallObjective ? "border-amber-500" : ""}>
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
                            <span className="text-xs text-muted-foreground">
                              {(editedLead.confirmedFacts || []).length}/5
                            </span>
                          </div>
                          {isEditingLead ? (
                            <div className="space-y-2">
                              {(editedLead.confirmedFacts || []).map((fact, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-sm">•</span>
                                  <Input
                                    value={fact}
                                    onChange={(e) => {
                                      const newFacts = [...(editedLead.confirmedFacts || [])]
                                      newFacts[i] = e.target.value.slice(0, 120)
                                      setEditedLead({ ...editedLead, confirmedFacts: newFacts })
                                    }}
                                    maxLength={120}
                                    className="flex-1"
                                  />
                                  <Button size="icon" variant="ghost" onClick={() => handleRemoveFact(i)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              {(editedLead.confirmedFacts || []).length < 5 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-transparent"
                                  onClick={() => {
                                    setEditedLead({
                                      ...editedLead,
                                      confirmedFacts: [...(editedLead.confirmedFacts || []), ""]
                                    })
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Fact
                                </Button>
                              )}
                            </div>
                          ) : (
                            <ul className="space-y-1">
                              {(editedLead.confirmedFacts || []).length > 0 ? (
                                editedLead.confirmedFacts?.map((fact, i) => (
                                  <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span>{fact}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-sm text-muted-foreground italic">No confirmed facts yet</li>
                              )}
                            </ul>
                          )}
                        </div>

                        <Separator />

                        {/* Open Questions */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">Open Questions</Label>
                            <span className="text-xs text-muted-foreground">
                              {(editedLead.openQuestions || []).length}/3
                            </span>
                          </div>
                          {isEditingLead ? (
                            <div className="space-y-2">
                              {(editedLead.openQuestions || []).map((q, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-sm">•</span>
                                  <Input
                                    value={q}
                                    onChange={(e) => {
                                      const newQs = [...(editedLead.openQuestions || [])]
                                      newQs[i] = e.target.value.slice(0, 120)
                                      setEditedLead({ ...editedLead, openQuestions: newQs })
                                    }}
                                    placeholder="Do they... / Can they... / Will they..."
                                    maxLength={120}
                                    className="flex-1"
                                  />
                                  <Button size="icon" variant="ghost" onClick={() => handleRemoveQuestion(i)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              {(editedLead.openQuestions || []).length < 3 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-transparent"
                                  onClick={() => {
                                    setEditedLead({
                                      ...editedLead,
                                      openQuestions: [...(editedLead.openQuestions || []), ""]
                                    })
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Question
                                </Button>
                              )}
                            </div>
                          ) : (
                            <ul className="space-y-1">
                              {(editedLead.openQuestions || []).length > 0 ? (
                                editedLead.openQuestions?.map((q, i) => (
                                  <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span>{q}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-sm text-muted-foreground italic">No open questions yet</li>
                              )}
                            </ul>
                          )}
                        </div>

                        <Separator />

                        {/* Next Call Objective (REQUIRED) */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                              Next Call Objective
                              {!editedLead.nextCallObjective && (
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              )}
                            </Label>
                          </div>
                          {isEditingLead ? (
                            <div className="space-y-1">
                              <Input
                                value={editedLead.nextCallObjective || ""}
                                onChange={(e) => setEditedLead({ ...editedLead, nextCallObjective: e.target.value })}
                                placeholder="Confirm whether fuel contracts renew quarterly or annually."
                                className={!objectiveIsValid && editedLead.nextCallObjective ? "border-amber-500" : ""}
                              />
                              <p className="text-xs text-muted-foreground">
                                Must start with: Confirm, Disqualify, Book, Identify, or Test
                              </p>
                            </div>
                          ) : (
                            <p className={`text-sm ${!editedLead.nextCallObjective ? "text-amber-500 italic" : ""}`}>
                              {editedLead.nextCallObjective || "No objective set - click Edit to add one"}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* 4. LEAD INFO */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Lead Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Segment */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Segment</Label>
                            {isEditingLead ? (
                              <Select
                                value={editedLead.segment}
                                onValueChange={(v) => setEditedLead({ ...editedLead, segment: v })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {segmentOptions.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm mt-1">{editedLead.segment}</p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Decision Maker?</Label>
                            {isEditingLead ? (
                              <div className="flex gap-1 mt-1">
                                {(["yes", "no", "unknown"] as const).map((v) => (
                                  <Button
                                    key={v}
                                    type="button"
                                    size="sm"
                                    variant={editedLead.isDecisionMaker === v ? "default" : "outline"}
                                    className={editedLead.isDecisionMaker === v ? "" : "bg-transparent"}
                                    onClick={() => setEditedLead({ ...editedLead, isDecisionMaker: v })}
                                  >
                                    {v === "yes" ? "Yes" : v === "no" ? "No" : "?"}
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm mt-1 capitalize">{editedLead.isDecisionMaker || "Unknown"}</p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Fleet Owner?</Label>
                            {isEditingLead ? (
                              <div className="flex gap-1 mt-1">
                                {(["yes", "no", "unknown"] as const).map((v) => (
                                  <Button
                                    key={v}
                                    type="button"
                                    size="sm"
                                    variant={editedLead.isFleetOwner === v ? "default" : "outline"}
                                    className={editedLead.isFleetOwner === v ? "" : "bg-transparent"}
                                    onClick={() => setEditedLead({ ...editedLead, isFleetOwner: v })}
                                  >
                                    {v === "yes" ? "Yes" : v === "no" ? "No" : "?"}
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm mt-1 capitalize">{editedLead.isFleetOwner || "Unknown"}</p>
                            )}
                          </div>
                        </div>

                        {/* Operational Context */}
                        <div>
                          <Label className="text-xs text-muted-foreground">Operational Context</Label>
                          {isEditingLead ? (
                            <Textarea
                              value={editedLead.operationalContext || ""}
                              onChange={(e) => setEditedLead({ ...editedLead, operationalContext: e.target.value })}
                              placeholder="Facts about their operating environment, not opinions."
                              className="mt-1"
                              rows={2}
                            />
                          ) : (
                            <p className="text-sm mt-1 text-muted-foreground">
                              {editedLead.operationalContext || "-"}
                            </p>
                          )}
                        </div>

                        {/* Constraints (chips) */}
                        <div>
                          <Label className="text-xs text-muted-foreground">Constraints</Label>
                          {isEditingLead ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {constraintOptions.map((c) => (
                                <Badge
                                  key={c}
                                  variant={(editedLead.constraints || []).includes(c) ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => handleToggleConstraint(c)}
                                >
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(editedLead.constraints || []).length > 0 ? (
                                editedLead.constraints?.map((c) => (
                                  <Badge key={c} variant="secondary">{c}</Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </div>
                          )}
                          {isEditingLead && (
                            <Input
                              value={editedLead.constraintOther || ""}
                              onChange={(e) => setEditedLead({ ...editedLead, constraintOther: e.target.value })}
                              placeholder="Other constraint..."
                              className="mt-2"
                            />
                          )}
                        </div>

                        {/* Opportunity Angle */}
                        <div>
                          <Label className="text-xs text-muted-foreground">Opportunity Angle</Label>
                          {isEditingLead ? (
                            <Input
                              value={editedLead.opportunityAngle || ""}
                              onChange={(e) => setEditedLead({ ...editedLead, opportunityAngle: e.target.value.slice(0, 100) })}
                              placeholder="One-sentence reason this product could matter to them."
                              className="mt-1"
                              maxLength={100}
                            />
                          ) : (
                            <p className="text-sm mt-1 text-muted-foreground">
                              {editedLead.opportunityAngle || "-"}
                            </p>
                          )}
                        </div>

                        {/* Advanced (collapsed) */}
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="advanced" className="border-none">
                            <AccordionTrigger className="text-xs text-muted-foreground py-2">
                              Advanced
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Website</Label>
                                  {isEditingLead ? (
                                    <Input
                                      value={editedLead.website || ""}
                                      onChange={(e) => setEditedLead({ ...editedLead, website: e.target.value })}
                                      className="mt-1"
                                    />
                                  ) : (
                                    <p className="text-sm mt-1">{editedLead.website || "-"}</p>
                                  )}
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Email</Label>
                                  {isEditingLead ? (
                                    <Input
                                      value={editedLead.email || ""}
                                      onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                                      className="mt-1"
                                    />
                                  ) : (
                                    <p className="text-sm mt-1">{editedLead.email || "-"}</p>
                                  )}
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Address</Label>
                                  {isEditingLead ? (
                                    <Input
                                      value={editedLead.address || ""}
                                      onChange={(e) => setEditedLead({ ...editedLead, address: e.target.value })}
                                      className="mt-1"
                                    />
                                  ) : (
                                    <p className="text-sm mt-1">{editedLead.address || "-"}</p>
                                  )}
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Lead Source</Label>
                                  {isEditingLead ? (
                                    <Input
                                      value={editedLead.leadSource || ""}
                                      onChange={(e) => setEditedLead({ ...editedLead, leadSource: e.target.value })}
                                      className="mt-1"
                                    />
                                  ) : (
                                    <p className="text-sm mt-1">{editedLead.leadSource || "-"}</p>
                                  )}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>

                    {/* 5. CONTACTS */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">Contacts</CardTitle>
                          {isEditingLead && (
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setIsAddContactOpen(true)}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {editedLead.contacts.length > 0 ? (
                          <div className="space-y-2">
                            {editedLead.contacts.map((contact, i) => (
                              <div
                                key={contact.id}
                                className="flex items-center justify-between p-2 rounded border"
                              >
                                <div className="flex items-center gap-3">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className={i === 0 ? "text-amber-500" : "text-muted-foreground"}
                                    onClick={() => isEditingLead && handleSetPrimaryContact(contact.id)}
                                    disabled={!isEditingLead}
                                  >
                                    <Star className={`h-4 w-4 ${i === 0 ? "fill-current" : ""}`} />
                                  </Button>
                                  <div>
                                    <p className="text-sm font-medium">{contact.name}</p>
                                    {contact.phone && (
                                      <a href={`tel:${contact.phone}`} className="text-xs text-primary hover:underline">
                                        {contact.phone}
                                      </a>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isEditingLead ? (
                                    <div className="flex gap-1">
                                      {contactRoleOptions.map((role) => (
                                        <Button
                                          key={role}
                                          size="sm"
                                          variant={contact.role === role ? "default" : "outline"}
                                          className={contact.role === role ? "" : "bg-transparent"}
                                          onClick={() => {
                                            const newContacts = [...editedLead.contacts]
                                            newContacts[i] = { ...contact, role }
                                            setEditedLead({ ...editedLead, contacts: newContacts })
                                          }}
                                        >
                                          {role}
                                        </Button>
                                      ))}
                                    </div>
                                  ) : (
                                    <Badge variant="outline">{contact.role}</Badge>
                                  )}
                                  {isEditingLead && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-muted-foreground hover:text-red-600"
                                      onClick={() => handleDeleteContact(contact.id)}
                                    >
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

                    {/* 6. ATTEMPTS TIMELINE */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Attempts ({selectedLeadAttempts.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedLeadAttempts.length > 0 ? (
                          <div className="space-y-2">
                            {selectedLeadAttempts.map((attempt) => (
                              <div
                                key={attempt.id}
                                className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => setViewingAttempt(attempt)}
                              >
                                <div className="flex items-center gap-2">
                                  <Badge className={getOutcomeColor(attempt.outcome)} variant="secondary">
                                    {attempt.outcome}
                                  </Badge>
                                  {attempt.why && (
                                    <span className="text-xs text-muted-foreground">{attempt.why}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {attempt.recordingUrl && (
                                    <Mic className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  {attempt.transcript && attempt.transcript.length > 0 && (
                                    <FileText className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {timeSince(attempt.timestamp)}
                                  </span>
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
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}

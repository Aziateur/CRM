"use client"

import { useState, useMemo } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Topbar } from "@/components/topbar"
import { useLeads } from "@/hooks/use-leads"
import { useAttempts } from "@/hooks/use-attempts"
import { usePipelineStages } from "@/hooks/use-pipeline-stages"
import { useTasks } from "@/hooks/use-tasks"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import { LeadsTable, deriveLeadFields, type LeadWithDerived } from "@/components/leads-table"
import { KanbanBoard } from "@/components/kanban-board"
import { TasksDashboard } from "@/components/tasks-dashboard"
import { LeadDrawer } from "@/components/lead-drawer"
import { LogAttemptModal } from "@/components/log-attempt-modal"
import { AttemptDetailModal } from "@/components/attempt-detail-modal"
import { AddLeadDialog } from "@/components/add-lead-dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  segmentOptions,
  attemptOutcomeOptions,
  getEffectiveStage,
  type Lead,
  type Attempt,
} from "@/lib/store"
import { LayoutGrid, Table2 } from "lucide-react"

type ViewMode = "table" | "kanban"

export default function LeadsPage() {
  const { toast } = useToast()
  const { leads, setLeads, loading: leadsLoading, refetch: refetchLeads } = useLeads()
  const { attempts, setAttempts, loading: attemptsLoading } = useAttempts()
  const { stages } = usePipelineStages()
  const { tasks, completeTask } = useTasks()
  const { fields: fieldDefinitions } = useFieldDefinitions("lead")

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("table")

  // Filters
  const [segmentFilter, setSegmentFilter] = useState<string>("all")
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Drawer & modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLogAttemptOpen, setIsLogAttemptOpen] = useState(false)
  const [viewingAttempt, setViewingAttempt] = useState<Attempt | null>(null)

  // Derive fields for display
  const leadsWithDerived = useMemo(
    () => leads.map((lead) => deriveLeadFields(lead, attempts)),
    [leads, attempts]
  )

  const filteredLeads = leadsWithDerived.filter((lead) => {
    const matchesSegment = segmentFilter === "all" || lead.segment === segmentFilter
    const matchesOutcome = outcomeFilter === "all" || lead.lastAttempt?.outcome === outcomeFilter
    const matchesStage = stageFilter === "all" || getEffectiveStage(lead, attempts) === stageFilter
    const matchesSearch = lead.company.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSegment && matchesOutcome && matchesStage && matchesSearch
  })

  const openLeadDrawer = (lead: LeadWithDerived) => {
    setSelectedLead(lead)
    setIsDrawerOpen(true)
  }

  const openLeadById = (leadId: string) => {
    const lead = leadsWithDerived.find((l) => l.id === leadId)
    if (lead) openLeadDrawer(lead)
  }

  const handleCall = async () => {
    if (!selectedLead || !selectedLead.phone) return
    const phone = selectedLead.phone.replace(/[^+\d]/g, "")
    const w = window.open(`tel:${phone}`, "_blank", "noopener,noreferrer")
    if (!w) {
      toast({ variant: "destructive", title: "Popup blocked", description: "Please allow popups for this site to launch the dialer." })
    }
    try { await navigator.clipboard.writeText(phone) } catch { /* ignore */ }

    if (process.env.NEXT_PUBLIC_SANDBOX_CALLS === "true") {
      const supabase = getSupabase()
      try {
        const { data: attempt, error } = await supabase.from("attempts").insert([{
          lead_id: selectedLead.id, timestamp: new Date().toISOString(), outcome: "No connect", dm_reached: false, next_action: "Call again", duration_sec: 0,
        }]).select().single()
        if (!error && attempt) {
          await supabase.from("call_sessions").insert([{
            attempt_id: attempt.id, lead_id: selectedLead.id, phone_e164: phone, direction: "outgoing", status: "initiated", started_at: new Date().toISOString(),
          }])
        }
      } catch (e) { console.error("Call logging error:", e) }
    }
  }

  const handleLeadAdded = (lead: Lead) => {
    setLeads([lead, ...leads])
  }

  const handleLeadUpdated = (updated: Lead) => {
    setLeads(leads.map((l) => (l.id === updated.id ? updated : l)))
    setSelectedLead(updated)
  }

  const handleAttemptLogged = (attempt: Attempt) => {
    setAttempts([attempt, ...attempts])
  }

  const loading = leadsLoading || attemptsLoading

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar
        title="Leads"
        showSearch
        searchPlaceholder="Search companies..."
        onSearchChange={setSearchQuery}
        actions={<AddLeadDialog onLeadAdded={handleLeadAdded} />}
      />

      <div className="flex-1 p-6">
        {/* Tasks Dashboard */}
        {tasks.length > 0 && (
          <div className="mb-6">
            <TasksDashboard
              tasks={tasks}
              leads={leads}
              onCompleteTask={completeTask}
              onSelectLead={openLeadById}
            />
          </div>
        )}

        {/* Filters + View Toggle */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
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

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
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

          <div className="ml-auto flex items-center gap-1 border rounded-lg p-0.5">
            <Button
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              className="h-7 px-2"
              onClick={() => setViewMode("table")}
            >
              <Table2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "kanban" ? "default" : "ghost"}
              className="h-7 px-2"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main View */}
        {viewMode === "table" ? (
          <LeadsTable
            leads={filteredLeads}
            loading={loading}
            stages={stages}
            attempts={attempts}
            fieldDefinitions={fieldDefinitions}
            onSelectLead={openLeadDrawer}
          />
        ) : (
          <KanbanBoard
            leads={filteredLeads}
            stages={stages}
            attempts={attempts}
            onSelectLead={openLeadDrawer}
            onLeadsChanged={refetchLeads}
          />
        )}

        <p className="text-sm text-muted-foreground mt-4">
          Showing {filteredLeads.length} of {leads.length} leads
        </p>
      </div>

      {/* Modals & Drawer */}
      <LeadDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        lead={selectedLead}
        attempts={attempts}
        onLeadUpdated={handleLeadUpdated}
        onLogAttempt={() => setIsLogAttemptOpen(true)}
        onViewAttempt={setViewingAttempt}
        onCall={handleCall}
      />

      <LogAttemptModal
        open={isLogAttemptOpen}
        onOpenChange={setIsLogAttemptOpen}
        lead={selectedLead}
        onAttemptLogged={handleAttemptLogged}
      />

      <AttemptDetailModal
        attempt={viewingAttempt}
        onClose={() => setViewingAttempt(null)}
        lead={selectedLead}
        onLeadUpdated={handleLeadUpdated}
      />
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { Topbar } from "@/components/topbar"
import { FieldEditor } from "@/components/field-editor"
import { PipelineEditor } from "@/components/pipeline-editor"
import { LeadImport } from "@/components/lead-import"
import { TagManager } from "@/components/tag-manager"
import { TemplateManager } from "@/components/template-manager"
import { DuplicateDetector } from "@/components/duplicate-detector"
import { WorkflowEditor } from "@/components/workflow-editor"
import { SequenceManager } from "@/components/sequence-editor"
import { useLeads } from "@/hooks/use-leads"
import { useAttempts } from "@/hooks/use-attempts"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import { exportLeadsCSV, exportAttemptsCSV } from "@/lib/csv"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { CheckCircle2, XCircle, RefreshCw, Download, Phone, ExternalLink, Database, Cloud, ChevronDown, Plus, Trash2, RotateCcw } from "lucide-react"
import { useFramework } from "@/hooks/use-framework"
import {
  DEFAULT_FRAMEWORK,
  type Framework,
  type Lever,
  type Marker,
  type Phase,
  type PrimaryGoal,
  type PeriodConfig,
} from "@/lib/framework"

// ============================================================================
// TAB 1 — PIPELINE (sub-components inline: PipelineEditor, FieldEditor, TagManager)
// ============================================================================

function PipelineTab() {
  return (
    <div className="space-y-10">
      <PipelineEditor />
      <FieldEditor />
      <TagManager />
    </div>
  )
}

// ============================================================================
// TAB 2 — AUTOMATION (Templates + Workflows)
// ============================================================================

function AutomationTab() {
  return (
    <div className="space-y-10">
      <TemplateManager />
      <WorkflowEditor />
    </div>
  )
}

// ============================================================================
// TAB 3 — DATA (Import/Export + Duplicates)
// ============================================================================

function DataTab() {
  const { toast } = useToast()
  const { leads, setLeads, refetch } = useLeads()
  const { attempts } = useAttempts()
  const { fields: fieldDefinitions } = useFieldDefinitions("lead")

  return (
    <div className="space-y-10">
      {/* Import / Export */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Data Management</h3>
        <div className="border rounded-lg divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Import Leads</p>
              <p className="text-xs text-muted-foreground">Upload a CSV file to bulk-import leads</p>
            </div>
            <LeadImport
              fieldDefinitions={fieldDefinitions}
              onImported={(imported) => {
                setLeads((prev) => [...imported, ...prev])
                toast({ title: `${imported.length} leads imported` })
              }}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Export Leads</p>
              <p className="text-xs text-muted-foreground">{leads.length} leads as CSV</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportLeadsCSV(leads, attempts, fieldDefinitions)
                toast({ title: `Exported ${leads.length} leads` })
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Export Call History</p>
              <p className="text-xs text-muted-foreground">{attempts.length} call attempts as CSV</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportAttemptsCSV(attempts, leads)
                toast({ title: `Exported ${attempts.length} call records` })
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Duplicate Detection */}
      <DuplicateDetector leads={leads} onLeadsChanged={refetch} />
    </div>
  )
}

// ============================================================================
// TAB 4 — SEQUENCES
// ============================================================================

function SequencesTab() {
  return <SequenceManager />
}

// ============================================================================
// TAB 5 — FRAMEWORK (Modes + Levers)
// ============================================================================

function FrameworkTab() {
  const { toast } = useToast()
  const { framework, saveFramework } = useFramework()
  const [localFw, setLocalFw] = useState<Framework>(framework)
  const [newLeverLabel, setNewLeverLabel] = useState("")
  const [newLeverPrompt, setNewLeverPrompt] = useState("")
  const [newMarkerLabel, setNewMarkerLabel] = useState("")
  const [newMarkerDef, setNewMarkerDef] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [jsonDraft, setJsonDraft] = useState("")
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)

  // Sync local state when framework changes externally
  useEffect(() => {
    setLocalFw(framework)
  }, [framework])

  const hasUnsavedChanges = JSON.stringify(localFw) !== JSON.stringify(framework)

  const handleSave = () => {
    const result = saveFramework(localFw)
    if (result.ok) {
      toast({ title: "Framework saved" })
    } else {
      toast({ variant: "destructive", title: "Save failed", description: result.error })
    }
  }

  const handleReset = () => {
    setLocalFw(structuredClone(DEFAULT_FRAMEWORK))
    toast({ title: "Reset to defaults (save to apply)" })
  }

  // --- Phase helpers ---
  const updatePhase = (phaseKey: string, patch: Partial<Phase>) => {
    setLocalFw(prev => ({
      ...prev,
      phases: prev.phases.map(p =>
        p.key === phaseKey ? { ...p, ...patch } : p
      ),
    }))
  }

  const handleAddPhase = () => {
    const key = "phase_" + Date.now()
    const newPhase: Phase = {
      key,
      label: "New Phase",
      whyText: "",
      doText: "",
      winText: "",
      focusLeverKey: localFw.levers[0]?.key || "",
      primaryGoal: "reps",
      target: 40,
      period: { type: "iso_week" },
    }
    setLocalFw(prev => ({
      ...prev,
      phases: [...prev.phases, newPhase],
    }))
    setExpandedPhase(key)
  }

  const handleDeletePhase = (phaseKey: string) => {
    if (localFw.phases.length <= 1) {
      toast({ variant: "destructive", title: "At least one phase required" })
      return
    }
    setLocalFw(prev => {
      const phases = prev.phases.filter(p => p.key !== phaseKey)
      const activePhaseKey = prev.activePhaseKey === phaseKey ? phases[0].key : prev.activePhaseKey
      return { ...prev, phases, activePhaseKey }
    })
  }

  const handleMovePhase = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= localFw.phases.length) return
    setLocalFw(prev => {
      const phases = [...prev.phases]
      ;[phases[index], phases[newIndex]] = [phases[newIndex], phases[index]]
      return { ...prev, phases }
    })
  }

  // --- Period helpers ---
  const getPeriodSelectValue = (p: PeriodConfig): string => {
    if (p.type === "rolling_days") return "rolling_days"
    return p.type
  }
  const handlePeriodTypeChange = (phaseKey: string, val: string) => {
    if (val === "rolling_days") {
      updatePhase(phaseKey, { period: { type: "rolling_days", days: 7 } })
    } else if (val === "iso_week") {
      updatePhase(phaseKey, { period: { type: "iso_week" } })
    } else {
      updatePhase(phaseKey, { period: { type: "today" } })
    }
  }
  const handleRollingDaysChange = (phaseKey: string, days: number) => {
    updatePhase(phaseKey, { period: { type: "rolling_days", days: Math.max(1, Math.min(365, days)) } })
  }

  // --- Marker helpers ---
  const handleAddMarker = () => {
    const label = newMarkerLabel.trim()
    if (!label) return
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_")
    if (localFw.markers.some(m => m.key === key)) {
      toast({ variant: "destructive", title: "Marker key already exists" })
      return
    }
    setLocalFw(prev => ({
      ...prev,
      markers: [...prev.markers, { key, label, definition: newMarkerDef.trim() || undefined }],
    }))
    setNewMarkerLabel("")
    setNewMarkerDef("")
  }

  const handleDeleteMarker = (markerKey: string) => {
    const usedBy = localFw.phases.filter(p =>
      p.actionMarkerKey === markerKey || p.winMarkerKey === markerKey
    )
    if (usedBy.length > 0) {
      toast({
        variant: "destructive",
        title: "Cannot delete",
        description: `Used by: ${usedBy.map(p => p.label).join(", ")}`,
      })
      return
    }
    setLocalFw(prev => ({
      ...prev,
      markers: prev.markers.filter(m => m.key !== markerKey),
    }))
  }

  const updateMarker = (markerKey: string, patch: Partial<Marker>) => {
    setLocalFw(prev => ({
      ...prev,
      markers: prev.markers.map(m =>
        m.key === markerKey ? { ...m, ...patch } : m
      ),
    }))
  }

  // --- Lever helpers ---
  const handleAddLever = () => {
    const label = newLeverLabel.trim()
    if (!label) return
    const key = "custom." + label.toLowerCase().replace(/[^a-z0-9]+/g, "_")
    if (localFw.levers.some(l => l.key === key)) {
      toast({ variant: "destructive", title: "Lever key already exists" })
      return
    }
    setLocalFw(prev => ({
      ...prev,
      levers: [...prev.levers, { key, label, prompt: newLeverPrompt.trim() || undefined }],
    }))
    setNewLeverLabel("")
    setNewLeverPrompt("")
  }

  const handleDeleteLever = (leverKey: string) => {
    const usedBy = localFw.phases.filter(p => p.focusLeverKey === leverKey)
    if (usedBy.length > 0) {
      toast({
        variant: "destructive",
        title: "Cannot delete",
        description: `Used by phase: ${usedBy.map(p => p.label).join(", ")}`,
      })
      return
    }
    setLocalFw(prev => ({
      ...prev,
      levers: prev.levers.filter(l => l.key !== leverKey),
    }))
  }

  const handleMoveLever = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= localFw.levers.length) return
    setLocalFw(prev => {
      const levers = [...prev.levers]
      ;[levers[index], levers[newIndex]] = [levers[newIndex], levers[index]]
      return { ...prev, levers }
    })
  }

  const handleJsonSave = () => {
    try {
      const parsed = JSON.parse(jsonDraft)
      const result = saveFramework(parsed)
      if (result.ok) {
        setLocalFw(parsed)
        toast({ title: "Framework saved from JSON" })
      } else {
        toast({ variant: "destructive", title: "Validation failed", description: result.error })
      }
    } catch {
      toast({ variant: "destructive", title: "Invalid JSON" })
    }
  }

  const primaryGoalOptions: { value: PrimaryGoal; label: string }[] = [
    { value: "reps", label: "Calls (reps)" },
    { value: "action", label: "Actions (did the move)" },
    { value: "win", label: "Wins (it worked)" },
    { value: "outcome_meetings", label: "Meetings booked" },
  ]

  return (
    <div className="space-y-6">
      {/* Active Phase */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Phase</h3>
        <Select
          value={localFw.activePhaseKey}
          onValueChange={(v) => setLocalFw(prev => ({ ...prev, activePhaseKey: v }))}
        >
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {localFw.phases.map(p => (
              <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── PHASES ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Phases</h3>
          <Button size="sm" variant="outline" className="h-7 bg-transparent" onClick={handleAddPhase}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Phase
          </Button>
        </div>
        <div className="border rounded-lg divide-y">
          {localFw.phases.map((phase, phaseIdx) => {
            const isExpanded = expandedPhase === phase.key
            return (
              <div key={phase.key} className="px-4 py-3">
                {/* Phase header row */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      className="text-muted-foreground hover:text-foreground text-xs leading-none disabled:opacity-30"
                      disabled={phaseIdx === 0}
                      onClick={() => handleMovePhase(phaseIdx, -1)}
                    >▲</button>
                    <button
                      className="text-muted-foreground hover:text-foreground text-xs leading-none disabled:opacity-30"
                      disabled={phaseIdx === localFw.phases.length - 1}
                      onClick={() => handleMovePhase(phaseIdx, 1)}
                    >▼</button>
                  </div>
                  <button
                    className="flex-1 text-left"
                    onClick={() => setExpandedPhase(isExpanded ? null : phase.key)}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{phase.label}</p>
                      {localFw.activePhaseKey === phase.key && (
                        <Badge variant="default" className="text-[10px] h-4">Active</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">{phase.primaryGoal}</Badge>
                    </div>
                    {!isExpanded && phase.whyText && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">Why: {phase.whyText}</p>
                    )}
                  </button>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleDeletePhase(phase.key)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>

                {/* Expanded phase editor */}
                {isExpanded && (
                  <div className="mt-3 space-y-3 pl-6">
                    {/* Label */}
                    <div>
                      <Label className="text-xs">Phase Name</Label>
                      <Input
                        className="h-8 text-sm mt-1"
                        value={phase.label}
                        onChange={(e) => updatePhase(phase.key, { label: e.target.value })}
                      />
                    </div>

                    {/* Story: WHY / DO / WIN definition */}
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pt-1">Story</p>
                    <div>
                      <Label className="text-xs">Why (bottleneck hypothesis)</Label>
                      <Input
                        className="h-8 text-sm mt-1"
                        placeholder="My calls aren't converting — I need better execution"
                        value={phase.whyText}
                        onChange={(e) => updatePhase(phase.key, { whyText: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Do (behavior each call)</Label>
                      <Input
                        className="h-8 text-sm mt-1"
                        placeholder="Practice the focus skill consciously on every call"
                        value={phase.doText}
                        onChange={(e) => updatePhase(phase.key, { doText: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Win definition (what counts as progress)</Label>
                      <Input
                        className="h-8 text-sm mt-1"
                        placeholder="High action rate with new truths gained on most connects"
                        value={phase.winText}
                        onChange={(e) => updatePhase(phase.key, { winText: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Exit Criteria (when to switch phases)</Label>
                      <Input
                        className="h-8 text-sm mt-1"
                        placeholder="Action rate > 80% for two weeks"
                        value={phase.exitCriteria || ""}
                        onChange={(e) => updatePhase(phase.key, { exitCriteria: e.target.value || undefined })}
                      />
                    </div>

                    {/* Tracking */}
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pt-2">Tracking</p>

                    {/* Primary Goal */}
                    <div>
                      <Label className="text-xs">Primary Goal</Label>
                      <Select value={phase.primaryGoal} onValueChange={(v) => updatePhase(phase.key, { primaryGoal: v as PrimaryGoal })}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {primaryGoalOptions.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Target + Period + Focus Lever */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Target</Label>
                        <Input
                          type="number"
                          min={0}
                          max={999}
                          className="h-8 text-sm mt-1"
                          value={phase.target}
                          onChange={(e) => updatePhase(phase.key, { target: Math.max(0, Math.min(999, parseInt(e.target.value) || 0)) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Period</Label>
                        <div className="flex gap-1 mt-1">
                          <Select value={getPeriodSelectValue(phase.period)} onValueChange={(v) => handlePeriodTypeChange(phase.key, v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="iso_week">This week</SelectItem>
                              <SelectItem value="rolling_days">Rolling...</SelectItem>
                              <SelectItem value="today">Today</SelectItem>
                            </SelectContent>
                          </Select>
                          {phase.period.type === "rolling_days" && (
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              className="h-8 text-xs w-16"
                              value={phase.period.days}
                              onChange={(e) => handleRollingDaysChange(phase.key, parseInt(e.target.value) || 7)}
                            />
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Focus Lever</Label>
                        <Select value={phase.focusLeverKey} onValueChange={(v) => updatePhase(phase.key, { focusLeverKey: v })}>
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {localFw.levers.map(l => (
                              <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Action checkbox + Win checkbox */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Action checkbox</Label>
                        <p className="text-[10px] text-muted-foreground mb-1">Did you do the move?</p>
                        <Select
                          value={phase.actionMarkerKey || "__none__"}
                          onValueChange={(v) => updatePhase(phase.key, { actionMarkerKey: v === "__none__" ? undefined : v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {localFw.markers.map(m => (
                              <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Win checkbox</Label>
                        <p className="text-[10px] text-muted-foreground mb-1">Did it work?</p>
                        <Select
                          value={phase.winMarkerKey || "__none__"}
                          onValueChange={(v) => updatePhase(phase.key, { winMarkerKey: v === "__none__" ? undefined : v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {localFw.markers.map(m => (
                              <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── MARKERS ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Markers</h3>
        <p className="text-xs text-muted-foreground">
          Markers are Y/N observations you record per call. Phases use them as action and win checkboxes.
        </p>
        <div className="border rounded-lg divide-y">
          {localFw.markers.map((marker) => (
            <div key={marker.key} className="px-4 py-2 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Input
                    className="h-7 text-sm font-medium border-0 px-0 shadow-none focus-visible:ring-0"
                    value={marker.label}
                    onChange={(e) => updateMarker(marker.key, { label: e.target.value })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono shrink-0">{marker.key}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleDeleteMarker(marker.key)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
              <Input
                className="h-6 text-xs text-muted-foreground border-0 px-0 shadow-none focus-visible:ring-0"
                placeholder="Definition (shown as tooltip in logger)"
                value={marker.definition || ""}
                onChange={(e) => updateMarker(marker.key, { definition: e.target.value || undefined })}
              />
            </div>
          ))}
          {/* Add marker row */}
          <div className="px-4 py-2 space-y-1">
            <div className="flex items-center gap-2">
              <Input
                placeholder="New marker label..."
                className="h-8 text-sm flex-1"
                value={newMarkerLabel}
                onChange={(e) => setNewMarkerLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddMarker() }}
              />
              <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={handleAddMarker}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
            {newMarkerLabel && (
              <Input
                placeholder="Definition (optional)"
                className="h-7 text-xs"
                value={newMarkerDef}
                onChange={(e) => setNewMarkerDef(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── LEVERS ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Levers</h3>
        <p className="text-xs text-muted-foreground">
          Behavior reminders shown during calls. Each phase picks one as its focus lever.
        </p>
        <div className="border rounded-lg divide-y">
          {localFw.levers.map((lever, i) => (
            <div key={lever.key} className="flex items-center gap-2 px-4 py-2">
              <div className="flex flex-col gap-0.5">
                <button
                  className="text-muted-foreground hover:text-foreground text-xs leading-none disabled:opacity-30"
                  disabled={i === 0}
                  onClick={() => handleMoveLever(i, -1)}
                >▲</button>
                <button
                  className="text-muted-foreground hover:text-foreground text-xs leading-none disabled:opacity-30"
                  disabled={i === localFw.levers.length - 1}
                  onClick={() => handleMoveLever(i, 1)}
                >▼</button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{lever.label}</p>
                {lever.prompt && (
                  <p className="text-[10px] text-muted-foreground truncate">{lever.prompt}</p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono shrink-0">{lever.key}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => handleDeleteLever(lever.key)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
          {/* Add lever row */}
          <div className="px-4 py-2 space-y-1">
            <div className="flex items-center gap-2">
              <Input
                placeholder="New lever name..."
                className="h-8 text-sm flex-1"
                value={newLeverLabel}
                onChange={(e) => setNewLeverLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddLever() }}
              />
              <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={handleAddLever}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
            {newLeverLabel && (
              <Input
                placeholder="Coaching prompt (optional)"
                className="h-7 text-xs"
                value={newLeverPrompt}
                onChange={(e) => setNewLeverPrompt(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Save / Reset */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
          Save Changes
        </Button>
        <Button variant="outline" className="bg-transparent" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset to Defaults
        </Button>
      </div>

      {/* Advanced JSON editor */}
      <Collapsible open={showAdvanced} onOpenChange={(open) => {
        setShowAdvanced(open)
        if (open) setJsonDraft(JSON.stringify(localFw, null, 2))
      }}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            <span className="text-sm text-muted-foreground">Advanced: JSON Editor</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-3">
          <Textarea
            className="font-mono text-xs min-h-[300px]"
            value={jsonDraft}
            onChange={(e) => setJsonDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleJsonSave}>
              Validate & Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-transparent"
              onClick={() => {
                navigator.clipboard.writeText(jsonDraft)
                toast({ title: "Copied to clipboard" })
              }}
            >
              Export (Copy)
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-transparent"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText()
                  setJsonDraft(text)
                  toast({ title: "Pasted from clipboard" })
                } catch {
                  toast({ variant: "destructive", title: "Clipboard access denied" })
                }
              }}
            >
              Import (Paste)
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// ============================================================================
// TAB 6 — SYSTEM (Diagnostics + Dev Tools / Integrations)
// ============================================================================

interface DiagCheck {
  status: "pending" | "success" | "error"
  details?: Record<string, string>
  message?: string
}

function StatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === "error") return <XCircle className="h-4 w-4 text-red-500" />
  return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
}

function SystemTab() {
  const [checks, setChecks] = useState<Record<string, DiagCheck>>({
    env: { status: "pending", details: {} },
    supabase: { status: "pending", message: "" },
    browser: { status: "pending", details: {} },
  })

  const runDiagnostics = async () => {
    setChecks({
      env: { status: "pending", details: {} },
      supabase: { status: "pending", message: "" },
      browser: { status: "pending", details: {} },
    })

    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
    const envStatus = envVars.NEXT_PUBLIC_SUPABASE_URL && envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "success" : "error"

    let sbStatus: "success" | "error" = "error"
    let sbMessage = ""
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("leads").select("count").limit(1)
      if (error) {
        sbMessage = `Error ${error.code}: ${error.message}`
      } else {
        sbStatus = "success"
        sbMessage = "Connected successfully"
      }
    } catch (e) {
      sbMessage = `Client Init Failed: ${e instanceof Error ? e.message : "Unknown error"}`
    }

    setChecks({
      env: {
        status: envStatus as "success" | "error",
        details: {
          url: envVars.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "MISSING",
          key: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "MISSING",
        },
      },
      supabase: { status: sbStatus, message: sbMessage },
      browser: {
        status: "success",
        details: {
          online: navigator.onLine ? "Yes" : "No",
          cookies: navigator.cookieEnabled ? "Enabled" : "Disabled",
        },
      },
    })
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const webhookUrl = "https://ali-auto-cyberbellum.app.n8n.cloud/webhook/openphone"

  return (
    <div className="space-y-10">
      {/* Diagnostics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">System Diagnostics</h3>
          <Button onClick={runDiagnostics} variant="ghost" size="sm" className="h-8">
            <RefreshCw className="mr-1 h-3 w-3" /> Re-run
          </Button>
        </div>
        <div className="border rounded-lg divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Environment Variables</p>
              <p className="text-xs text-muted-foreground">
                Supabase URL: {checks.env.details?.url} &middot; Anon Key: {checks.env.details?.key}
              </p>
            </div>
            <StatusIcon status={checks.env.status} />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Supabase Connection</p>
              <p className="text-xs text-muted-foreground">{checks.supabase.message || "Checking..."}</p>
            </div>
            <StatusIcon status={checks.supabase.status} />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Browser</p>
              <p className="text-xs text-muted-foreground">
                Online: {checks.browser.details?.online ?? "..."} &middot; Cookies: {checks.browser.details?.cookies ?? "..."}
              </p>
            </div>
            <StatusIcon status={checks.browser.status} />
          </div>
        </div>
      </div>

      {/* Integrations (from Dev Tools) */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Integrations</h3>

        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>How integrations work</AlertTitle>
          <AlertDescription>
            This is a static SPA — there are no API routes. OpenPhone sends webhooks to n8n,
            which writes to Supabase. The frontend reads from Supabase.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4" />
              OpenPhone
            </CardTitle>
            <CardDescription>
              VoIP provider — calls, recordings, and transcripts flow through n8n webhooks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-700 border-green-300">Active</Badge>
              <span className="text-sm text-muted-foreground">Webhooks configured in OpenPhone dashboard</span>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Events:</span> call.completed, call.recording.completed, call.transcript.completed</p>
              <p>
                <span className="font-medium">Webhook URL:</span>{" "}
                <code className="bg-muted px-2 py-0.5 rounded text-xs">{webhookUrl}</code>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage in{" "}
              <a
                href="https://app.openphone.com/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                OpenPhone Settings <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              n8n Workflow Automation
            </CardTitle>
            <CardDescription>
              Processes OpenPhone webhooks and writes to Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-700 border-green-300">Active</Badge>
              <span className="text-sm text-muted-foreground">1 workflow running</span>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Workflow:</span> OpenPhone Call Event Processor with Database Logging</p>
              <p><span className="font-medium">Flow:</span> Webhook → Log event → Route by type → Upsert call session / Save artifacts</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage at{" "}
              <a
                href="https://ali-auto-cyberbellum.app.n8n.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                n8n Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Supabase (PostgreSQL)
            </CardTitle>
            <CardDescription>
              Database for leads, attempts, call sessions, and webhook events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-700 border-green-300">Connected</Badge>
              <span className="text-sm text-muted-foreground">Client-side queries via anon key</span>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Key tables:</span> leads, attempts, call_sessions, webhook_events</p>
              <p><span className="font-medium">Key views:</span> v_attempts_enriched, v_calls_with_artifacts</p>
              <p><span className="font-medium">Trigger:</span> merge_call_session (deduplicates frontend + n8n rows)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="h-4 w-4" />
              Cloudflare Pages
            </CardTitle>
            <CardDescription>
              Static hosting — auto-deploys on git push.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Production:</span> crm-4z1.pages.dev (main branch)</p>
              <p><span className="font-medium">Sandbox:</span> crm-sandbox.pages.dev (sandbox branch)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN SETTINGS PAGE
// ============================================================================

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Settings" />

      <div className="flex-1 p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure your CRM pipeline, automation, framework, data, sequences, and system</p>
        </div>

        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="sequences">Sequences</TabsTrigger>
            <TabsTrigger value="framework">Framework</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline">
            <PipelineTab />
          </TabsContent>

          <TabsContent value="automation">
            <AutomationTab />
          </TabsContent>

          <TabsContent value="data">
            <DataTab />
          </TabsContent>

          <TabsContent value="sequences">
            <SequencesTab />
          </TabsContent>

          <TabsContent value="framework">
            <FrameworkTab />
          </TabsContent>

          <TabsContent value="system">
            <SystemTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

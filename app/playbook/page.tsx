"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { useTabConfig } from "@/hooks/use-categories"
import { PlaybookSkeleton } from "@/components/page-skeletons"
import { RuleEvidenceDrawer } from "@/components/rule-evidence-drawer"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  FileText,
  Lightbulb,
  Shield,
  AlertTriangle,
  Target,
  Settings2,
  Globe,
  Activity,
} from "lucide-react"
import {
  type Rule,
  type RuleConfidence,
  type StopSignal,
  type Drill,
  type DrillTriggerType,
} from "@/lib/store"
import { KbScriptsTab } from "@/components/kb-scripts-tab"
import { KbMarketIntelTab } from "@/components/kb-market-intel-tab"
import { KbFrictionTab } from "@/components/kb-friction-tab"
import { IncubatorHub } from "@/components/incubator/incubator-hub"
import { KbOfferTab } from "@/components/kb-offer-tab"

export default function PlaybookPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [stopSignals, setStopSignals] = useState<StopSignal[]>([])
  const [dbDrills, setDbDrills] = useState<Drill[]>([])
  const getDbDrillById = (id: string) => dbDrills.find(d => d.id === id)
  const [evidenceCounts, setEvidenceCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [evidenceDrawer, setEvidenceDrawer] = useState<{ ruleId: string; summary: string } | null>(null)
  const projectId = useProjectId()
  const { visibleTabs, getLabel } = useTabConfig()
  const isTabVisible = (slug: string) => visibleTabs.some(t => t.slug === slug)
  const defaultTab = visibleTabs.length > 0 ? visibleTabs[0].slug : "playbook"

  useEffect(() => {
    if (!projectId) return

    const fetchData = async () => {
      const supabase = getSupabase()
      const [rulesRes, signalsRes, evidenceRes, drillsRes] = await Promise.all([
        supabase.from('rules').select('*').eq('project_id', projectId),
        supabase.from('stop_signals').select('*').eq('project_id', projectId),
        supabase.from("playbook_evidence").select("rule_id").eq("project_id", projectId),
        supabase.from('drills').select('*').eq('project_id', projectId),
      ])

      if (rulesRes.data) {
        setRules(rulesRes.data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          ifWhen: (r.if_when || r.ifWhen) as string,
          then: (r.then_action || r.then) as string,
          because: r.because as string,
          confidence: r.confidence as RuleConfidence,
          evidenceAttemptIds: (r.evidence_attempt_ids || []) as string[],
          isActive: r.is_active as boolean,
          createdAt: r.created_at as string
        })))
      }

      if (signalsRes.data) {
        setStopSignals(signalsRes.data.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          name: s.name as string,
          description: s.description as string,
          triggerCondition: (s.trigger_condition || s.triggerCondition) as string,
          threshold: s.threshold as number,
          windowSize: (s.window_size || s.windowSize) as number,
          recommendedDrillId: (s.recommended_drill_id || s.recommendedDrillId) as string | undefined,
          isActive: s.is_active as boolean
        })))
      }

      if (drillsRes.data) {
        setDbDrills(drillsRes.data.map((d: Record<string, unknown>) => ({
          id: d.id as string,
          name: d.name as string,
          triggerType: d.trigger_type as DrillTriggerType,
          instructions: d.instructions as string,
          script: d.script as string | undefined,
          durationCount: d.duration_count as number,
          successMetric: d.success_metric as string,
          isActive: d.is_active as boolean,
          createdAt: d.created_at as string
        })))
      }

      // Count evidence per rule
      if (evidenceRes.data) {
        const counts: Record<string, number> = {}
        evidenceRes.data.forEach((e: { rule_id: string }) => {
          counts[e.rule_id] = (counts[e.rule_id] || 0) + 1
        })
        setEvidenceCounts(counts)
      }
      setLoading(false)
    }
    fetchData()
  }, [projectId])


  // Add Rule dialog
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false)
  const [newRule, setNewRule] = useState({
    ifWhen: "",
    then: "",
    because: "",
    confidence: "Low" as RuleConfidence,
    isActive: false,
  })

  // Edit Rule dialog
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [isEditRuleOpen, setIsEditRuleOpen] = useState(false)

  // Edit Stop Signal dialog
  const [editingSignal, setEditingSignal] = useState<StopSignal | null>(null)
  const [isEditSignalOpen, setIsEditSignalOpen] = useState(false)

  const [isAddSignalOpen, setIsAddSignalOpen] = useState(false)
  const [newSignal, setNewSignal] = useState<Partial<StopSignal>>({ isActive: true })

  const [isAddDrillOpen, setIsAddDrillOpen] = useState(false)
  const [newDrill, setNewDrill] = useState<Partial<Drill>>({ isActive: true, durationCount: 10, triggerType: "manual" })
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null)
  const [isEditDrillOpen, setIsEditDrillOpen] = useState(false)


  const handleAddSignal = async () => {
    if (!newSignal.name || !newSignal.triggerCondition) return
    const supabase = getSupabase()
    const { data } = await supabase.from('stop_signals').insert({
      project_id: projectId,
      name: newSignal.name,
      description: newSignal.description || "",
      trigger_condition: newSignal.triggerCondition,
      threshold: newSignal.threshold || 5,
      window_size: newSignal.windowSize || 30,
      recommended_drill_id: newSignal.recommendedDrillId,
      is_active: newSignal.isActive
    }).select().single()
    if (data) {
      setStopSignals([...stopSignals, {
        id: data.id,
        name: data.name,
        description: data.description,
        triggerCondition: data.trigger_condition,
        threshold: data.threshold,
        windowSize: data.window_size,
        recommendedDrillId: data.recommended_drill_id,
        isActive: data.is_active
      }])
      setIsAddSignalOpen(false)
      setNewSignal({ isActive: true })
    }
  }

  const handleDeleteSignal = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('stop_signals').delete().eq('id', id)
    setStopSignals(stopSignals.filter(s => s.id !== id))
  }

  const handleAddDrill = async () => {
    if (!newDrill.name || !newDrill.instructions) return
    const supabase = getSupabase()
    const { data } = await supabase.from('drills').insert({
      project_id: projectId,
      name: newDrill.name,
      trigger_type: newDrill.triggerType || 'manual',
      instructions: newDrill.instructions,
      script: newDrill.script,
      duration_count: newDrill.durationCount || 10,
      success_metric: newDrill.successMetric || 'Completion',
      is_active: newDrill.isActive
    }).select().single()
    if (data) {
      setDbDrills([...dbDrills, {
        id: data.id,
        name: data.name,
        triggerType: data.trigger_type,
        instructions: data.instructions,
        script: data.script,
        durationCount: data.duration_count,
        successMetric: data.success_metric,
        isActive: data.is_active,
        createdAt: data.created_at
      }])
      setIsAddDrillOpen(false)
      setNewDrill({ isActive: true, durationCount: 10, triggerType: 'manual' })
    }
  }

  const handleEditDrillClick = (drill: Drill) => {
    setEditingDrill(drill)
    setIsEditDrillOpen(true)
  }

  const handleSaveEditDrill = async () => {
    if (!editingDrill) return
    const supabase = getSupabase()
    await supabase.from('drills').update({
      name: editingDrill.name,
      trigger_type: editingDrill.triggerType,
      instructions: editingDrill.instructions,
      script: editingDrill.script,
      duration_count: editingDrill.durationCount,
      success_metric: editingDrill.successMetric,
      is_active: editingDrill.isActive
    }).eq('id', editingDrill.id)
    setDbDrills(dbDrills.map(d => d.id === editingDrill.id ? editingDrill : d))
    setEditingDrill(null)
    setIsEditDrillOpen(false)
  }

  const handleDeleteDrill = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('drills').delete().eq('id', id)
    setDbDrills(dbDrills.map(d => d.id === id ? { ...d, isActive: false } : d).filter(d => d.id !== id))
  }

  const activeRules = rules.filter((r) => r.isActive)

  const draftRules = rules.filter((r) => !r.isActive)
  const activeSignals = stopSignals.filter((s) => s.isActive)

  const getConfidenceColor = (confidence: RuleConfidence) => {
    switch (confidence) {
      case "Proven":
        return "bg-green-100 text-green-800"
      case "Likely":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  // Handlers
  const handleAddRule = async () => {
    if (!newRule.ifWhen || !newRule.then) return

    const supabase = getSupabase()
    const { data, error } = await supabase.from('rules').insert([{
      if_when: newRule.ifWhen,
      then: newRule.then,
      because: newRule.because,
      confidence: newRule.confidence,
      is_active: newRule.isActive,
      project_id: projectId,
    }]).select().single()

    if (data) {
      const rule: Rule = {
        id: data.id,
        ifWhen: data.if_when,
        then: data.then,
        because: data.because,
        confidence: data.confidence,
        evidenceAttemptIds: [],
        isActive: data.is_active,
        createdAt: data.created_at,
      }

      setRules([rule, ...rules])
      setNewRule({ ifWhen: "", then: "", because: "", confidence: "Low", isActive: false })
      setIsAddRuleOpen(false)
    }
  }

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule)
    setIsEditRuleOpen(true)
  }

  const handleSaveEditRule = async () => {
    if (!editingRule) return

    const supabase = getSupabase()
    await supabase.from('rules').update({
      if_when: editingRule.ifWhen,
      then: editingRule.then,
      because: editingRule.because,
      confidence: editingRule.confidence
    }).eq('id', editingRule.id)

    setRules(rules.map((r) => (r.id === editingRule.id ? editingRule : r)))
    setEditingRule(null)
    setIsEditRuleOpen(false)
  }

  const handleDeleteRule = async (ruleId: string) => {
    const supabase = getSupabase()
    await supabase.from('rules').delete().eq('id', ruleId)
    setRules(rules.filter((r) => r.id !== ruleId))
  }

  const handleToggleRuleActive = async (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId)
    if (!rule) return

    const supabase = getSupabase()
    await supabase.from('rules').update({ is_active: !rule.isActive }).eq('id', ruleId)

    setRules(
      rules.map((r) =>
        r.id === ruleId ? { ...r, isActive: !r.isActive } : r
      )
    )
  }

  // Stop Signal handlers
  const handleToggleSignalActive = async (signalId: string) => {
    const signal = stopSignals.find(s => s.id === signalId)
    if (!signal) return

    const supabase = getSupabase()
    await supabase.from('stop_signals').update({ is_active: !signal.isActive }).eq('id', signalId)

    setStopSignals(
      stopSignals.map((s) =>
        s.id === signalId ? { ...s, isActive: !s.isActive } : s
      )
    )
  }

  const handleEditSignal = (signal: StopSignal) => {
    setEditingSignal(signal)
    setIsEditSignalOpen(true)
  }

  const handleSaveEditSignal = async () => {
    if (!editingSignal) return

    const supabase = getSupabase()
    await supabase.from('stop_signals').update({
      name: editingSignal.name,
      description: editingSignal.description,
      threshold: editingSignal.threshold,
      window_size: editingSignal.windowSize,
      recommended_drill_id: editingSignal.recommendedDrillId
    }).eq('id', editingSignal.id)

    setStopSignals(stopSignals.map((s) => (s.id === editingSignal.id ? editingSignal : s)))
    setEditingSignal(null)
    setIsEditSignalOpen(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Topbar title="Knowledge Base" />
        <PlaybookSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Knowledge Base" />

      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
          </div>
          <p className="text-muted-foreground">
            Your learning machine — rules, scripts, market intel, friction tracking, and diagnostics.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="mb-6 flex-wrap">
              {isTabVisible("playbook") && <TabsTrigger value="playbook">{getLabel("playbook")}</TabsTrigger>}
              {isTabVisible("scripts") && <TabsTrigger value="scripts">{getLabel("scripts")}</TabsTrigger>}
              {isTabVisible("market-intel") && <TabsTrigger value="market-intel">{getLabel("market-intel")}</TabsTrigger>}
              {isTabVisible("offer") && <TabsTrigger value="offer">{getLabel("offer")}</TabsTrigger>}
              {isTabVisible("friction") && <TabsTrigger value="friction">{getLabel("friction")}</TabsTrigger>}

            </TabsList>

            <TabsContent value="playbook">
              <div className="grid gap-6">
                {/* Insight Lab — top of the Playbook tab */}
                <IncubatorHub />

                {/* Active Rules */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        Active Rules ({activeRules.length})
                      </CardTitle>
                      <CardDescription>
                        Rules the team should follow right now
                      </CardDescription>
                    </div>
                    <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Rule
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Rule</DialogTitle>
                          <DialogDescription>
                            Add a new rule based on learnings from batch reviews.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label>If/When *</Label>
                            <Input
                              value={newRule.ifWhen}
                              onChange={(e) =>
                                setNewRule({ ...newRule, ifWhen: e.target.value })
                              }
                              placeholder="e.g., Prospect says they are happy with current provider"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Then *</Label>
                            <Input
                              value={newRule.then}
                              onChange={(e) =>
                                setNewRule({ ...newRule, then: e.target.value })
                              }
                              placeholder='e.g., "Ask: What would need to change..."'
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Because</Label>
                            <Textarea
                              value={newRule.because}
                              onChange={(e) =>
                                setNewRule({ ...newRule, because: e.target.value })
                              }
                              placeholder="Why does this work?"
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label>Confidence</Label>
                              <Select
                                value={newRule.confidence}
                                onValueChange={(value) =>
                                  setNewRule({ ...newRule, confidence: value as RuleConfidence })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Low">Low (testing)</SelectItem>
                                  <SelectItem value="Likely">Likely (some evidence)</SelectItem>
                                  <SelectItem value="Proven">Proven (strong evidence)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>Status</Label>
                              <Select
                                value={newRule.isActive ? "active" : "draft"}
                                onValueChange={(value) =>
                                  setNewRule({ ...newRule, isActive: value === "active" })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="active">Active</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddRuleOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddRule}
                            disabled={!newRule.ifWhen || !newRule.then}
                          >
                            Create
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {activeRules.length > 0 ? (
                      <div className="space-y-4">
                        {activeRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="p-4 border rounded-lg bg-green-50/50 border-green-100"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getConfidenceColor(rule.confidence)}>
                                    {rule.confidence}
                                  </Badge>
                                  {evidenceCounts[rule.id] > 0 && (
                                    <button
                                      onClick={() => setEvidenceDrawer({
                                        ruleId: rule.id,
                                        summary: `If ${rule.ifWhen} → ${rule.then}`,
                                      })}
                                      className="cursor-pointer hover:scale-105 transition-transform"
                                    >
                                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50">
                                        {evidenceCounts[rule.id]} evidence
                                      </Badge>
                                    </button>
                                  )}
                                </div>
                                <p className="font-medium">
                                  <span className="text-muted-foreground">If/When:</span> {rule.ifWhen}
                                </p>
                                <p className="mt-1">
                                  <span className="text-muted-foreground">Then:</span> {rule.then}
                                </p>
                                {rule.because && (
                                  <p className="text-sm text-muted-foreground mt-2 italic">
                                    Because: {rule.because}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditRule(rule)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleRuleActive(rule.id)}
                                >
                                  Deactivate
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No active rules yet. Create rules from batch review learnings.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Stop Signals - Enhanced with management */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between w-full">
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Stop Signals ({activeSignals.length} active)
                      </CardTitle>
                      <Button size="sm" onClick={() => setIsAddSignalOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Signal
                      </Button>
                    </div>
                    <CardDescription>
                      Automatic alerts during dial sessions. When thresholds are crossed, you will be prompted to start a corrective drill.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stopSignals.map((signal) => {
                        const drill = signal.recommendedDrillId ? getDbDrillById(signal.recommendedDrillId) : null
                        return (
                          <div
                            key={signal.id}
                            className={`p-4 border rounded-lg transition-colors ${signal.isActive
                              ? "bg-amber-50/50 border-amber-200"
                              : "bg-muted/30 border-muted"
                              }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className={`font-semibold ${signal.isActive ? "text-foreground" : "text-muted-foreground"}`}>
                                    {signal.name}
                                  </span>
                                  <Badge variant={signal.isActive ? "default" : "secondary"}>
                                    {signal.isActive ? "Active" : "Disabled"}
                                  </Badge>
                                </div>

                                <p className="text-sm text-muted-foreground mb-3">
                                  {signal.description}
                                </p>

                                <div className="flex flex-wrap gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-amber-600" />
                                    <span className="text-muted-foreground">Trigger:</span>
                                    <span className="font-medium">{signal.triggerCondition}</span>
                                  </div>
                                </div>

                                {drill && (
                                  <div className="mt-3 p-3 bg-background rounded border">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Lightbulb className="h-4 w-4 text-primary" />
                                      <span className="text-muted-foreground">Recommended drill:</span>
                                      <span className="font-medium">{drill.name}</span>
                                      <Badge variant="outline" className="text-xs">{drill.durationCount} calls</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                      {drill.instructions}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`signal-${signal.id}`} className="text-xs text-muted-foreground">
                                    {signal.isActive ? "On" : "Off"}
                                  </Label>
                                  <Switch
                                    id={`signal-${signal.id}`}
                                    checked={signal.isActive}
                                    onCheckedChange={() => handleToggleSignalActive(signal.id)}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSignal(signal)}
                                >
                                  <Settings2 className="h-4 w-4 mr-1" />
                                  Configure
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSignal(signal.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground mr-1" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Draft Rules */}
                {draftRules.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        Draft Rules ({draftRules.length})
                      </CardTitle>
                      <CardDescription>
                        Rules still being tested - not yet active
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {draftRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="p-4 border rounded-lg bg-muted/50"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary">Draft</Badge>
                                  <Badge className={getConfidenceColor(rule.confidence)}>
                                    {rule.confidence}
                                  </Badge>
                                </div>
                                <p className="text-sm">
                                  <span className="text-muted-foreground">If:</span> {rule.ifWhen}
                                </p>
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Then:</span> {rule.then}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleRuleActive(rule.id)}
                                >
                                  Activate
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteRule(rule.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* All Drills */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between w-full">
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        Drills ({dbDrills.length})
                      </CardTitle>
                      <Button size="sm" onClick={() => setIsAddDrillOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Drill
                      </Button>
                    </div>
                    <CardDescription>
                      Corrective exercises triggered by stop signals
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dbDrills.map((drill) => (
                        <div key={drill.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{drill.name}</span>
                              <Badge variant="outline" className="capitalize">{drill.triggerType}</Badge>
                              <Badge variant="secondary">{drill.durationCount} calls</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {drill.instructions}
                          </p>
                          {drill.script && (
                            <p className="text-sm italic text-muted-foreground border-l-2 pl-3">
                              {drill.script}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {isTabVisible("scripts") && (
              <TabsContent value="scripts">
                <KbScriptsTab />
              </TabsContent>
            )}

            {isTabVisible("market-intel") && (
              <TabsContent value="market-intel">
                <KbMarketIntelTab />
              </TabsContent>
            )}

            {isTabVisible("offer") && (
              <TabsContent value="offer">
                <KbOfferTab />
              </TabsContent>
            )}

            {isTabVisible("friction") && (
              <TabsContent value="friction">
                <KbFrictionTab />
              </TabsContent>
            )}


          </Tabs>
        </div>
      </div>

      {/* Edit Rule Dialog */}
      <Dialog open={isEditRuleOpen} onOpenChange={setIsEditRuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rule</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>If/When</Label>
                <Input
                  value={editingRule.ifWhen}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, ifWhen: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Then</Label>
                <Input
                  value={editingRule.then}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, then: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Because</Label>
                <Textarea
                  value={editingRule.because}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, because: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label>Confidence</Label>
                <Select
                  value={editingRule.confidence}
                  onValueChange={(value) =>
                    setEditingRule({ ...editingRule, confidence: value as RuleConfidence })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Likely">Likely</SelectItem>
                    <SelectItem value="Proven">Proven</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setIsEditRuleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditRule}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stop Signal Dialog */}
      <Dialog open={isAddSignalOpen} onOpenChange={setIsAddSignalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stop Signal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newSignal.name || ""}
                onChange={(e) => setNewSignal({ ...newSignal, name: e.target.value })}
                placeholder="e.g. Too Many Rejections"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newSignal.description || ""}
                onChange={(e) => setNewSignal({ ...newSignal, description: e.target.value })}
                placeholder="Why does this signal matter?"
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger Condition</Label>
              <Select
                value={newSignal.triggerCondition || ""}
                onValueChange={(value) => setNewSignal({ ...newSignal, triggerCondition: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outcome_rejection">Outcome: Rejection</SelectItem>
                  <SelectItem value="outcome_dnc">Outcome: DNC</SelectItem>
                  <SelectItem value="duration_short">Duration: Under 30s</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Threshold Count</Label>
                <Input
                  type="number"
                  value={newSignal.threshold || 5}
                  onChange={(e) => setNewSignal({ ...newSignal, threshold: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Window (Consecutive calls)</Label>
                <Input
                  type="number"
                  value={newSignal.windowSize || 30}
                  onChange={(e) => setNewSignal({ ...newSignal, windowSize: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Recommended Drill</Label>
              <Select
                value={newSignal.recommendedDrillId || "none"}
                onValueChange={(value) => setNewSignal({ ...newSignal, recommendedDrillId: value === "none" ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a drill (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {dbDrills.map((drill) => (
                    <SelectItem key={drill.id} value={drill.id}>{drill.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={newSignal.isActive || false}
                onCheckedChange={(c) => setNewSignal({ ...newSignal, isActive: c })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSignalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSignal} disabled={!newSignal.name || !newSignal.triggerCondition}>
              Add Signal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Drill Dialog */}
      <Dialog open={isAddDrillOpen} onOpenChange={setIsAddDrillOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Drill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label>Drill Name</Label>
              <Input
                value={newDrill.name || ""}
                onChange={(e) => setNewDrill({ ...newDrill, name: e.target.value })}
                placeholder="e.g. Objection Handling Drill"
              />
            </div>
            <div className="space-y-2">
              <Label>Instructions</Label>
              <Textarea
                value={newDrill.instructions || ""}
                onChange={(e) => setNewDrill({ ...newDrill, instructions: e.target.value })}
                placeholder="What exactly should the rep do?"
              />
            </div>
            <div className="space-y-2">
              <Label>Success Metric</Label>
              <Input
                value={newDrill.successMetric || ""}
                onChange={(e) => setNewDrill({ ...newDrill, successMetric: e.target.value })}
                placeholder="e.g. 3 connected calls over 60s"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Required Call Count</Label>
                <Input
                  type="number"
                  value={newDrill.durationCount || 10}
                  onChange={(e) => setNewDrill({ ...newDrill, durationCount: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={newDrill.isActive || false}
                onCheckedChange={(c) => setNewDrill({ ...newDrill, isActive: c })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDrillOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDrill} disabled={!newDrill.name || !newDrill.instructions}>
              Add Drill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Drill Dialog */}
      <Dialog open={isEditDrillOpen} onOpenChange={setIsEditDrillOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Drill</DialogTitle>
          </DialogHeader>
          {editingDrill && (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label>Drill Name</Label>
                <Input
                  value={editingDrill.name || ""}
                  onChange={(e) => setEditingDrill({ ...editingDrill, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Instructions</Label>
                <Textarea
                  value={editingDrill.instructions || ""}
                  onChange={(e) => setEditingDrill({ ...editingDrill, instructions: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Success Metric</Label>
                <Input
                  value={editingDrill.successMetric || ""}
                  onChange={(e) => setEditingDrill({ ...editingDrill, successMetric: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Required Call Count</Label>
                  <Input
                    type="number"
                    value={editingDrill.durationCount || 10}
                    onChange={(e) => setEditingDrill({ ...editingDrill, durationCount: parseInt(e.target.value) || 10 })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={editingDrill.isActive || false}
                  onCheckedChange={(c) => setEditingDrill({ ...editingDrill, isActive: c })}
                />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDrillOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEditDrill} disabled={!editingDrill?.name || !editingDrill?.instructions}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stop Signal Dialog */}
      <Dialog open={isEditSignalOpen} onOpenChange={setIsEditSignalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Stop Signal</DialogTitle>
            <DialogDescription>
              Adjust when this signal triggers during dial sessions.
            </DialogDescription>
          </DialogHeader>
          {editingSignal && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Signal Name</Label>
                <Input
                  value={editingSignal.name}
                  onChange={(e) =>
                    setEditingSignal({ ...editingSignal, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={editingSignal.description}
                  onChange={(e) =>
                    setEditingSignal({ ...editingSignal, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Threshold (%)</Label>
                  <Input
                    type="number"
                    value={editingSignal.threshold}
                    onChange={(e) =>
                      setEditingSignal({ ...editingSignal, threshold: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Window Size (calls)</Label>
                  <Input
                    type="number"
                    value={editingSignal.windowSize}
                    onChange={(e) =>
                      setEditingSignal({ ...editingSignal, windowSize: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Recommended Drill</Label>
                <Select
                  value={editingSignal.recommendedDrillId}
                  onValueChange={(value) =>
                    setEditingSignal({ ...editingSignal, recommendedDrillId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dbDrills.map((drill) => (
                      <SelectItem key={drill.id} value={drill.id}>
                        {drill.name} ({drill.durationCount} calls)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setIsEditSignalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditSignal}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence Drawer */}
      {evidenceDrawer && (
        <RuleEvidenceDrawer
          ruleId={evidenceDrawer.ruleId}
          ruleSummary={evidenceDrawer.summary}
          onClose={() => setEvidenceDrawer(null)}
        />
      )}
    </div>
  )
}

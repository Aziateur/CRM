"use client"
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
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
} from "lucide-react"
import {
  rules as initialRules,
  stopSignals as initialStopSignals,
  drills,
  getDrillById,
  type Rule,
  type RuleConfidence,
  type StopSignal,
} from "@/lib/store"

export default function PlaybookPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [stopSignals, setStopSignals] = useState<StopSignal[]>([])

  useEffect(() => {
    const fetchData = async () => {
        const supabase = getSupabase()
        const { data: rulesData } = await supabase.from('rules').select('*')
        if (rulesData) {
            setRules(rulesData.map((r: any) => ({
                id: r.id,
                ifWhen: r.if_when || r.ifWhen,
                then: r.then_action || r.then, // Assuming snake_case 'then' might be reserved or something, but 'then' is likely fine.
                because: r.because,
                confidence: r.confidence,
                evidenceAttemptIds: r.evidence_attempt_ids || [],
                isActive: r.is_active,
                createdAt: r.created_at
            })))
        }

        const supabase = getSupabase()
        const { data: signalsData } = await supabase.from('stop_signals').select('*')
        if (signalsData) {
            setStopSignals(signalsData.map((s: any) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                triggerCondition: s.trigger_condition || s.triggerCondition,
                threshold: s.threshold,
                windowSize: s.window_size || s.windowSize,
                recommendedDrillId: s.recommended_drill_id || s.recommendedDrillId,
                isActive: s.is_active
            })))
        }
    }
    fetchData()
  }, [])


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
        is_active: newRule.isActive
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

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Playbook" />

      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Playbook</h1>
          </div>
          <p className="text-muted-foreground">
            Rules, stop signals, and drills. The single source of truth.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid gap-6">
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
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Stop Signals ({activeSignals.length} active)
              </CardTitle>
              <CardDescription>
                Automatic alerts during dial sessions. When thresholds are crossed, you will be prompted to start a corrective drill.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stopSignals.map((signal) => {
                  const drill = getDrillById(signal.recommendedDrillId)
                  return (
                    <div 
                      key={signal.id} 
                      className={`p-4 border rounded-lg transition-colors ${
                        signal.isActive 
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
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Drills ({drills.length})
              </CardTitle>
              <CardDescription>
                Corrective exercises triggered by stop signals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {drills.map((drill) => (
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
                    {drills.map((drill) => (
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
    </div>
  )
}

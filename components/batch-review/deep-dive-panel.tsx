"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  SkipForward,
  Check,
  Quote,
  X,
  AlertTriangle,
  ShieldAlert,
  Trophy,
  Zap,
  BookOpen,
  PenLine,
  Beaker,
  Target,
  SkipForward as SkipForwardIcon,
  PartyPopper,
} from "lucide-react"
import type { ReviewField, ReviewTemplate } from "@/queries/templates"
import type { EvidenceSnippet, DecisionType } from "@/queries/review-commands"
import type { ReviewableCall } from "./review-call-card"
import { CreateExperimentModal } from "@/components/create-experiment-modal"
import { SaveToKbDialog } from "@/components/save-to-kb-dialog"

// ─── Helpers ───

function AnchorLabel({ value, anchors }: { value: number; anchors?: Record<string, string> }) {
  if (!anchors) return null
  const label = anchors[String(value)]
  if (!label) return null
  return (
    <p className="text-xs text-muted-foreground mt-1.5 p-2 bg-muted/50 rounded-md border border-border/50 italic leading-relaxed">
      {label}
    </p>
  )
}

function EvidenceQuoteField({
  field,
  transcriptText,
  snippet,
  onUpdate,
  onSaveToKb,
}: {
  field: ReviewField
  transcriptText: string | null
  snippet: EvidenceSnippet | undefined
  onUpdate: (snippet: EvidenceSnippet | null) => void
  onSaveToKb?: (title: string, content: string) => void
}) {
  const [selecting, setSelecting] = useState(false)
  const lines = useMemo(
    () => (transcriptText ? transcriptText.split("\n").filter(Boolean) : []),
    [transcriptText],
  )
  const [selectedLines, setSelectedLines] = useState<Set<number>>(
    new Set(snippet?.transcriptLines ?? []),
  )

  const toggleLine = (idx: number) => {
    setSelectedLines((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const confirmSelection = () => {
    const sortedLines = Array.from(selectedLines).sort((a, b) => a - b)
    const text = sortedLines.map((i) => lines[i]).join("\n")
    onUpdate({
      fieldKey: field.key,
      text,
      transcriptLines: sortedLines,
    })
    setSelecting(false)
  }

  if (!transcriptText) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg border border-dashed text-sm text-muted-foreground">
        No transcript available — evidence quoting requires a transcript
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-medium flex items-center gap-1.5">
          <Quote className="h-3.5 w-3.5 text-amber-500" />
          {field.label}
        </Label>
        {!selecting && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelecting(true)}
            className="text-xs h-7"
          >
            {snippet ? "Re-select lines" : "Select from transcript"}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {field.config.prompt || "Select transcript lines as evidence"}
      </p>

      {/* Current snippet */}
      {snippet && !selecting && (
        <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 relative group">
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onSaveToKb && (
              <button
                onClick={() => onSaveToKb(`Evidence: ${field.label}`, snippet.text)}
                className="text-muted-foreground hover:text-foreground"
                title="Save to KB"
              >
                <BookOpen className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onUpdate(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-sm whitespace-pre-wrap font-mono">{snippet.text}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Lines {snippet.transcriptLines?.join(", ")}
          </p>
        </div>
      )}

      {/* Line selector */}
      {selecting && (
        <div className="space-y-2">
          <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-0.5">
            {lines.map((line, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleLine(idx)}
                className={`w-full text-left text-xs p-1.5 rounded transition-colors ${selectedLines.has(idx)
                  ? "bg-amber-100 text-amber-900 font-medium"
                  : "hover:bg-muted/50"
                  }`}
              >
                <span className="text-muted-foreground font-mono mr-2">{idx + 1}</span>
                {line}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelecting(false)} className="text-xs h-7">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmSelection}
              disabled={selectedLines.size === 0}
              className="text-xs h-7"
            >
              Attach {selectedLines.size} line{selectedLines.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ───

interface DeepDivePanelProps {
  currentCall: ReviewableCall
  activeDeepTemplate: ReviewTemplate
  hasEvidence: boolean
  saving: boolean
  responses: Record<string, unknown>
  setResponses: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  evidenceSnippets: EvidenceSnippet[]
  setEvidenceSnippets: React.Dispatch<React.SetStateAction<EvidenceSnippet[]>>
  decisionType: DecisionType | null
  setDecisionType: React.Dispatch<React.SetStateAction<DecisionType | null>>
  decisionReason: string
  setDecisionReason: React.Dispatch<React.SetStateAction<string>>
  createdExperimentId: string | null
  setCreatedExperimentId: React.Dispatch<React.SetStateAction<string | null>>
  onExperimentCreated: () => void
  deepDiveAttemptIds: Set<string> | null
  deepDiveLabel: string
  deepDiveCompleted: number
  deepDiveTotal: number
  onClearDeepDiveFilter: () => void
  onBackToQuickBatch: () => void
  onSubmit: () => void
  onSkip: () => void
  showUnverifiedConfirm: boolean
  setShowUnverifiedConfirm: React.Dispatch<React.SetStateAction<boolean>>
}

export function DeepDivePanel({
  currentCall,
  activeDeepTemplate,
  hasEvidence,
  saving,
  responses,
  setResponses,
  evidenceSnippets,
  setEvidenceSnippets,
  decisionType,
  setDecisionType,
  decisionReason,
  setDecisionReason,
  createdExperimentId,
  setCreatedExperimentId,
  onExperimentCreated,
  deepDiveAttemptIds,
  deepDiveLabel,
  deepDiveCompleted,
  deepDiveTotal,
  onClearDeepDiveFilter,
  onBackToQuickBatch,
  onSubmit,
  onSkip,
  showUnverifiedConfirm,
  setShowUnverifiedConfirm,
}: DeepDivePanelProps) {
  // Save-to-KB dialog state
  const [kbDialogOpen, setKbDialogOpen] = useState(false)
  const [kbDialogTitle, setKbDialogTitle] = useState("")
  const [kbDialogContent, setKbDialogContent] = useState("")

  const openSaveToKb = (title: string, content: string) => {
    setKbDialogTitle(title)
    setKbDialogContent(content)
    setKbDialogOpen(true)
  }

  const leadContext = currentCall.lead ? {
    segment: currentCall.lead.segment || undefined,
    stage: currentCall.lead.stage || undefined,
    company: currentCall.lead.company || undefined,
  } : undefined

  // Score computation
  const scoreFields = activeDeepTemplate.fields.filter((f) => f.fieldType === "score")
  const totalScore = scoreFields.reduce((sum, f) => sum + ((responses[f.key] as number) ?? 0), 0)
  const maxScore = scoreFields.reduce((sum, f) => sum + (f.config.max ?? 5), 0)

  // Group fields by section
  const fieldSections = useMemo(() => {
    const sections = new Map<string, ReviewField[]>()
    for (const field of activeDeepTemplate.fields) {
      const section = field.section || "General"
      if (!sections.has(section)) sections.set(section, [])
      sections.get(section)!.push(field)
    }
    return Array.from(sections.entries())
  }, [activeDeepTemplate])

  const updateEvidence = (fieldKey: string, snippet: EvidenceSnippet | null) => {
    setEvidenceSnippets((prev) => {
      const filtered = prev.filter((s) => s.fieldKey !== fieldKey)
      if (snippet) filtered.push(snippet)
      return filtered
    })
  }

  return (
    <>
      {/* Deep dive progress + filter indicator */}
      {deepDiveAttemptIds && (
        <div className="p-3 rounded-lg border bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Deep Dive — {deepDiveLabel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground tabular-nums">
                {deepDiveCompleted} / {deepDiveTotal} completed
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={onClearDeepDiveFilter}
              >
                Clear filter
              </Button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${deepDiveTotal > 0 ? (deepDiveCompleted / deepDiveTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Deep dive completion state */}
      {deepDiveAttemptIds && deepDiveCompleted >= deepDiveTotal && deepDiveTotal > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-8">
            <div className="text-center">
              <Check className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-800">Deep Dive Complete!</h3>
              <p className="text-sm text-green-700 mt-1">
                You&apos;ve reviewed all {deepDiveTotal} calls in this set.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={onBackToQuickBatch}
              >
                Back to Quick Batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template fields */}
      <>
        {/* Template Header + Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{activeDeepTemplate.name}</span>
              {scoreFields.length > 0 && (
                <span className="tabular-nums text-lg">
                  {totalScore} / {maxScore}
                </span>
              )}
            </CardTitle>
            {activeDeepTemplate.description && (
              <CardDescription>{activeDeepTemplate.description}</CardDescription>
            )}
          </CardHeader>
        </Card>

        {/* Render fields by section */}
        {fieldSections.map(([section, fields]) => (
          <Card key={section}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
                {section}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {fields.map((field) => {
                // Score Field
                if (field.fieldType === "score") {
                  const value = (responses[field.key] as number) ?? field.config.min ?? 1
                  return (
                    <div key={field.key}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <Label className="font-medium">{field.label}</Label>
                        </div>
                        <span className="text-xl font-bold tabular-nums w-8 text-right">
                          {value}
                        </span>
                      </div>
                      <Slider
                        min={field.config.min ?? 1}
                        max={field.config.max ?? 5}
                        step={1}
                        value={[value]}
                        onValueChange={(v) =>
                          setResponses((prev) => ({ ...prev, [field.key]: v[0] }))
                        }
                        className="w-full"
                      />
                      <AnchorLabel value={value} anchors={field.config.anchors} />
                    </div>
                  )
                }

                // Text Field
                if (field.fieldType === "text") {
                  const textVal = (responses[field.key] as string) ?? ""
                  return (
                    <div key={field.key}>
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{field.label}</Label>
                        {textVal.trim().length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => openSaveToKb(field.label, textVal)}
                          >
                            <BookOpen className="h-3 w-3" />
                            Save to KB
                          </Button>
                        )}
                      </div>
                      <Textarea
                        value={textVal}
                        onChange={(e) =>
                          setResponses((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        placeholder={field.config.placeholder ?? ""}
                        rows={field.config.rows ?? 3}
                        className="resize-none mt-1.5"
                      />
                    </div>
                  )
                }

                // Evidence Quote Field
                if (field.fieldType === "evidence_quote") {
                  return (
                    <EvidenceQuoteField
                      key={field.key}
                      field={field}
                      transcriptText={currentCall.session?.transcript_text ?? null}
                      snippet={evidenceSnippets.find((s) => s.fieldKey === field.key)}
                      onUpdate={(s) => updateEvidence(field.key, s)}
                      onSaveToKb={openSaveToKb}
                    />
                  )
                }

                // Checkbox Field
                if (field.fieldType === "checkbox") {
                  return (
                    <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(responses[field.key] as boolean) ?? false}
                        onChange={(e) =>
                          setResponses((prev) => ({
                            ...prev,
                            [field.key]: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      <span className="text-sm font-medium">{field.label}</span>
                    </label>
                  )
                }

                // Multi-Select Field
                if (field.fieldType === "multi_select") {
                  const selected = (responses[field.key] as string[]) ?? []
                  return (
                    <div key={field.key}>
                      <Label className="font-medium">{field.label}</Label>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {(field.config.options ?? []).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setResponses((prev) => {
                                const cur = (prev[field.key] as string[]) ?? []
                                return {
                                  ...prev,
                                  [field.key]: cur.includes(opt.value)
                                    ? cur.filter((v) => v !== opt.value)
                                    : [...cur, opt.value],
                                }
                              })
                            }
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selected.includes(opt.value)
                              ? `${opt.color ?? "bg-primary/10 text-primary"} ring-2 ring-offset-1 ring-primary/30`
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                }

                return null
              })}
            </CardContent>
          </Card>
        ))}

        {/* Decision Output — Required */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              What Next? <span className="text-red-500">*</span>
            </CardTitle>
            <CardDescription>Every review must produce a decision</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "rule_draft" as const, label: "Rule Draft", desc: "Create or update a playbook rule" },
                { value: "experiment" as const, label: "Experiment", desc: "Test something specific next session" },
                { value: "drill" as const, label: "Drill", desc: "Assign a corrective drill" },
                { value: "no_decision" as const, label: "No Decision", desc: "Nothing actionable (give reason)" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDecisionType(opt.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${decisionType === opt.value
                    ? "border-purple-500 bg-purple-50"
                    : "border-border hover:border-purple-300"
                    }`}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            {decisionType === "no_decision" && (
              <Textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Why is there nothing actionable? e.g., Already covered by existing rules, clean execution..."
                rows={2}
                className="resize-none text-sm mt-2"
              />
            )}
            {decisionType === "experiment" && !createdExperimentId && (
              <div className="mt-3">
                <CreateExperimentModal
                  sourceReviewId={currentCall?.attempt?.id}
                  onCreated={(exp) => {
                    setCreatedExperimentId(exp.id)
                    onExperimentCreated()
                  }}
                  onCancel={() => setDecisionType(null)}
                />
              </div>
            )}
            {decisionType === "experiment" && createdExperimentId && (
              <div className="mt-2 p-3 rounded-lg bg-green-50/60 border border-green-200 text-sm">
                <p className="font-medium text-green-800">✓ Experiment created</p>
                <p className="text-green-700 text-xs mt-0.5">It will be linked to this review on submit. Activate it from Dial Session to start collecting data.</p>
              </div>
            )}
            {!decisionType && (
              <p className="text-xs text-red-500 font-medium">Select a decision type to enable submission</p>
            )}
          </CardContent>
        </Card>

        {/* Evidence warning — Deep Dive */}
        {!hasEvidence && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-red-300 bg-red-50/50 text-sm">
            <ShieldAlert className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-800">Evidence required for Deep Dive</p>
              <p className="text-red-600 text-xs mt-0.5">
                No recording or transcript — scoring without evidence contaminates analytics.
                You can still submit, but the review will be marked <span className="font-semibold">Unverified</span>.
              </p>
            </div>
          </div>
        )}

        {/* Unverified confirmation */}
        {showUnverifiedConfirm && (
          <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-red-400 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-800 flex-1">Are you sure? This Deep Dive will be saved as <strong>Unverified</strong>.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowUnverifiedConfirm(false)} className="text-xs h-7">
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={onSubmit} className="text-xs h-7">
                Submit Unverified
              </Button>
            </div>
          </div>
        )}

        {/* Deep Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={onSkip}>
            <SkipForward className="mr-2 h-4 w-4" />
            Skip
          </Button>
          <Button className="flex-1" onClick={onSubmit} disabled={saving || !decisionType}>
            <Check className="mr-2 h-4 w-4" />
            {!decisionType
              ? "Select Decision First"
              : hasEvidence
                ? "Save Deep Review"
                : "Submit as Unverified…"}
          </Button>
        </div>
      </>

      {/* Save to KB dialog */}
      <SaveToKbDialog
        open={kbDialogOpen}
        onOpenChange={setKbDialogOpen}
        defaultTitle={kbDialogTitle}
        defaultContent={kbDialogContent}
        sourceAttemptId={currentCall.attempt?.id}
        leadContext={leadContext}
      />
    </>
  )
}

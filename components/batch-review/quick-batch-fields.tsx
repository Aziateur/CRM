"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  SkipForward,
  Check,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  BookOpen,
} from "lucide-react"
import type { ReviewField, ReviewTemplate } from "@/queries/templates"
import type { ReviewableCall } from "./review-call-card"
import { SaveToKbDialog } from "@/components/save-to-kb-dialog"

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

interface QuickBatchFieldsProps {
  currentCall: ReviewableCall
  activeQuickTemplate: ReviewTemplate | null
  hasEvidence: boolean
  saving: boolean
  quickResponses: Record<string, unknown>
  setQuickResponses: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  quickBucket: "top" | "bottom" | null
  setQuickBucket: React.Dispatch<React.SetStateAction<"top" | "bottom" | null>>
  onSubmit: () => void
  onSkip: () => void
}

export function QuickBatchFields({
  currentCall,
  activeQuickTemplate,
  hasEvidence,
  saving,
  quickResponses,
  setQuickResponses,
  quickBucket,
  setQuickBucket,
  onSubmit,
  onSkip,
}: QuickBatchFieldsProps) {
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

  if (!activeQuickTemplate) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No quick review template configured.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Go to <span className="font-medium">Settings → Templates</span> and create a template with <span className="font-medium">Applies To: Quick</span>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Template-defined fields */}
      {activeQuickTemplate.fields.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {activeQuickTemplate.name}
              <Badge variant="outline" className="text-[10px]">v{activeQuickTemplate.version}</Badge>
            </CardTitle>
            {activeQuickTemplate.description && (
              <CardDescription>{activeQuickTemplate.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {activeQuickTemplate.fields.map((field) => {
              const val = quickResponses[field.key]
              switch (field.fieldType) {
                case "multi_select": {
                  const selected = (val as string[] | undefined) ?? []
                  const options = field.config.options ?? []
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <p className="text-sm font-medium">{field.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {options.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const next = selected.includes(opt.value)
                                ? selected.filter((v) => v !== opt.value)
                                : [...selected, opt.value]
                              setQuickResponses((prev) => ({ ...prev, [field.key]: next }))
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selected.includes(opt.value)
                              ? "bg-primary/10 text-primary ring-2 ring-offset-1 ring-primary/30"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                        {options.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No options configured for this field</p>
                        )}
                      </div>
                    </div>
                  )
                }
                case "checkbox": {
                  const checked = (val as boolean | undefined) ?? false
                  return (
                    <div key={field.key} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setQuickResponses((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                        className="mt-1 rounded"
                        id={`quick-${field.key}`}
                      />
                      <label htmlFor={`quick-${field.key}`} className="text-sm cursor-pointer">
                        <span className="font-medium">{field.label}</span>
                        {field.config.description && (
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {field.config.description as string}
                          </span>
                        )}
                      </label>
                    </div>
                  )
                }
                case "score": {
                  const score = (val as number | undefined) ?? Math.ceil(((field.config.min ?? 1) + (field.config.max ?? 5)) / 2)
                  const min = field.config.min ?? 1
                  const max = field.config.max ?? 5
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <p className="text-sm font-medium">{field.label}</p>
                      <div className="flex gap-1">
                        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setQuickResponses((prev) => ({ ...prev, [field.key]: n }))}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${score === n
                              ? "bg-primary text-primary-foreground shadow"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <AnchorLabel value={score} anchors={field.config.anchors} />
                    </div>
                  )
                }
                case "text":
                case "evidence_quote": {
                  const text = (val as string | undefined) ?? ""
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{field.label}</p>
                        {text.trim().length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => openSaveToKb(field.label, text)}
                          >
                            <BookOpen className="h-3 w-3" />
                            Save to KB
                          </Button>
                        )}
                      </div>
                      <Textarea
                        value={text}
                        onChange={(e) => setQuickResponses((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={((field.config.placeholder ?? field.config.prompt) as string) || ""}
                        rows={2}
                        className="resize-none text-sm"
                      />
                    </div>
                  )
                }
                default:
                  return null
              }
            })}
          </CardContent>
        </Card>
      )}

      {/* Evidence warning */}
      {!hasEvidence && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50/50 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800">No recording or transcript available</p>
            <p className="text-amber-600 text-xs mt-0.5">
              This review will be marked as <span className="font-semibold">Unverified</span> — scored from memory, not evidence.
            </p>
          </div>
        </div>
      )}

      {/* Bucket selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Classify:</span>
        <div className="flex gap-1 flex-1">
          <button
            type="button"
            onClick={() => setQuickBucket(quickBucket === "top" ? null : "top")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${quickBucket === "top"
              ? "bg-green-100 text-green-700 ring-2 ring-green-300 dark:bg-green-900/40 dark:text-green-400 dark:ring-green-700"
              : "bg-muted text-muted-foreground hover:bg-green-50 hover:text-green-600"
              }`}
          >
            <ChevronUp className="h-3.5 w-3.5" />
            Top 10
          </button>
          <button
            type="button"
            onClick={() => setQuickBucket(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${quickBucket === null
              ? "bg-muted ring-2 ring-primary/20 text-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
          >
            —
          </button>
          <button
            type="button"
            onClick={() => setQuickBucket(quickBucket === "bottom" ? null : "bottom")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${quickBucket === "bottom"
              ? "bg-red-100 text-red-700 ring-2 ring-red-300 dark:bg-red-900/40 dark:text-red-400 dark:ring-red-700"
              : "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600"
              }`}
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Bottom 10
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 bg-transparent" onClick={onSkip}>
          <SkipForward className="mr-2 h-4 w-4" />
          Skip
        </Button>
        <Button
          className="flex-1"
          onClick={onSubmit}
          disabled={saving || !activeQuickTemplate || Object.keys(quickResponses).length === 0}
        >
          <Check className="mr-2 h-4 w-4" />
          Tag & Next
        </Button>
      </div>

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

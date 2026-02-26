"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, Keyboard, Crosshair } from "lucide-react"
import {
  attemptOutcomeOptions,
  whyReasonOptions,
  repMistakeOptions,
  getOutcomeButtonStyle,
  type AttemptOutcome,
  type WhyReason,
  type RepMistake,
} from "@/lib/store"
import type { Phase, Lever, Marker } from "@/lib/framework"



const followUpOptions = [
  { label: "1d", days: 1 },
  { label: "2d", days: 2 },
  { label: "1w", days: 7 },
  { label: "2w", days: 14 },
]

interface OutcomeLoggerProps {
  companyName: string
  // Outcome
  selectedOutcome: AttemptOutcome | null
  onOutcomeChange: (outcome: AttemptOutcome) => void
  // Why
  showWhyField: boolean
  selectedWhy: WhyReason | null
  onWhyChange: (why: WhyReason) => void
  // Rep Mistake
  selectedRepMistake: RepMistake | null
  onRepMistakeChange: (mistake: RepMistake | null) => void
  // Follow-up
  needsFollowUp: boolean
  effectiveFollowUpDays: number | null
  defaultFollowUpDays: number | null
  followUpDays: number | null
  onFollowUpDaysChange: (days: number) => void
  customFollowUpDays: string
  onCustomFollowUpDaysChange: (value: string) => void
  // Signals
  activePhase: Phase
  activeFocusLever: Lever
  actionMarker: Marker | undefined
  winMarker: Marker | undefined
  actionSignal: boolean | null
  winSignal: boolean | null
  onActionSignalChange: (value: boolean) => void
  onWinSignalChange: (value: boolean) => void
  // Note
  showDetail: boolean
  onShowDetailChange: (open: boolean) => void
  noteText: string
  onNoteTextChange: (text: string) => void
  // Actions
  canSave: boolean
  onSave: () => void
  onCancel: () => void
}

export function OutcomeLogger({
  companyName,
  selectedOutcome,
  onOutcomeChange,
  showWhyField,
  selectedWhy,
  onWhyChange,
  selectedRepMistake,
  onRepMistakeChange,
  needsFollowUp,
  effectiveFollowUpDays,
  defaultFollowUpDays,
  followUpDays,
  onFollowUpDaysChange,
  customFollowUpDays,
  onCustomFollowUpDaysChange,
  activePhase,
  activeFocusLever,
  actionMarker,
  winMarker,
  actionSignal,
  winSignal,
  onActionSignalChange,
  onWinSignalChange,
  showDetail,
  onShowDetailChange,
  noteText,
  onNoteTextChange,
  canSave,
  onSave,
  onCancel,
}: OutcomeLoggerProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle>Log: {companyName}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Keyboard className="h-4 w-4" />
          1-5 outcome · Y/N focus · Enter save
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Outcome Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Outcome *</Label>
          <div className="grid gap-2">
            {attemptOutcomeOptions.map((outcome, index) => (
              <button
                key={outcome}
                type="button"
                data-selected={selectedOutcome === outcome}
                onClick={() => onOutcomeChange(outcome)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors text-left ${getOutcomeButtonStyle(outcome)} ${selectedOutcome === outcome ? "ring-2 ring-offset-1 ring-primary" : ""}`}
              >
                <span className="font-medium">{outcome}</span>
                <span className="text-xs text-muted-foreground">{index + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Why (conditional) */}
        {showWhyField && (
          <div className="space-y-2 animate-in slide-in-from-top-2">
            <Label className="text-sm font-medium">Why? *</Label>
            <div className="grid grid-cols-2 gap-2">
              {whyReasonOptions.map((why) => (
                <button
                  key={why}
                  type="button"
                  onClick={() => onWhyChange(why)}
                  className={`px-3 py-2 rounded-lg border transition-colors text-sm ${selectedWhy === why ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"}`}
                >
                  {why}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rep Mistake (optional collapsible) */}
        {selectedOutcome && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedRepMistake
                    ? `Mistake: ${selectedRepMistake}`
                    : "Was this a rep mistake? (optional)"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="grid grid-cols-2 gap-2">
                {repMistakeOptions.map((mistake) => (
                  <button
                    key={mistake}
                    type="button"
                    onClick={() =>
                      onRepMistakeChange(selectedRepMistake === mistake ? null : mistake)
                    }
                    className={`px-3 py-2 rounded-lg border transition-colors text-sm ${selectedRepMistake === mistake ? "border-red-500 bg-red-50 font-medium" : "border-border hover:bg-muted"}`}
                  >
                    {mistake}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Follow-Up Timing */}
        {selectedOutcome && needsFollowUp && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Follow up in:</Label>
            <div className="flex items-center gap-2">
              {followUpOptions.map((opt) => (
                <Button
                  key={opt.days}
                  type="button"
                  size="sm"
                  variant={
                    (followUpDays ?? defaultFollowUpDays) === opt.days
                      ? "default"
                      : "outline"
                  }
                  className={
                    (followUpDays ?? defaultFollowUpDays) === opt.days
                      ? ""
                      : "bg-transparent"
                  }
                  onClick={() => onFollowUpDaysChange(opt.days)}
                >
                  {opt.label}
                </Button>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  placeholder="custom"
                  className="w-20 h-8 text-sm"
                  value={customFollowUpDays}
                  onChange={(e) => {
                    onCustomFollowUpDaysChange(e.target.value)
                    const n = parseInt(e.target.value)
                    if (n > 0) onFollowUpDaysChange(n)
                  }}
                />
                <span className="text-xs text-muted-foreground">days</span>
              </div>
            </div>
          </div>
        )}

        {/* Signals */}
        <div className="space-y-2">
          {activePhase.actionMarkerKey && actionMarker && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="h-3.5 w-3.5 text-primary" />
                <Label className="text-sm font-medium">
                  {actionMarker.label} (Y/N)
                </Label>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={actionSignal === true ? "default" : "outline"}
                  className={`h-7 w-10 text-xs ${actionSignal === true ? "" : "bg-transparent"}`}
                  onClick={() => onActionSignalChange(true)}
                >
                  Y
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={actionSignal === false ? "default" : "outline"}
                  className={`h-7 w-10 text-xs ${actionSignal === false ? "" : "bg-transparent"}`}
                  onClick={() => onActionSignalChange(false)}
                >
                  N
                </Button>
              </div>
            </div>
          )}
          {activePhase.winMarkerKey && winMarker && (
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">
                {winMarker.label}?
              </Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={winSignal === true ? "default" : "outline"}
                  className={`h-7 w-10 text-xs ${winSignal === true ? "" : "bg-transparent"}`}
                  onClick={() => onWinSignalChange(true)}
                >
                  Y
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={winSignal === false ? "default" : "outline"}
                  className={`h-7 w-10 text-xs ${winSignal === false ? "" : "bg-transparent"}`}
                  onClick={() => onWinSignalChange(false)}
                >
                  N
                </Button>
              </div>
            </div>
          )}
          {!activePhase.actionMarkerKey && !activePhase.winMarkerKey && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <Crosshair className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Focus: {activeFocusLever.label} — no markers for this phase
              </span>
            </div>
          )}
        </div>

        {/* Note (optional collapsible) */}
        <Collapsible open={showDetail} onOpenChange={onShowDetailChange}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="text-sm text-muted-foreground">
                Add note (optional)
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showDetail ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <Input
              placeholder="Quick note (max 120 chars)"
              maxLength={120}
              value={noteText}
              onChange={(e) => onNoteTextChange(e.target.value)}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Save / Cancel */}
        <div className="flex gap-3">
          <Button variant="outline" className="bg-transparent" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={onSave} disabled={!canSave}>
            Save & Next (Enter)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

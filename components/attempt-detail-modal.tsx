import { useState } from "react"
import { getSupabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Attempt, Lead } from "@/lib/store"
import { getOutcomeColor } from "@/components/leads-table"

interface AttemptDetailModalProps {
  attempt: Attempt | null
  onClose: () => void
  lead: Lead | null
  onLeadUpdated?: (lead: Lead) => void
}

export function AttemptDetailModal({ attempt, onClose, lead, onLeadUpdated }: AttemptDetailModalProps) {
  const [showAddToReality, setShowAddToReality] = useState(false)
  const [newFactOrQuestion, setNewFactOrQuestion] = useState("")
  const [addToType, setAddToType] = useState<"fact" | "question">("fact")

  const handleAddToAccountReality = async () => {
    if (!lead || !newFactOrQuestion.trim()) return

    const updatedLead = { ...lead }
    if (addToType === "fact") {
      const facts = updatedLead.confirmedFacts || []
      if (facts.length >= 5) return
      updatedLead.confirmedFacts = [...facts, newFactOrQuestion.slice(0, 120)]
    } else {
      const questions = updatedLead.openQuestions || []
      if (questions.length >= 3) return
      updatedLead.openQuestions = [...questions, newFactOrQuestion.slice(0, 120)]
    }

    const supabase = getSupabase()
    const { error } = await supabase
      .from("leads")
      .update({
        confirmed_facts: updatedLead.confirmedFacts,
        open_questions: updatedLead.openQuestions,
      })
      .eq("id", updatedLead.id)

    if (!error) {
      onLeadUpdated?.(updatedLead)
    }

    setNewFactOrQuestion("")
    setShowAddToReality(false)
    onClose()
  }

  return (
    <Dialog
      open={attempt !== null}
      onOpenChange={(open) => {
        if (!open) {
          setShowAddToReality(false)
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Attempt Details</DialogTitle>
          <DialogDescription>
            {attempt && new Date(attempt.timestamp).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        {attempt && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getOutcomeColor(attempt.outcome)} variant="secondary">
                {attempt.outcome}
              </Badge>
              {attempt.why && <Badge variant="outline">Why: {attempt.why}</Badge>}
              {attempt.repMistake && (
                <Badge variant="outline" className="text-red-600">
                  Mistake: {attempt.repMistake}
                </Badge>
              )}
            </div>

            {attempt.note && <p className="text-sm text-muted-foreground italic">{attempt.note}</p>}

            <div className="text-sm text-muted-foreground">Next action: {attempt.nextAction}</div>

            {attempt.recordingUrl && (
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">Recording</Label>
                <audio controls className="w-full mt-1" src={attempt.recordingUrl}>
                  <track kind="captions" />
                </audio>
              </div>
            )}

            {attempt.transcript && attempt.transcript.length > 0 ? (
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">Transcript</Label>
                <ScrollArea className="h-48 mt-1 border rounded p-2">
                  {attempt.transcript.map((segment, i) => (
                    <div
                      key={i}
                      className={`p-2 mb-1 rounded text-sm ${
                        segment.speaker === "agent" ? "bg-primary/10 ml-4" : "bg-muted mr-4"
                      }`}
                    >
                      <span className="text-xs font-medium capitalize">
                        {segment.speaker === "agent" ? "You" : "Contact"}:{" "}
                      </span>
                      {segment.content}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            ) : attempt.callTranscriptText ? (
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">Transcript</Label>
                <ScrollArea className="h-48 mt-1 border rounded p-2">
                  <div className="text-sm whitespace-pre-wrap">{attempt.callTranscriptText}</div>
                </ScrollArea>
              </div>
            ) : null}

            <Separator />

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
                  <Button variant="ghost" onClick={onClose}>
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
                  placeholder={
                    addToType === "fact"
                      ? "Enter confirmed fact (max 120 chars)"
                      : "Do they... / Can they... / Will they..."
                  }
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
  )
}

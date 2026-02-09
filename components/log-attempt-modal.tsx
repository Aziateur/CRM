import { useState } from "react"
import { getSupabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  attemptOutcomeOptions,
  whyReasonOptions,
  repMistakeOptions,
  isDmReached,
  getDefaultNextAction,
  type Lead,
  type Attempt,
  type AttemptOutcome,
  type WhyReason,
  type RepMistake,
} from "@/lib/store"
import { getOutcomeColor } from "@/components/leads-table"

interface LogAttemptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead | null
  onAttemptLogged: (attempt: Attempt) => void
}

export function LogAttemptModal({ open, onOpenChange, lead, onAttemptLogged }: LogAttemptModalProps) {
  const [outcome, setOutcome] = useState<AttemptOutcome | null>(null)
  const [why, setWhy] = useState<WhyReason | null>(null)
  const [repMistake, setRepMistake] = useState<RepMistake | null>(null)
  const [note, setNote] = useState("")

  const showWhyField = outcome === "DM reached → No interest"

  const reset = () => {
    setOutcome(null)
    setWhy(null)
    setRepMistake(null)
    setNote("")
  }

  const handleSave = async () => {
    if (!lead || !outcome) return

    const attemptData = {
      lead_id: lead.id,
      timestamp: new Date().toISOString(),
      outcome,
      why: why || null,
      rep_mistake: repMistake || null,
      dm_reached: isDmReached(outcome),
      next_action: getDefaultNextAction(outcome, why || undefined),
      note: note || null,
      duration_sec: 0,
    }

    const supabase = getSupabase()
    const { data, error } = await supabase.from("attempts").insert([attemptData]).select().single()

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
        createdAt: data.created_at,
      }
      onAttemptLogged(attempt)
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Attempt</DialogTitle>
          <DialogDescription>{lead?.company}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Outcome *</Label>
            <div className="grid grid-cols-1 gap-2">
              {attemptOutcomeOptions.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    setOutcome(o)
                    setWhy(null)
                  }}
                  className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                    outcome === o ? `${getOutcomeColor(o)} border-2` : "border-border hover:bg-muted"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {showWhyField && (
            <div className="space-y-2">
              <Label>Why? *</Label>
              <div className="grid grid-cols-3 gap-2">
                {whyReasonOptions.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWhy(w)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                      why === w ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {outcome && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Rep Mistake? (optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                {repMistakeOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRepMistake(repMistake === m ? null : m)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                      repMistake === m ? "border-red-500 bg-red-50 font-medium" : "border-border hover:bg-muted"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-muted-foreground">Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Brief note (max 120 chars)"
              maxLength={120}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!outcome || (showWhyField && !why)}>
            Save Attempt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

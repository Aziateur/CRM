"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Check, MessageSquare, FlaskConical } from "lucide-react"
import type { Attempt, Lead } from "@/lib/store"
import { OUTCOMES } from "@/lib/store"
import type { RankedCall } from "@/queries/ranked-calls"
import { useState } from "react"
import { AppendToScriptDialog } from "./append-to-script-dialog"
import { Button } from "@/components/ui/button"

interface CallSession {
  call_session_id: string
  attempt_id: string | null
  recording_url: string | null
  transcript_text: string | null
}

interface ReviewableCall {
  attempt: Attempt
  lead: Lead | null
  session: CallSession | null
}

interface ReviewCallCardProps {
  currentCall: ReviewableCall | null
  activeTab: "quick" | "deep" | "experiments"
  allRanked: RankedCall[]
  emptyMessage?: string
}

export function ReviewCallCard({
  currentCall,
  activeTab,
  allRanked,
  emptyMessage,
}: ReviewCallCardProps) {
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false)
  const [scriptDialogContent, setScriptDialogContent] = useState("")

  if (!currentCall) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Check className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">All Caught Up!</h3>
            <p className="text-sm text-muted-foreground">
              {emptyMessage || (allRanked.length > 0 ? "Select calls from the table below to deep dive." : "No calls reviewed yet.")}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">
              {currentCall.lead?.company || "Unknown Company"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {currentCall.attempt.outcome} ·{" "}
              {new Date(currentCall.attempt.timestamp).toLocaleDateString()}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                variant={
                  currentCall.attempt.outcome === OUTCOMES.MEETING_SET.value
                    ? "default"
                    : currentCall.attempt.outcome?.includes("interest")
                      ? "secondary"
                      : "outline"
                }
              >
                {currentCall.attempt.outcome}
              </Badge>
              {currentCall.attempt.why && (
                <Badge variant="outline">{currentCall.attempt.why}</Badge>
              )}
              {/* Bucket badge in Deep Dive */}
              {activeTab === "deep" && (() => {
                const ranked = allRanked.find(c => c.attemptId === currentCall.attempt.id)
                if (!ranked?.callBucket) return null
                return (
                  <Badge
                    variant="secondary"
                    className={ranked.callBucket === "top"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    }
                  >
                    {ranked.callBucket === "top" ? "▲ Top 10" : "▼ Bottom 10"}
                  </Badge>
                )
              })()}
              {/* Experiment context badge */}
              {(() => {
                const ranked = allRanked.find(c => c.attemptId === currentCall.attempt.id)
                if (!ranked?.experimentName) return null
                return (
                  <>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      <FlaskConical className="h-3 w-3 mr-1 inline" /> {ranked.experimentName}
                    </Badge>
                    {ranked.variantName && (
                      <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">
                        Variant: {ranked.variantName}
                      </Badge>
                    )}
                  </>
                )
              })()}
            </div>
          </div>

          {/* Audio Player */}
          {currentCall.session?.recording_url ? (
            <div className="flex items-center gap-2">
              <audio
                controls
                src={currentCall.session.recording_url}
                className="h-8"
                preload="none"
              />
            </div>
          ) : currentCall.session ? (
            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300 animate-pulse">
              Recording pending...
            </Badge>
          ) : null}
        </div>

        {/* Transcript */}
        {currentCall.session?.transcript_text ? (
          <div className="mt-4 p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Transcript
            </p>
            <p className="text-sm whitespace-pre-wrap">{currentCall.session.transcript_text}</p>
          </div>
        ) : currentCall.session ? (
          <div className="mt-4 p-3 bg-yellow-50/50 rounded-lg border border-yellow-200">
            <p className="text-xs text-yellow-600 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Transcript processing — will appear when OpenPhone webhook delivers it
            </p>
          </div>
        ) : null}

        {/* Rep Notes */}
        {currentCall.attempt.note && (
          <div className="mt-3 p-2 bg-muted/50 rounded">
            <p className="text-xs font-medium text-muted-foreground mb-1">Rep Notes</p>
            <p className="text-sm">{currentCall.attempt.note}</p>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/40"
            onClick={() => {
              const combined = [
                currentCall.attempt.note ? `Rep Note: ${currentCall.attempt.note}` : "",
                currentCall.session?.transcript_text ? `Transcript:\n${currentCall.session.transcript_text.substring(0, 400)}${currentCall.session.transcript_text.length > 400 ? "..." : ""}` : ""
              ].filter(Boolean).join("\n\n")

              setScriptDialogContent(combined)
              setScriptDialogOpen(true)
            }}
          >
            <FlaskConical className="h-4 w-4" />
            Send to Insight Lab
          </Button>
        </div>
      </CardContent>

      <AppendToScriptDialog
        open={scriptDialogOpen}
        onOpenChange={setScriptDialogOpen}
        defaultContent={scriptDialogContent}
        sourceAttemptId={currentCall.attempt.id}
      />
    </Card>
  )
}

export type { CallSession, ReviewableCall }

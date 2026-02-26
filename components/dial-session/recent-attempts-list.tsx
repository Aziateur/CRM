"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import type { Attempt, Lead } from "@/lib/store"

interface RecentAttemptsListProps {
  sessionAttempts: Attempt[]
  leads: Lead[]
  pendingEvidence: Record<string, { addedAt: number; expiresAt: number }>
  callSessionMap: Record<string, { openphone_call_id: string | null }>
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function RecentAttemptsList({
  sessionAttempts,
  leads,
  pendingEvidence,
  callSessionMap,
}: RecentAttemptsListProps) {
  const router = useRouter()

  if (sessionAttempts.length === 0) return null

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {sessionAttempts.slice(0, 20).map((attempt) => {
              const lead = leads.find((l) => l.id === attempt.leadId)
              const hasEvidence = !!(attempt.recordingUrl || attempt.callTranscriptText)
              const isPending = attempt.id in pendingEvidence
              const csEntry = callSessionMap[attempt.id]
              const hasOpenphoneId = !!(csEntry?.openphone_call_id)

              let evidenceStatus: "ready" | "pending" | "linking" | null = null
              if (hasEvidence) {
                evidenceStatus = "ready"
              } else if (isPending && hasOpenphoneId) {
                evidenceStatus = "pending"
              } else if (isPending) {
                evidenceStatus = "linking"
              }

              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-sm truncate">{lead?.company}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {attempt.outcome}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {evidenceStatus === "linking" && (
                      <span className="text-[10px] text-amber-600 animate-pulse">Linking…</span>
                    )}
                    {evidenceStatus === "pending" && (
                      <span className="text-[10px] text-yellow-600">Rec pending</span>
                    )}
                    {evidenceStatus === "ready" && (
                      <span className="text-[10px] text-green-600">Ready</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(attempt.durationSec)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center mt-4">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => router.push("/batch-review?tab=quick")}
        >
          Review this session&apos;s calls
        </Button>
      </div>
    </>
  )
}

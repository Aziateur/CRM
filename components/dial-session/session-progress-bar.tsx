"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Zap } from "lucide-react"

interface SessionMetrics {
  connectRate: number
  dmReachRate: number
  interestRate: number
  meetingsSet: number
}

interface SessionProgressBarProps {
  attemptCount: number
  target: number
  pace: number | null
  metrics: SessionMetrics
}

export function SessionProgressBar({ attemptCount, target, pace, metrics }: SessionProgressBarProps) {
  const progress = target > 0 ? (attemptCount / target) * 100 : 0

  return (
    <Card className="mb-4">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {attemptCount} / {target}
              </p>
              <p className="text-xs text-muted-foreground">calls logged</p>
            </div>
            {pace && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span className="font-medium tabular-nums">{pace}</span>
                <span>calls/hr</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums">{metrics.connectRate}%</p>
              <p className="text-[10px] text-muted-foreground">Connect</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{metrics.dmReachRate}%</p>
              <p className="text-[10px] text-muted-foreground">DM Reach</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{metrics.interestRate}%</p>
              <p className="text-[10px] text-muted-foreground">Interest</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600 tabular-nums">{metrics.meetingsSet}</p>
              <p className="text-[10px] text-muted-foreground">Meetings</p>
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
      </CardContent>
    </Card>
  )
}

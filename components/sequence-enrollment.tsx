"use client"

import { useState } from "react"
import { useSequences, useSequenceEnrollments, useSequenceSteps } from "@/hooks/use-sequences"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ArrowRight, Pause, Play, X, ListChecks } from "lucide-react"
import type { SequenceEnrollment } from "@/lib/store"

function EnrollmentCard({ enrollment, sequenceName, totalSteps, onPause, onResume, onExit, onAdvance }: {
  enrollment: SequenceEnrollment
  sequenceName: string
  totalSteps: number
  onPause: () => void
  onResume: () => void
  onExit: () => void
  onAdvance: () => void
}) {
  const progress = totalSteps > 0 ? Math.round((enrollment.currentStep / totalSteps) * 100) : 0

  return (
    <div className="flex items-center justify-between p-2 rounded border">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{sequenceName}</span>
          <Badge
            variant={enrollment.status === "active" ? "default" : enrollment.status === "completed" ? "secondary" : "outline"}
            className="text-xs shrink-0"
          >
            {enrollment.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={progress} className="flex-1 h-1.5" />
          <span className="text-xs text-muted-foreground shrink-0">
            {enrollment.currentStep}/{totalSteps}
          </span>
        </div>
      </div>
      {enrollment.status === "active" && (
        <div className="flex gap-1 ml-2 shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onAdvance} title="Complete current step">
            <ArrowRight className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onPause} title="Pause">
            <Pause className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-600" onClick={onExit} title="Exit sequence">
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {enrollment.status === "paused" && (
        <div className="flex gap-1 ml-2 shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onResume} title="Resume">
            <Play className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-600" onClick={onExit} title="Exit sequence">
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function SequenceEnrollmentWidget({ leadId }: { leadId: string }) {
  const { sequences } = useSequences()
  const { enrollments, enroll, updateEnrollmentStatus, advanceStep } = useSequenceEnrollments(leadId)
  const [enrollOpen, setEnrollOpen] = useState(false)

  const activeSequences = sequences.filter((s) => s.isActive)
  const enrolledSequenceIds = new Set(enrollments.map((e) => e.sequenceId))

  const handleEnroll = async (sequenceId: string) => {
    await enroll(leadId, sequenceId)
    setEnrollOpen(false)
  }

  if (sequences.length === 0 && enrollments.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ListChecks className="h-4 w-4" />
            Sequences
          </CardTitle>
          <Popover open={enrollOpen} onOpenChange={setEnrollOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 bg-transparent">Enroll</Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 z-50" align="end">
              <div className="space-y-1">
                {activeSequences.filter((s) => !enrolledSequenceIds.has(s.id)).map((seq) => (
                  <button
                    key={seq.id}
                    className="w-full text-left p-2 rounded text-sm hover:bg-muted transition-colors"
                    onClick={() => handleEnroll(seq.id)}
                  >
                    {seq.name}
                  </button>
                ))}
                {activeSequences.filter((s) => !enrolledSequenceIds.has(s.id)).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No sequences available</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Not enrolled in any sequences</p>
        ) : (
          <div className="space-y-2">
            {enrollments.map((enrollment) => {
              const seq = sequences.find((s) => s.id === enrollment.sequenceId)
              return (
                <SequenceEnrollmentCard
                  key={enrollment.id}
                  enrollment={enrollment}
                  sequenceName={seq?.name || "Unknown"}
                  sequenceId={enrollment.sequenceId}
                  onPause={() => updateEnrollmentStatus(enrollment.id, "paused")}
                  onResume={() => updateEnrollmentStatus(enrollment.id, "active")}
                  onExit={() => updateEnrollmentStatus(enrollment.id, "exited", "manual")}
                  onAdvance={(totalSteps) => advanceStep(enrollment.id, totalSteps)}
                />
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SequenceEnrollmentCard({ enrollment, sequenceName, sequenceId, onPause, onResume, onExit, onAdvance }: {
  enrollment: SequenceEnrollment
  sequenceName: string
  sequenceId: string
  onPause: () => void
  onResume: () => void
  onExit: () => void
  onAdvance: (totalSteps: number) => void
}) {
  const { steps } = useSequenceSteps(sequenceId)
  const totalSteps = steps.length

  return (
    <EnrollmentCard
      enrollment={enrollment}
      sequenceName={sequenceName}
      totalSteps={totalSteps}
      onPause={onPause}
      onResume={onResume}
      onExit={onExit}
      onAdvance={() => onAdvance(totalSteps)}
    />
  )
}

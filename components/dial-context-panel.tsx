"use client"

import { useTasks } from "@/hooks/use-tasks"
import { useLeadActivities } from "@/hooks/use-lead-activities"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, Clock, MessageSquare, Target, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Lead, Attempt } from "@/lib/store"

function timeSince(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  if (diffHours < 1) return "just now"
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "1d ago"
  return `${diffDays}d ago`
}

const taskTypeLabels: Record<string, string> = {
  call_back: "Call",
  follow_up: "Follow up",
  meeting: "Meeting",
  email: "Email",
  custom: "Task",
}

interface DialContextPanelProps {
  lead: Lead
  attempts: Attempt[]
}

export function DialContextPanel({ lead, attempts }: DialContextPanelProps) {
  const { tasks, completeTask } = useTasks({ leadId: lead.id })
  const { activities } = useLeadActivities(lead.id)

  const leadAttempts = attempts
    .filter((a) => a.leadId === lead.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const lastAttempt = leadAttempts[0] || null

  const recentNotes = activities
    .filter((a) => a.activityType === "note")
    .slice(0, 2)

  const hasContent = lastAttempt || tasks.length > 0 || lead.nextCallObjective || recentNotes.length > 0

  if (!hasContent) return null

  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="pt-4 pb-3 space-y-3">
        {/* Last Attempt */}
        {lastAttempt && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase">Last:</span>
            <Badge variant="secondary" className="text-xs">{lastAttempt.outcome}</Badge>
            {lastAttempt.note && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">&ldquo;{lastAttempt.note}&rdquo;</span>
            )}
            <span className="text-xs text-muted-foreground">{timeSince(lastAttempt.timestamp)}</span>
          </div>
        )}

        {/* Pending Tasks */}
        {tasks.length > 0 && (
          <div className="space-y-1">
            {tasks.slice(0, 3).map((task) => {
              const isOverdue = new Date(task.dueAt) < new Date(new Date().toDateString())
              return (
                <div key={task.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-3 w-3 ${isOverdue ? "text-red-500" : "text-muted-foreground"}`} />
                    <Badge variant="outline" className="text-[10px] px-1 py-0">{taskTypeLabels[task.type] ?? task.type}</Badge>
                    <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : ""}`}>{task.title}</span>
                    <span className={`text-[10px] ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                      {isOverdue ? "overdue" : new Date(task.dueAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => completeTask(task.id)}>
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* Next Call Objective */}
        {lead.nextCallObjective ? (
          <div className="flex items-start gap-2">
            <Target className="h-3 w-3 text-primary mt-0.5 shrink-0" />
            <span className="text-xs">{lead.nextCallObjective}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3 text-amber-500" />
            <span className="text-xs text-amber-600">No call objective set</span>
          </div>
        )}

        {/* Recent Notes */}
        {recentNotes.length > 0 && (
          <div className="space-y-1">
            {recentNotes.map((note) => (
              <div key={note.id} className="flex items-start gap-2">
                <MessageSquare className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{note.description}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

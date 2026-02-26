"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Clock, AlertCircle } from "lucide-react"
import type { Task, Lead } from "@/lib/store"

interface TasksDashboardProps {
  tasks: Task[]
  leads: Lead[]
  onCompleteTask: (taskId: string) => void
  onSelectLead: (leadId: string) => void
}

function isOverdue(dueAt: string): boolean {
  return new Date(dueAt) < new Date(new Date().toDateString())
}

function isDueToday(dueAt: string): boolean {
  const due = new Date(dueAt).toDateString()
  const today = new Date().toDateString()
  return due === today
}

function formatDueDate(dueAt: string): string {
  const due = new Date(dueAt)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  return `In ${diffDays}d`
}

const taskTypeLabels: Record<string, string> = {
  call_back: "Call",
  follow_up: "Follow up",
  meeting: "Meeting",
  email: "Email",
  custom: "Task",
}

export function TasksDashboard({ tasks, leads, onCompleteTask, onSelectLead }: TasksDashboardProps) {
  const { overdue, today, upcoming } = useMemo(() => {
    const o: Task[] = []
    const t: Task[] = []
    const u: Task[] = []

    for (const task of tasks) {
      if (isOverdue(task.dueAt)) o.push(task)
      else if (isDueToday(task.dueAt)) t.push(task)
      else u.push(task)
    }
    return { overdue: o, today: t, upcoming: u.slice(0, 5) }
  }, [tasks])

  if (tasks.length === 0) return null

  const getLeadName = (leadId: string) => {
    return leads.find((l) => l.id === leadId)?.company ?? "Unknown"
  }

  const renderTask = (task: Task, variant: "overdue" | "today" | "upcoming") => {
    const colors = {
      overdue: "border-red-200 bg-red-50",
      today: "border-amber-200 bg-amber-50",
      upcoming: "border-border bg-background",
    }

    return (
      <div
        key={task.id}
        className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${colors[variant]}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs shrink-0">
              {taskTypeLabels[task.type] ?? task.type}
            </Badge>
            <span className="text-sm truncate">{task.title}</span>
          </div>
          <button
            className="text-xs text-primary hover:underline mt-0.5"
            onClick={() => onSelectLead(task.leadId)}
          >
            {getLeadName(task.leadId)}
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs ${variant === "overdue" ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
            {formatDueDate(task.dueAt)}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onCompleteTask(task.id)}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Tasks
          {overdue.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {overdue.length} overdue
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {overdue.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <AlertCircle className="h-3 w-3" />
              Overdue
            </div>
            {overdue.map((t) => renderTask(t, "overdue"))}
          </div>
        )}
        {today.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-amber-600">Due Today</p>
            {today.map((t) => renderTask(t, "today"))}
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
            {upcoming.map((t) => renderTask(t, "upcoming"))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

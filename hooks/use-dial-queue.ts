"use client"

import { useMemo } from "react"
import type { Lead, Attempt, Task } from "@/lib/store"

export interface QueueItem {
  lead: Lead
  reason: string
  task: Task | null
}

/**
 * Builds a prioritized, deduplicated dial queue from leads, attempts, and tasks.
 *
 * Priority buckets (a lead appears once, in its highest bucket):
 *   1. Overdue tasks   — due_at < start of today, incomplete
 *   2. Due today        — due_at is today, incomplete
 *   3. Scheduled follow-ups — last attempt says "Call again"/"Follow up", no pending task
 *   4. Fresh leads      — 0 attempts, newest first
 *   5. Stale leads      — has attempts, no pending task, oldest last attempt first
 *
 * Excludes: leads without phone, leads in won/lost stages.
 */
export function useDialQueue(
  leads: Lead[],
  attempts: Attempt[],
  tasks: Task[],
): { queue: QueueItem[]; loading: false } {
  const queue = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // Index: latest attempt per lead
    const latestAttemptByLead = new Map<string, Attempt>()
    for (const a of attempts) {
      const existing = latestAttemptByLead.get(a.leadId)
      if (!existing || new Date(a.timestamp) > new Date(existing.timestamp)) {
        latestAttemptByLead.set(a.leadId, a)
      }
    }

    // Index: pending tasks per lead (incomplete only)
    const tasksByLead = new Map<string, Task[]>()
    for (const t of tasks) {
      if (t.completedAt) continue
      const list = tasksByLead.get(t.leadId) || []
      list.push(t)
      tasksByLead.set(t.leadId, list)
    }

    // Filter dialable leads
    const wonLostNames = new Set(["Won", "Lost", "Closed Won", "Closed Lost"])
    const dialable = leads.filter((l) => {
      if (!l.phone) return false
      if (l.stage && wonLostNames.has(l.stage)) return false
      return true
    })

    // Buckets
    const overdue: QueueItem[] = []
    const dueToday: QueueItem[] = []
    const followUps: QueueItem[] = []
    const fresh: QueueItem[] = []
    const stale: QueueItem[] = []

    const seen = new Set<string>()

    // Pass 1: task-driven buckets (overdue + due today)
    for (const lead of dialable) {
      const leadTasks = tasksByLead.get(lead.id)
      if (!leadTasks || leadTasks.length === 0) continue

      // Sort tasks by due date ascending to pick the most urgent
      const sorted = [...leadTasks].sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      )
      const urgentTask = sorted[0]
      const dueDate = new Date(urgentTask.dueAt)

      if (dueDate < todayStart) {
        const daysOverdue = Math.floor((todayStart.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        overdue.push({
          lead,
          reason: `Overdue ${daysOverdue}d: ${urgentTask.title}`,
          task: urgentTask,
        })
        seen.add(lead.id)
      } else if (dueDate < todayEnd) {
        dueToday.push({
          lead,
          reason: `Due today: ${urgentTask.title}`,
          task: urgentTask,
        })
        seen.add(lead.id)
      }
      // Future tasks don't create queue entries
    }

    // Sort overdue: oldest due first
    overdue.sort((a, b) => new Date(a.task!.dueAt).getTime() - new Date(b.task!.dueAt).getTime())
    // Sort due today: earliest due first
    dueToday.sort((a, b) => new Date(a.task!.dueAt).getTime() - new Date(b.task!.dueAt).getTime())

    // Pass 2: remaining leads → follow-ups, fresh, stale
    for (const lead of dialable) {
      if (seen.has(lead.id)) continue

      const lastAttempt = latestAttemptByLead.get(lead.id)
      const hasPendingTask = (tasksByLead.get(lead.id) || []).length > 0

      if (!lastAttempt) {
        // No attempts = fresh lead
        fresh.push({ lead, reason: "Fresh lead", task: null })
      } else if (
        !hasPendingTask &&
        (lastAttempt.nextAction === "Call again" || lastAttempt.nextAction === "Follow up")
      ) {
        const daysSince = Math.floor(
          (now.getTime() - new Date(lastAttempt.timestamp).getTime()) / (1000 * 60 * 60 * 24),
        )
        followUps.push({
          lead,
          reason: `${lastAttempt.nextAction} — ${daysSince}d ago`,
          task: null,
        })
      } else if (!hasPendingTask && lastAttempt.nextAction !== "Drop" && lastAttempt.nextAction !== "Meeting scheduled") {
        const daysSince = Math.floor(
          (now.getTime() - new Date(lastAttempt.timestamp).getTime()) / (1000 * 60 * 60 * 24),
        )
        stale.push({
          lead,
          reason: `Stale: ${daysSince}d since last call`,
          task: null,
        })
      }
    }

    // Sort follow-ups: oldest attempt first (most overdue follow-up)
    followUps.sort((a, b) => {
      const aTime = latestAttemptByLead.get(a.lead.id)?.timestamp || ""
      const bTime = latestAttemptByLead.get(b.lead.id)?.timestamp || ""
      return new Date(aTime).getTime() - new Date(bTime).getTime()
    })

    // Sort fresh: newest created_at first
    fresh.sort((a, b) => new Date(b.lead.createdAt).getTime() - new Date(a.lead.createdAt).getTime())

    // Sort stale: oldest last attempt first
    stale.sort((a, b) => {
      const aTime = latestAttemptByLead.get(a.lead.id)?.timestamp || ""
      const bTime = latestAttemptByLead.get(b.lead.id)?.timestamp || ""
      return new Date(aTime).getTime() - new Date(bTime).getTime()
    })

    return [...overdue, ...dueToday, ...followUps, ...fresh, ...stale]
  }, [leads, attempts, tasks])

  return { queue, loading: false }
}

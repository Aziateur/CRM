"use client"

import { useMemo } from "react"
import type { Lead, Attempt, Task } from "@/lib/store"
import type { DialMode } from "@/hooks/use-dial-modes"

export interface QueueItem {
  lead: Lead
  reason: string
  task: Task | null
  source: DialMode | "task" | "stale"
}

/**
 * Builds a prioritized, deduplicated dial queue from leads, attempts, and tasks.
 *
 * When mode is specified, only returns leads matching that mode:
 *   - "new": leads with 0 attempts, oldest created first
 *   - "followups": leads with pending tasks or next_action = call again/follow up
 *   - "interested": last outcome shows interest, or stage = Interested/Meeting Set
 *   - "nurture": no interest but recoverable (money/timing), or stage = Nurture
 *
 * When mode is null/undefined (legacy "all" mode), uses the original 5-bucket system:
 *   1. Overdue tasks
 *   2. Due today
 *   3. Follow-ups (no task but next_action says call again)
 *   4. Fresh leads (0 attempts)
 *   5. Stale leads
 *
 * Excludes: leads without phone, leads in won/lost stages.
 */
export function useDialQueue(
  leads: Lead[],
  attempts: Attempt[],
  tasks: Task[],
  mode?: DialMode | null,
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
    const wonLostNames = new Set(["Won", "Lost", "Closed Won", "Closed Lost", "Disqualified"])
    const dialable = leads.filter((l) => {
      if (!l.phone) return false
      if (l.stage && wonLostNames.has(l.stage)) return false
      return true
    })

    // ─── MODE-SPECIFIC QUEUES ───

    if (mode === "new") {
      return dialable
        .filter((l) => !latestAttemptByLead.has(l.id))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((lead): QueueItem => ({
          lead,
          reason: "Fresh lead — no previous calls",
          task: null,
          source: "new",
        }))
    }

    if (mode === "followups") {
      const items: QueueItem[] = []

      for (const lead of dialable) {
        const leadTasks = tasksByLead.get(lead.id)
        const lastAttempt = latestAttemptByLead.get(lead.id)

        // Has pending tasks
        if (leadTasks && leadTasks.length > 0) {
          const sorted = [...leadTasks].sort(
            (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
          )
          const urgentTask = sorted[0]
          const dueDate = new Date(urgentTask.dueAt)
          const isOverdue = dueDate < todayStart
          const daysOverdue = isOverdue
            ? Math.floor((todayStart.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0

          items.push({
            lead,
            reason: isOverdue
              ? `Overdue ${daysOverdue}d: ${urgentTask.title}`
              : dueDate < todayEnd
                ? `Due today: ${urgentTask.title}`
                : `Upcoming: ${urgentTask.title}`,
            task: urgentTask,
            source: "followups",
          })
          continue
        }

        // No task but next_action says to call again
        if (
          lastAttempt &&
          (lastAttempt.nextAction === "Call again" || lastAttempt.nextAction === "Follow up")
        ) {
          const daysSince = Math.floor(
            (now.getTime() - new Date(lastAttempt.timestamp).getTime()) / (1000 * 60 * 60 * 24),
          )
          items.push({
            lead,
            reason: `${lastAttempt.nextAction} — ${daysSince}d ago`,
            task: null,
            source: "followups",
          })
        }
      }

      // Sort: overdue first → priority → due date
      items.sort((a, b) => {
        const aDue = a.task ? new Date(a.task.dueAt).getTime() : Infinity
        const bDue = b.task ? new Date(b.task.dueAt).getTime() : Infinity
        return aDue - bDue
      })

      return items
    }

    if (mode === "interested") {
      return dialable
        .filter((lead) => {
          const lastAttempt = latestAttemptByLead.get(lead.id)
          const lastOutcome = lastAttempt?.outcome
          return (
            lastOutcome === "DM reached → Some interest" ||
            lastOutcome === "Meeting set" ||
            lead.stage === "Interested" ||
            lead.stage === "Meeting Set"
          )
        })
        .sort((a, b) => {
          // Tasks due first, then recent interest
          const aTask = tasksByLead.get(a.id)?.[0]
          const bTask = tasksByLead.get(b.id)?.[0]
          if (aTask && !bTask) return -1
          if (!aTask && bTask) return 1
          if (aTask && bTask)
            return new Date(aTask.dueAt).getTime() - new Date(bTask.dueAt).getTime()
          // Both no task: most recent interaction first
          const aTime = latestAttemptByLead.get(a.id)?.timestamp || a.createdAt
          const bTime = latestAttemptByLead.get(b.id)?.timestamp || b.createdAt
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })
        .map((lead): QueueItem => {
          const lastAttempt = latestAttemptByLead.get(lead.id)
          const daysSince = lastAttempt
            ? Math.floor(
              (now.getTime() - new Date(lastAttempt.timestamp).getTime()) /
              (1000 * 60 * 60 * 24),
            )
            : 0
          return {
            lead,
            reason: `Showed interest ${daysSince}d ago`,
            task: tasksByLead.get(lead.id)?.[0] || null,
            source: "interested",
          }
        })
    }

    if (mode === "nurture") {
      return dialable
        .filter((lead) => {
          const lastAttempt = latestAttemptByLead.get(lead.id)
          const lastOutcome = lastAttempt?.outcome
          return (
            (lastOutcome === "DM reached → No interest" &&
              lastAttempt?.why &&
              ["Money", "Timing", "Not now"].includes(lastAttempt.why)) ||
            lead.stage === "Nurture"
          )
        })
        .sort((a, b) => {
          // Due tasks first, then oldest contact
          const aTask = tasksByLead.get(a.id)?.[0]
          const bTask = tasksByLead.get(b.id)?.[0]
          if (aTask && !bTask) return -1
          if (!aTask && bTask) return 1
          if (aTask && bTask)
            return new Date(aTask.dueAt).getTime() - new Date(bTask.dueAt).getTime()
          const aTime = latestAttemptByLead.get(a.id)?.timestamp || a.createdAt
          const bTime = latestAttemptByLead.get(b.id)?.timestamp || b.createdAt
          return new Date(aTime).getTime() - new Date(bTime).getTime()
        })
        .map((lead): QueueItem => {
          const lastAttempt = latestAttemptByLead.get(lead.id)
          const reason = lastAttempt?.why
            ? `${lastAttempt.why} — revisit`
            : "Nurture stage"
          return {
            lead,
            reason,
            task: tasksByLead.get(lead.id)?.[0] || null,
            source: "nurture",
          }
        })
    }

    // ─── LEGACY "ALL" MODE (no mode selected) ───

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

      const sorted = [...leadTasks].sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      )
      const urgentTask = sorted[0]
      const dueDate = new Date(urgentTask.dueAt)

      if (dueDate < todayStart) {
        const daysOverdue = Math.floor(
          (todayStart.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        )
        overdue.push({
          lead,
          reason: `Overdue ${daysOverdue}d: ${urgentTask.title}`,
          task: urgentTask,
          source: "task",
        })
        seen.add(lead.id)
      } else if (dueDate < todayEnd) {
        dueToday.push({
          lead,
          reason: `Due today: ${urgentTask.title}`,
          task: urgentTask,
          source: "task",
        })
        seen.add(lead.id)
      }
    }

    overdue.sort(
      (a, b) => new Date(a.task!.dueAt).getTime() - new Date(b.task!.dueAt).getTime(),
    )
    dueToday.sort(
      (a, b) => new Date(a.task!.dueAt).getTime() - new Date(b.task!.dueAt).getTime(),
    )

    // Pass 2: remaining
    for (const lead of dialable) {
      if (seen.has(lead.id)) continue

      const lastAttempt = latestAttemptByLead.get(lead.id)
      const hasPendingTask = (tasksByLead.get(lead.id) || []).length > 0

      if (!lastAttempt) {
        fresh.push({ lead, reason: "Fresh lead", task: null, source: "new" })
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
          source: "followups",
        })
      } else if (
        !hasPendingTask &&
        lastAttempt.nextAction !== "Drop" &&
        lastAttempt.nextAction !== "Meeting scheduled"
      ) {
        const daysSince = Math.floor(
          (now.getTime() - new Date(lastAttempt.timestamp).getTime()) / (1000 * 60 * 60 * 24),
        )
        stale.push({
          lead,
          reason: `Stale: ${daysSince}d since last call`,
          task: null,
          source: "stale",
        })
      }
    }

    followUps.sort((a, b) => {
      const aTime = latestAttemptByLead.get(a.lead.id)?.timestamp || ""
      const bTime = latestAttemptByLead.get(b.lead.id)?.timestamp || ""
      return new Date(aTime).getTime() - new Date(bTime).getTime()
    })

    fresh.sort(
      (a, b) => new Date(b.lead.createdAt).getTime() - new Date(a.lead.createdAt).getTime(),
    )

    stale.sort((a, b) => {
      const aTime = latestAttemptByLead.get(a.lead.id)?.timestamp || ""
      const bTime = latestAttemptByLead.get(b.lead.id)?.timestamp || ""
      return new Date(aTime).getTime() - new Date(bTime).getTime()
    })

    return [...overdue, ...dueToday, ...followUps, ...fresh, ...stale]
  }, [leads, attempts, tasks, mode])

  return { queue, loading: false }
}

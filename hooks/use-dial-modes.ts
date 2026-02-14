"use client"

import { useMemo } from "react"
import type { Lead, Attempt, Task } from "@/lib/store"

export type DialMode = "new" | "followups" | "interested" | "nurture"

export interface DialModeCounts {
    new: number
    followups: number
    interested: number
    nurture: number
}

export interface DialModeInfo {
    id: DialMode
    label: string
    description: string
    count: number
    icon: string // emoji for simple display
}

/**
 * Computes live counts of leads available for each dial mode.
 * Used in the session setup screen to show mode cards with counts.
 */
export function useDialModes(
    leads: Lead[],
    attempts: Attempt[],
    tasks: Task[],
): { modes: DialModeInfo[]; counts: DialModeCounts } {
    const result = useMemo(() => {
        const now = new Date()
        const wonLostNames = new Set(["Won", "Lost", "Closed Won", "Closed Lost", "Disqualified"])

        // Filter to dialable leads only (has phone, not won/lost)
        const dialable = leads.filter((l) => {
            if (!l.phone) return false
            if (l.stage && wonLostNames.has(l.stage)) return false
            return true
        })

        // Index: latest attempt per lead
        const latestAttemptByLead = new Map<string, Attempt>()
        for (const a of attempts) {
            const existing = latestAttemptByLead.get(a.leadId)
            if (!existing || new Date(a.timestamp) > new Date(existing.timestamp)) {
                latestAttemptByLead.set(a.leadId, a)
            }
        }

        // Index: pending (incomplete) tasks per lead
        const tasksByLead = new Map<string, Task[]>()
        for (const t of tasks) {
            if (t.completedAt) continue
            const list = tasksByLead.get(t.leadId) || []
            list.push(t)
            tasksByLead.set(t.leadId, list)
        }

        // Count per mode
        let newCount = 0
        let followupsCount = 0
        let interestedCount = 0
        let nurtureCount = 0

        for (const lead of dialable) {
            const lastAttempt = latestAttemptByLead.get(lead.id)
            const hasPendingTask = (tasksByLead.get(lead.id) || []).length > 0
            const lastOutcome = lastAttempt?.outcome

            // New: 0 attempts
            if (!lastAttempt) {
                newCount++
                continue
            }

            // Interested: last outcome shows interest or meeting pending
            if (
                lastOutcome === "DM reached → Some interest" ||
                lastOutcome === "Meeting set" ||
                lead.stage === "Interested" ||
                lead.stage === "Meeting Set"
            ) {
                interestedCount++
                continue
            }

            // Nurture: no interest but recoverable (money/timing), or nurture stage
            if (
                (lastOutcome === "DM reached → No interest" &&
                    lastAttempt.why &&
                    ["Money", "Timing", "Not now"].includes(lastAttempt.why)) ||
                lead.stage === "Nurture"
            ) {
                nurtureCount++
                continue
            }

            // Follow-ups: has pending tasks or next_action says to follow up
            if (
                hasPendingTask ||
                lastAttempt.nextAction === "Call again" ||
                lastAttempt.nextAction === "Follow up"
            ) {
                followupsCount++
                continue
            }
        }

        const counts: DialModeCounts = {
            new: newCount,
            followups: followupsCount,
            interested: interestedCount,
            nurture: nurtureCount,
        }

        const modes: DialModeInfo[] = [
            {
                id: "new",
                label: "New Leads",
                description: "Fresh leads with 0 attempts. Oldest created first.",
                count: counts.new,
                icon: "🆕",
            },
            {
                id: "followups",
                label: "Follow-ups",
                description: "Leads with pending tasks or scheduled callbacks. Overdue first.",
                count: counts.followups,
                icon: "📋",
            },
            {
                id: "interested",
                label: "Interested",
                description: "DMs who showed interest or have meetings set.",
                count: counts.interested,
                icon: "🔥",
            },
            {
                id: "nurture",
                label: "Nurture",
                description: "Not ready now — money, timing, or 'no' to revisit.",
                count: counts.nurture,
                icon: "🌱",
            },
        ]

        return { modes, counts }
    }, [leads, attempts, tasks])

    return result
}

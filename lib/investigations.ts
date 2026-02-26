/**
 * Intelligence Incubator — Types & Configuration
 *
 * All constants, types, and status definitions for the investigation system.
 * Nothing is hardcoded in components — everything is driven from here.
 */

// ─── Signal Status Machine ───

export const SIGNAL_STATUSES = {
    PENDING: "pending",
    INCUBATING: "incubating",
    DEPLOYED: "deployed",
    QUICK_DEPLOYED: "quick_deployed",
    DISCARDED: "discarded",
} as const

export type SignalStatus = (typeof SIGNAL_STATUSES)[keyof typeof SIGNAL_STATUSES]

/** Statuses that still appear in the raw Feed */
export const FEED_STATUSES: SignalStatus[] = [SIGNAL_STATUSES.PENDING]

/** Statuses that count as "resolved" */
export const RESOLVED_STATUSES: SignalStatus[] = [
    SIGNAL_STATUSES.DEPLOYED,
    SIGNAL_STATUSES.QUICK_DEPLOYED,
    SIGNAL_STATUSES.DISCARDED,
]

// ─── Investigation Status Machine ───

export const INVESTIGATION_STATUSES = {
    OPEN: "open",
    CRYSTALLIZED: "crystallized",
    ARCHIVED: "archived",
} as const

export type InvestigationStatus =
    (typeof INVESTIGATION_STATUSES)[keyof typeof INVESTIGATION_STATUSES]

// ─── Investigation Priority ───

export const PRIORITIES = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical",
} as const

export type Priority = (typeof PRIORITIES)[keyof typeof PRIORITIES]

export const PRIORITY_CONFIG: Record<
    Priority,
    { label: string; color: string; bg: string; border: string; sortWeight: number }
> = {
    critical: {
        label: "Critical",
        color: "text-red-700 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-950/30",
        border: "border-red-300 dark:border-red-700",
        sortWeight: 0,
    },
    high: {
        label: "High",
        color: "text-orange-700 dark:text-orange-400",
        bg: "bg-orange-50 dark:bg-orange-950/30",
        border: "border-orange-300 dark:border-orange-700",
        sortWeight: 1,
    },
    medium: {
        label: "Medium",
        color: "text-blue-700 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-300 dark:border-blue-700",
        sortWeight: 2,
    },
    low: {
        label: "Low",
        color: "text-slate-600 dark:text-slate-400",
        bg: "bg-slate-50 dark:bg-slate-950/30",
        border: "border-slate-300 dark:border-slate-700",
        sortWeight: 3,
    },
}

// ─── Pillar Config (moved from insight-lab-panel for reuse) ───

export const PILLAR_IDS = {
    OFFER: "offer",
    OPERATOR: "operator",
    MARKET: "market",
    MESSAGING: "messaging",
} as const

export type PillarId = (typeof PILLAR_IDS)[keyof typeof PILLAR_IDS]

export type InboxPrescriptionType = "intel_entry" | "drill" | "stop_signal" | "script_section"

export interface PillarConfig {
    id: PillarId
    label: string
    sub: string
    emoji: string
    color: string
    border: string
    bg: string
    activeBg: string
}

export const PILLARS: PillarConfig[] = [
    {
        id: "offer",
        label: "Offer & Value",
        sub: "Math, ROI, conviction",
        emoji: "💰",
        color: "text-yellow-700 dark:text-yellow-400",
        border: "border-yellow-300 dark:border-yellow-700",
        bg: "bg-yellow-50/60 dark:bg-yellow-950/20",
        activeBg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700",
    },
    {
        id: "operator",
        label: "Operator & Execution",
        sub: "Tone, pacing, pressure",
        emoji: "🎭",
        color: "text-red-700 dark:text-red-400",
        border: "border-red-300 dark:border-red-700",
        bg: "bg-red-50/60 dark:bg-red-950/20",
        activeBg: "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700",
    },
    {
        id: "market",
        label: "Market & ICP",
        sub: "Wrong target, new intel",
        emoji: "🗺️",
        color: "text-blue-700 dark:text-blue-400",
        border: "border-blue-300 dark:border-blue-700",
        bg: "bg-blue-50/60 dark:bg-blue-950/20",
        activeBg: "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700",
    },
    {
        id: "messaging",
        label: "Messaging / Talk-track",
        sub: "Script logic, discovery Qs",
        emoji: "💬",
        color: "text-green-700 dark:text-green-400",
        border: "border-green-300 dark:border-green-700",
        bg: "bg-green-50/60 dark:bg-green-950/20",
        activeBg: "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700",
    },
]

export function getPillarConfig(id: PillarId): PillarConfig {
    return PILLARS.find(p => p.id === id)!
}

// ─── Deployment Receipt Types ───

export interface DeploymentReceiptEntry {
    type: "intel_entry" | "segment" | "script_section" | "drill" | "stop_signal"
    id: string
    label?: string
}

// ─── Investigation Type ───

export interface Investigation {
    id: string
    projectId: string
    title: string
    status: InvestigationStatus
    hypothesis: string | null
    scratchpad: string | null
    priority: Priority
    deploymentReceipt: DeploymentReceiptEntry[] | null
    createdAt: string
    updatedAt: string
    crystallizedAt: string | null
    // Joined data (when fetched with signals)
    signalCount?: number
}

// ─── Aging threshold (days before we highlight a stale signal) ───

export const SIGNAL_AGING_DAYS = 7

/** Returns true if the signal is older than SIGNAL_AGING_DAYS */
export function isAgingSignal(createdAt: string): boolean {
    const age = Date.now() - new Date(createdAt).getTime()
    return age > SIGNAL_AGING_DAYS * 86_400_000
}

/** Human-readable age string */
export function signalAge(createdAt: string): string {
    const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000)
    if (hours < 1) return "just now"
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return "1 day ago"
    return `${days} days ago`
}

/** Human-readable age for investigations */
export function investigationAge(createdAt: string): string {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
    if (days === 0) return "Today"
    if (days === 1) return "1 day"
    return `${days} days`
}

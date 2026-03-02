/**
 * Centralized query key factory.
 * All React Query cache keys are defined here to prevent key drift.
 */
export const queryKeys = {
    rankedCalls: (projectId: string) => ["rankedCalls", projectId] as const,
    experiments: (projectId: string) => ["experiments", projectId] as const,
    experimentStats: (experimentId: string) => ["experimentStats", experimentId] as const,
    templates: (projectId: string) => ["templates", projectId] as const,
    attempts: (projectId: string) => ["attempts", projectId] as const,
    signals: (projectId: string) => ["signals", projectId] as const,
    framework: (projectId: string) => ["framework", projectId] as const,
    frictionCategories: (projectId: string) => ["frictionCategories", projectId] as const,
    frictionLogs: (projectId: string) => ["frictionLogs", projectId] as const,

    categories: (projectId: string, categoryType: string) => ["categories", projectId, categoryType] as const,
    tabConfig: (projectId: string) => ["tabConfig", projectId] as const,
    scripts: (projectId: string) => ["scripts", projectId] as const,
    scriptSections: (scriptId: string) => ["scriptSections", scriptId] as const,

    metricDefinitions: (projectId: string) => ["metricDefinitions", projectId] as const,
    dashboardWidgets: (projectId: string) => ["dashboardWidgets", projectId] as const,
    metricGoals: (projectId: string) => ["metricGoals", projectId] as const,
    kbMetrics: (projectId: string) => ["kbMetrics", projectId] as const,
    drills: (projectId: string) => ["drills", projectId] as const,
    stopSignals: (projectId: string) => ["stopSignals", projectId] as const,
    scriptInbox: (projectId: string, status: string) => ["scriptInbox", projectId, status] as const,
    investigations: (projectId: string, status?: string) => ["investigations", projectId, status ?? "all"] as const,
    investigation: (id: string) => ["investigation", id] as const,
    // Intel Graph
    base: (projectId: string) => ["project", projectId] as const,
    intel: (projectId: string, altitude: number, scopeId: string) => ["project", projectId, "intel", altitude, scopeId] as const,
    intelSegment: (projectId: string, segmentId: string) => ["project", projectId, "intel", "segment-all", segmentId] as const,
    intelEntries: (projectId: string, scope: string) => ["project", projectId, "intel-entries", scope] as const,
    kbCategories: (projectId: string) => ["kbCategories", projectId] as const,
    kbEntries: (projectId: string) => ["kbEntries", projectId] as const,
    segmentEntries: (projectId: string, segmentId: string) => ["segmentEntries", projectId, segmentId] as const,
    pinnedSegmentEntries: (projectId: string) => ["pinnedSegmentEntries", projectId] as const,
}

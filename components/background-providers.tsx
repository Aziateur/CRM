"use client"

import { WorkflowRunnerProvider } from "@/hooks/use-workflow-runner"

/**
 * Client-side providers that run invisible background services.
 * Mounted once in layout.tsx inside AuthGate.
 */
export function BackgroundProviders() {
    return (
        <>
            <WorkflowRunnerProvider />
        </>
    )
}

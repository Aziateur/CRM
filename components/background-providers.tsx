"use client"

import { WorkflowRunnerProvider } from "@/hooks/use-workflow-runner"
import { SequenceRunnerProvider } from "@/hooks/use-sequence-runner"

/**
 * Client-side providers that run invisible background services.
 * Mounted once in layout.tsx inside AuthGate.
 */
export function BackgroundProviders() {
    return (
        <>
            <WorkflowRunnerProvider />
            <SequenceRunnerProvider />
        </>
    )
}

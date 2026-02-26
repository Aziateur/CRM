"use client"

import { useAuth } from "@/lib/auth-context"

/**
 * Returns the current project ID from auth context.
 * All data hooks should use this to scope queries to the active project.
 */
export function useProjectId(): string | null {
    const { currentProjectId } = useAuth()
    return currentProjectId
}

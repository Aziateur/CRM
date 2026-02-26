"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"

/**
 * Subscribe to Supabase Realtime for tables that affect the Batch Review system.
 * On any change, invalidate the relevant React Query caches.
 *
 * Mount this hook once in the ReviewPage to enable:
 * - Multi-tab coherence (changes in one tab appear in another)
 * - Multi-user sync (if two reviewers work simultaneously)
 */
export function useRealtimeInvalidation() {
    const queryClient = useQueryClient()
    const projectId = useProjectId()

    useEffect(() => {
        if (!projectId) return

        const supabase = getSupabase()

        const channel = supabase
            .channel(`batch_review_${projectId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "call_reviews" },
                () => {
                    queryClient.invalidateQueries({ queryKey: queryKeys.rankedCalls(projectId) })
                },
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "experiments" },
                () => {
                    queryClient.invalidateQueries({ queryKey: queryKeys.experiments(projectId) })
                },
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "experiment_variants" },
                () => {
                    queryClient.invalidateQueries({ queryKey: queryKeys.experiments(projectId) })
                },
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "attempts" },
                () => {
                    queryClient.invalidateQueries({ queryKey: queryKeys.attempts(projectId) })
                },
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [projectId, queryClient])
}

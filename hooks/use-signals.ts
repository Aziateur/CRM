"use client"

import { useCallback, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import {
  fetchProjectSignals,
  upsertSignal,
  migrateLocalStorageSignals,
  countSignals as countSignalsHelper,
  hasSignal as hasSignalHelper,
  getAttemptSignal as getAttemptSignalHelper,
  type SignalsMap,
} from "@/lib/signals"

export function useSignals() {
  const projectId = useProjectId()
  const queryClient = useQueryClient()
  const migrated = useRef(false)

  const { data: signalsMap = {} as SignalsMap, isLoading } = useQuery({
    queryKey: queryKeys.signals(projectId ?? ""),
    queryFn: () => fetchProjectSignals(projectId!),
    enabled: !!projectId,
    staleTime: 30_000,
  })

  // One-time migration from localStorage
  useEffect(() => {
    if (!projectId || migrated.current) return
    migrated.current = true
    migrateLocalStorageSignals(projectId).then((count) => {
      if (count > 0) {
        console.log(`[signals] migrated ${count} signals from localStorage`)
        queryClient.invalidateQueries({ queryKey: queryKeys.signals(projectId) })
      }
    })
  }, [projectId, queryClient])

  const setSignalMutation = useMutation({
    mutationFn: async ({ attemptId, leverKey, value }: { attemptId: string; leverKey: string; value: boolean }) => {
      if (!projectId) throw new Error("No project selected")
      return upsertSignal(attemptId, leverKey, value, projectId)
    },
    // Optimistic update
    onMutate: async ({ attemptId, leverKey, value }) => {
      const key = queryKeys.signals(projectId ?? "")
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<SignalsMap>(key)

      queryClient.setQueryData<SignalsMap>(key, (old = {}) => ({
        ...old,
        [attemptId]: {
          values: { ...(old[attemptId]?.values ?? {}), [leverKey]: value },
          createdAt: old[attemptId]?.createdAt ?? new Date().toISOString(),
        },
      }))

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.signals(projectId ?? ""), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.signals(projectId ?? "") })
    },
  })

  const setAttemptSignal = useCallback(
    (attemptId: string, leverKey: string, value: boolean) => {
      setSignalMutation.mutate({ attemptId, leverKey, value })
    },
    [setSignalMutation],
  )

  const countSignals = useCallback(
    (attemptIds: string[], counterKey: string): number => {
      return countSignalsHelper(signalsMap, attemptIds, counterKey)
    },
    [signalsMap],
  )

  const hasSignal = useCallback(
    (attemptId: string): boolean => {
      return hasSignalHelper(signalsMap, attemptId)
    },
    [signalsMap],
  )

  const getAttemptSignal = useCallback(
    (attemptId: string, leverKey: string): boolean | undefined => {
      return getAttemptSignalHelper(signalsMap, attemptId, leverKey)
    },
    [signalsMap],
  )

  return {
    signalsMap,
    isLoading,
    setAttemptSignal,
    countSignals,
    hasSignal,
    getAttemptSignal,
  }
}

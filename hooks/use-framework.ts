"use client"

import { useCallback, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectId } from "@/hooks/use-project-id"
import { queryKeys } from "@/lib/query-keys"
import {
  fetchFramework,
  saveFrameworkToDb,
  validateFramework,
  migrateLocalStorageFramework,
  getActivePhase,
  getActiveFocusLever,
  getMarker,
  DEFAULT_FRAMEWORK,
  type Framework,
  type Phase,
  type Lever,
  type Marker,
} from "@/lib/framework"

export function useFramework() {
  const projectId = useProjectId()
  const queryClient = useQueryClient()
  const migrated = useRef(false)

  const { data: framework = DEFAULT_FRAMEWORK } = useQuery({
    queryKey: queryKeys.framework(projectId ?? ""),
    queryFn: async () => {
      const fw = await fetchFramework(projectId!)
      return fw ?? DEFAULT_FRAMEWORK
    },
    enabled: !!projectId,
    staleTime: 60_000,
  })

  // One-time migration from localStorage
  useEffect(() => {
    if (!projectId || migrated.current) return
    migrated.current = true
    migrateLocalStorageFramework(projectId).then((didMigrate) => {
      if (didMigrate) {
        queryClient.invalidateQueries({ queryKey: queryKeys.framework(projectId) })
      }
    })
  }, [projectId, queryClient])

  const saveMutation = useMutation({
    mutationFn: async (fw: Framework) => {
      if (!projectId) throw new Error("No project selected")
      const result = await saveFrameworkToDb(fw, projectId)
      if (!result.ok) throw new Error(result.error)
      return fw
    },
    onMutate: async (fw) => {
      const key = queryKeys.framework(projectId ?? "")
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Framework>(key)
      queryClient.setQueryData<Framework>(key, fw)
      return { previous }
    },
    onError: (_err, _fw, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.framework(projectId ?? ""), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.framework(projectId ?? "") })
    },
  })

  const activePhase: Phase = getActivePhase(framework)
  const activeFocusLever: Lever = getActiveFocusLever(framework)
  const actionMarker: Marker | undefined = getMarker(framework, activePhase.actionMarkerKey)
  const winMarker: Marker | undefined = getMarker(framework, activePhase.winMarkerKey)

  const setActivePhase = useCallback((key: string) => {
    const next = { ...framework, activePhaseKey: key }
    const validation = validateFramework(next)
    if (!validation.ok) return validation
    saveMutation.mutate(next)
    return { ok: true }
  }, [framework, saveMutation])

  const setTarget = useCallback((phaseKey: string, target: number) => {
    const next = {
      ...framework,
      phases: framework.phases.map(p =>
        p.key === phaseKey ? { ...p, target: Math.max(0, Math.min(999, target)) } : p
      ),
    }
    const validation = validateFramework(next)
    if (!validation.ok) return validation
    saveMutation.mutate(next)
    return { ok: true }
  }, [framework, saveMutation])

  const saveFramework = useCallback((fw: Framework): { ok: boolean; error?: string } => {
    const validation = validateFramework(fw)
    if (!validation.ok) return validation
    saveMutation.mutate(fw)
    return { ok: true }
  }, [saveMutation])

  return {
    framework,
    activePhase,
    activeFocusLever,
    actionMarker,
    winMarker,
    setActivePhase,
    setTarget,
    saveFramework,
  }
}

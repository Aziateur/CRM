"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getFramework,
  setFramework,
  getActivePhase,
  getActiveFocusLever,
  type Framework,
  type Phase,
  type Lever,
} from "@/lib/framework"

export function useFramework() {
  const [framework, setLocal] = useState<Framework>(getFramework)

  // Cross-tab sync via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "crm_framework_v2") {
        setLocal(getFramework())
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  const activePhase: Phase = getActivePhase(framework)
  const activeFocusLever: Lever = getActiveFocusLever(framework)

  const setActivePhase = useCallback((key: string) => {
    const next = { ...framework, activePhaseKey: key }
    const result = setFramework(next)
    if (result.ok) setLocal(next)
    return result
  }, [framework])

  const setTarget = useCallback((phaseKey: string, target: number) => {
    const next = {
      ...framework,
      phases: framework.phases.map(p =>
        p.key === phaseKey ? { ...p, target: Math.max(0, Math.min(999, target)) } : p
      ),
    }
    const result = setFramework(next)
    if (result.ok) setLocal(next)
    return result
  }, [framework])

  const saveFramework = useCallback((fw: Framework): { ok: boolean; error?: string } => {
    const result = setFramework(fw)
    if (result.ok) setLocal(fw)
    return result
  }, [])

  return {
    framework,
    activePhase,
    activeFocusLever,
    setActivePhase,
    setTarget,
    saveFramework,
  }
}

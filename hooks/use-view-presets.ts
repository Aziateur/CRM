"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useProjectId } from "@/hooks/use-project-id"

export interface ViewFilters {
  segment?: string
  outcome?: string
  stage?: string
  search?: string
}

export interface ViewPreset {
  id: string
  name: string
  entityType: string
  filters: ViewFilters
  viewMode: string
  isDefault: boolean
  position: number
  createdAt: string
}

function mapPresetRow(row: Record<string, unknown>): ViewPreset {
  return {
    id: row.id as string,
    name: row.name as string,
    entityType: (row.entity_type ?? "lead") as string,
    filters: (row.filters ?? {}) as ViewFilters,
    viewMode: (row.view_mode ?? "table") as string,
    isDefault: (row.is_default ?? false) as boolean,
    position: (row.position ?? 0) as number,
    createdAt: (row.created_at ?? new Date().toISOString()) as string,
  }
}

export function useViewPresets(entityType = "lead") {
  const { toast } = useToast()
  const projectId = useProjectId()
  const [presets, setPresets] = useState<ViewPreset[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPresets = useCallback(async () => {
    if (!projectId) { setPresets([]); setLoading(false); return }
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("view_presets")
        .select("*")
        .eq("entity_type", entityType)
        .eq("project_id", projectId)
        .order("position", { ascending: true })

      if (error) {
        if (!error.message?.includes("does not exist")) {
          console.warn("[useViewPresets]", error.message)
        }
        setPresets([])
        return
      }

      if (data) {
        setPresets(data.map((row: Record<string, unknown>) => mapPresetRow(row)))
      }
    } catch {
      setPresets([])
    } finally {
      setLoading(false)
    }
  }, [entityType, projectId])

  useEffect(() => {
    fetchPresets()
  }, [fetchPresets])

  const savePreset = useCallback(async (
    name: string,
    filters: ViewFilters,
    viewMode: string
  ): Promise<ViewPreset | null> => {
    if (!projectId) return null
    try {
      const supabase = getSupabase()
      const nextPos = presets.length > 0 ? Math.max(...presets.map((p) => p.position)) + 1 : 0
      const { data, error } = await supabase
        .from("view_presets")
        .insert([{
          name,
          entity_type: entityType,
          filters,
          view_mode: viewMode,
          position: nextPos,
          project_id: projectId,
        }])
        .select()
        .single()

      if (error) {
        toast({ variant: "destructive", title: "Failed to save view", description: error.message })
        return null
      }

      if (data) {
        const preset = mapPresetRow(data as Record<string, unknown>)
        setPresets((prev) => [...prev, preset])
        return preset
      }
      return null
    } catch {
      return null
    }
  }, [entityType, presets, toast, projectId])

  const deletePreset = useCallback(async (id: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("view_presets").delete().eq("id", id)
      if (error) {
        toast({ variant: "destructive", title: "Failed to delete view", description: error.message })
        return
      }
      setPresets((prev) => prev.filter((p) => p.id !== id))
    } catch {
      // silent
    }
  }, [toast])

  return { presets, loading, savePreset, deletePreset, refetch: fetchPresets }
}

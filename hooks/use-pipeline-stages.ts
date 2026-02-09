"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { type PipelineStage, DEFAULT_PIPELINE_STAGES } from "@/lib/store"

function mapStageRow(row: Record<string, unknown>): PipelineStage {
  return {
    id: row.id as string,
    name: row.name as string,
    position: row.position as number,
    defaultProbability: (row.default_probability ?? 0) as number,
    color: (row.color ?? "#6b7280") as string,
    isWon: (row.is_won ?? false) as boolean,
    isLost: (row.is_lost ?? false) as boolean,
  }
}

export function usePipelineStages() {
  const [stages, setStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES)
  const [loading, setLoading] = useState(true)

  const fetchStages = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("position", { ascending: true })

      if (error) {
        // Table may not exist yet — use defaults silently
        console.warn("[usePipelineStages] Falling back to defaults:", error.message)
        setStages(DEFAULT_PIPELINE_STAGES)
        return
      }

      if (data && data.length > 0) {
        setStages(data.map((row: Record<string, unknown>) => mapStageRow(row)))
      }
    } catch {
      setStages(DEFAULT_PIPELINE_STAGES)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStages()
  }, [fetchStages])

  return { stages, loading, refetch: fetchStages }
}

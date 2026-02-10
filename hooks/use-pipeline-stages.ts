"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
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

interface CreateStageInput {
  name: string
  color?: string
  defaultProbability?: number
  isWon?: boolean
  isLost?: boolean
}

interface UpdateStageInput {
  name?: string
  color?: string
  defaultProbability?: number
  isWon?: boolean
  isLost?: boolean
}

export function usePipelineStages() {
  const { toast } = useToast()
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

  const createStage = useCallback(async (input: CreateStageInput): Promise<PipelineStage | null> => {
    try {
      const supabase = getSupabase()
      const nextPosition = stages.length > 0 ? Math.max(...stages.map((s) => s.position)) + 1 : 0
      const { data, error } = await supabase
        .from("pipeline_stages")
        .insert([{
          name: input.name,
          position: nextPosition,
          color: input.color ?? "#6b7280",
          default_probability: input.defaultProbability ?? 0,
          is_won: input.isWon ?? false,
          is_lost: input.isLost ?? false,
        }])
        .select()
        .single()

      if (error) {
        toast({ variant: "destructive", title: "Failed to create stage", description: error.message })
        return null
      }

      if (data) {
        const stage = mapStageRow(data as Record<string, unknown>)
        setStages((prev) => [...prev, stage])
        return stage
      }
      return null
    } catch {
      return null
    }
  }, [stages, toast])

  const updateStage = useCallback(async (id: string, changes: UpdateStageInput) => {
    try {
      const supabase = getSupabase()
      const payload: Record<string, unknown> = {}
      if (changes.name !== undefined) payload.name = changes.name
      if (changes.color !== undefined) payload.color = changes.color
      if (changes.defaultProbability !== undefined) payload.default_probability = changes.defaultProbability
      if (changes.isWon !== undefined) payload.is_won = changes.isWon
      if (changes.isLost !== undefined) payload.is_lost = changes.isLost

      const { error } = await supabase
        .from("pipeline_stages")
        .update(payload)
        .eq("id", id)

      if (error) {
        toast({ variant: "destructive", title: "Failed to update stage", description: error.message })
        return
      }

      setStages((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                ...(changes.name !== undefined && { name: changes.name }),
                ...(changes.color !== undefined && { color: changes.color }),
                ...(changes.defaultProbability !== undefined && { defaultProbability: changes.defaultProbability }),
                ...(changes.isWon !== undefined && { isWon: changes.isWon }),
                ...(changes.isLost !== undefined && { isLost: changes.isLost }),
              }
            : s
        )
      )
    } catch {
      // silent
    }
  }, [toast])

  const deleteStage = useCallback(async (id: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("pipeline_stages").delete().eq("id", id)

      if (error) {
        toast({ variant: "destructive", title: "Failed to delete stage", description: error.message })
        return
      }

      setStages((prev) => prev.filter((s) => s.id !== id))
    } catch {
      // silent
    }
  }, [toast])

  const moveStage = useCallback(async (id: string, direction: "up" | "down") => {
    const idx = stages.findIndex((s) => s.id === id)
    if (idx === -1) return
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= stages.length) return

    const newStages = [...stages]
    const tempPos = newStages[idx].position
    newStages[idx] = { ...newStages[idx], position: newStages[swapIdx].position }
    newStages[swapIdx] = { ...newStages[swapIdx], position: tempPos }
    newStages.sort((a, b) => a.position - b.position)
    setStages(newStages)

    try {
      const supabase = getSupabase()
      await Promise.all([
        supabase.from("pipeline_stages").update({ position: newStages[idx].position }).eq("id", newStages[idx].id),
        supabase.from("pipeline_stages").update({ position: newStages[swapIdx].position }).eq("id", newStages[swapIdx].id),
      ])
    } catch {
      // silent — revert on next fetch
    }
  }, [stages])

  return { stages, loading, refetch: fetchStages, createStage, updateStage, deleteStage, moveStage }
}

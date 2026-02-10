"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Tag } from "@/lib/store"

function mapTagRow(row: Record<string, unknown>): Tag {
  return {
    id: row.id as string,
    name: row.name as string,
    color: (row.color as string) || "#6b7280",
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

export function useTags() {
  const { toast } = useToast()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTags = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        if (!error.message?.includes("does not exist")) {
          console.warn("[useTags]", error.message)
        }
        setTags([])
        return
      }
      if (data) {
        setTags(data.map((row: Record<string, unknown>) => mapTagRow(row)))
      }
    } catch {
      setTags([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const createTag = useCallback(async (name: string, color: string = "#6b7280") => {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("tags")
        .insert([{ name: name.trim(), color }])
        .select()
        .single()

      if (error) {
        toast({ variant: "destructive", title: "Failed to create tag", description: error.message })
        return null
      }
      if (data) {
        const tag = mapTagRow(data as Record<string, unknown>)
        setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
        return tag
      }
      return null
    } catch {
      return null
    }
  }, [toast])

  const updateTag = useCallback(async (id: string, changes: Partial<Pick<Tag, "name" | "color">>) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from("tags")
        .update(changes)
        .eq("id", id)

      if (error) {
        toast({ variant: "destructive", title: "Failed to update tag", description: error.message })
        return false
      }
      setTags((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...changes } : t))
      )
      return true
    } catch {
      return false
    }
  }, [toast])

  const deleteTag = useCallback(async (id: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("tags").delete().eq("id", id)
      if (error) {
        toast({ variant: "destructive", title: "Failed to delete tag", description: error.message })
        return false
      }
      setTags((prev) => prev.filter((t) => t.id !== id))
      return true
    } catch {
      return false
    }
  }, [toast])

  return { tags, loading, createTag, updateTag, deleteTag, refetch: fetchTags }
}

export function useLeadTags(leadId: string | null) {
  const { toast } = useToast()
  const [tagIds, setTagIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLeadTags = useCallback(async () => {
    if (!leadId) {
      setTagIds([])
      return
    }
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("lead_tags")
        .select("tag_id")
        .eq("lead_id", leadId)

      if (error) {
        if (!error.message?.includes("does not exist")) {
          console.warn("[useLeadTags]", error.message)
        }
        setTagIds([])
        return
      }
      if (data) {
        setTagIds(data.map((row: Record<string, unknown>) => row.tag_id as string))
      }
    } catch {
      setTagIds([])
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchLeadTags()
  }, [fetchLeadTags])

  const addTag = useCallback(async (tagId: string) => {
    if (!leadId) return false
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from("lead_tags")
        .insert([{ lead_id: leadId, tag_id: tagId }])

      if (error) {
        if (error.message?.includes("duplicate")) return true
        toast({ variant: "destructive", title: "Failed to add tag", description: error.message })
        return false
      }
      setTagIds((prev) => [...prev, tagId])
      return true
    } catch {
      return false
    }
  }, [leadId, toast])

  const removeTag = useCallback(async (tagId: string) => {
    if (!leadId) return false
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from("lead_tags")
        .delete()
        .eq("lead_id", leadId)
        .eq("tag_id", tagId)

      if (error) {
        toast({ variant: "destructive", title: "Failed to remove tag", description: error.message })
        return false
      }
      setTagIds((prev) => prev.filter((id) => id !== tagId))
      return true
    } catch {
      return false
    }
  }, [leadId, toast])

  const toggleTag = useCallback(async (tagId: string) => {
    if (tagIds.includes(tagId)) {
      return removeTag(tagId)
    } else {
      return addTag(tagId)
    }
  }, [tagIds, addTag, removeTag])

  return { tagIds, loading, addTag, removeTag, toggleTag, refetch: fetchLeadTags }
}

// Bulk fetch all lead_tags at once (for table/kanban display)
export function useAllLeadTags() {
  const [leadTagsMap, setLeadTagsMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("lead_tags")
        .select("lead_id, tag_id")

      if (error) {
        if (!error.message?.includes("does not exist")) {
          console.warn("[useAllLeadTags]", error.message)
        }
        setLeadTagsMap({})
        return
      }
      if (data) {
        const map: Record<string, string[]> = {}
        for (const row of data) {
          const leadId = row.lead_id as string
          const tagId = row.tag_id as string
          if (!map[leadId]) map[leadId] = []
          map[leadId].push(tagId)
        }
        setLeadTagsMap(map)
      }
    } catch {
      setLeadTagsMap({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { leadTagsMap, loading, refetch: fetchAll }
}

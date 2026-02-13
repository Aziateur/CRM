"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useProjectId } from "@/hooks/use-project-id"
import type { Template, TemplateCategory } from "@/lib/store"

function mapTemplateRow(row: Record<string, unknown>): Template {
  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as TemplateCategory) || "call",
    subject: row.subject as string | undefined,
    body: row.body as string,
    variables: (row.variables || []) as string[],
    isDefault: (row.is_default ?? row.isDefault ?? false) as boolean,
    position: (row.position ?? 0) as number,
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\[(\w+)\]/g)
  if (!matches) return []
  return [...new Set(matches.map((m) => m.slice(1, -1)))]
}

export { extractVariables }

export function useTemplates(category?: TemplateCategory) {
  const { toast } = useToast()
  const projectId = useProjectId()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    if (!projectId) { setTemplates([]); setLoading(false); return }
    setLoading(true)
    try {
      const supabase = getSupabase()
      let query = supabase
        .from("templates")
        .select("*")
        .eq("project_id", projectId)
        .order("position", { ascending: true })

      if (category) {
        query = query.eq("category", category)
      }

      const { data, error } = await query

      if (error) {
        if (!error.message?.includes("does not exist")) {
          console.warn("[useTemplates]", error.message)
        }
        setTemplates([])
        return
      }
      if (data) {
        setTemplates(data.map((row: Record<string, unknown>) => mapTemplateRow(row)))
      }
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [category, projectId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const createTemplate = useCallback(async (input: {
    name: string
    category: TemplateCategory
    subject?: string
    body: string
  }) => {
    if (!projectId) return null
    try {
      const variables = extractVariables(input.body + (input.subject || ""))
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("templates")
        .insert([{
          name: input.name.trim(),
          category: input.category,
          subject: input.subject?.trim() || null,
          body: input.body,
          variables,
          position: templates.length,
          project_id: projectId,
        }])
        .select()
        .single()

      if (error) {
        toast({ variant: "destructive", title: "Failed to create template", description: error.message })
        return null
      }
      if (data) {
        const template = mapTemplateRow(data as Record<string, unknown>)
        setTemplates((prev) => [...prev, template])
        return template
      }
      return null
    } catch {
      return null
    }
  }, [templates.length, toast, projectId])

  const updateTemplate = useCallback(async (id: string, input: {
    name?: string
    category?: TemplateCategory
    subject?: string
    body?: string
  }) => {
    try {
      const updates: Record<string, unknown> = {}
      if (input.name !== undefined) updates.name = input.name.trim()
      if (input.category !== undefined) updates.category = input.category
      if (input.subject !== undefined) updates.subject = input.subject.trim() || null
      if (input.body !== undefined) {
        updates.body = input.body
        updates.variables = extractVariables(input.body + (input.subject || ""))
      }

      const supabase = getSupabase()
      const { error } = await supabase
        .from("templates")
        .update(updates)
        .eq("id", id)

      if (error) {
        toast({ variant: "destructive", title: "Failed to update template", description: error.message })
        return false
      }

      setTemplates((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t
          const updated = { ...t }
          if (input.name !== undefined) updated.name = input.name.trim()
          if (input.category !== undefined) updated.category = input.category
          if (input.subject !== undefined) updated.subject = input.subject.trim() || undefined
          if (input.body !== undefined) {
            updated.body = input.body
            updated.variables = extractVariables(input.body + (input.subject || ""))
          }
          return updated
        })
      )
      return true
    } catch {
      return false
    }
  }, [toast])

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("templates").delete().eq("id", id)
      if (error) {
        toast({ variant: "destructive", title: "Failed to delete template", description: error.message })
        return false
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      return true
    } catch {
      return false
    }
  }, [toast])

  return { templates, loading, createTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates }
}

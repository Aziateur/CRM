"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { FieldDefinition, FieldType } from "@/lib/store"

function mapFieldRow(row: Record<string, unknown>): FieldDefinition {
  return {
    id: row.id as string,
    entityType: (row.entity_type ?? row.entityType ?? "lead") as string,
    fieldKey: (row.field_key ?? row.fieldKey) as string,
    fieldLabel: (row.field_label ?? row.fieldLabel) as string,
    fieldType: (row.field_type ?? row.fieldType) as FieldType,
    options: (row.options ?? undefined) as string[] | undefined,
    isRequired: (row.is_required ?? row.isRequired ?? false) as boolean,
    position: (row.position ?? 0) as number,
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

interface CreateFieldInput {
  fieldKey: string
  fieldLabel: string
  fieldType: FieldType
  options?: string[]
  isRequired?: boolean
}

export function useFieldDefinitions(entityType = "lead") {
  const { toast } = useToast()
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFields = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("field_definitions")
        .select("*")
        .eq("entity_type", entityType)
        .order("position", { ascending: true })

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          setFields([])
          return
        }
        console.warn("[useFieldDefinitions] Error:", error.message)
        setFields([])
        return
      }

      if (data) {
        setFields(data.map((row: Record<string, unknown>) => mapFieldRow(row)))
      }
    } catch {
      setFields([])
    } finally {
      setLoading(false)
    }
  }, [entityType])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const createField = useCallback(async (input: CreateFieldInput): Promise<FieldDefinition | null> => {
    try {
      const supabase = getSupabase()
      const nextPosition = fields.length > 0 ? Math.max(...fields.map((f) => f.position)) + 1 : 0
      const { data, error } = await supabase
        .from("field_definitions")
        .insert([{
          entity_type: entityType,
          field_key: input.fieldKey,
          field_label: input.fieldLabel,
          field_type: input.fieldType,
          options: input.options ?? null,
          is_required: input.isRequired ?? false,
          position: nextPosition,
        }])
        .select()
        .single()

      if (error) {
        toast({ variant: "destructive", title: "Failed to create field", description: error.message })
        return null
      }

      if (data) {
        const field = mapFieldRow(data as Record<string, unknown>)
        setFields((prev) => [...prev, field])
        return field
      }
      return null
    } catch {
      return null
    }
  }, [entityType, fields, toast])

  const updateField = useCallback(async (id: string, changes: Partial<CreateFieldInput>) => {
    try {
      const supabase = getSupabase()
      const payload: Record<string, unknown> = {}
      if (changes.fieldLabel !== undefined) payload.field_label = changes.fieldLabel
      if (changes.fieldType !== undefined) payload.field_type = changes.fieldType
      if (changes.options !== undefined) payload.options = changes.options
      if (changes.isRequired !== undefined) payload.is_required = changes.isRequired

      const { error } = await supabase
        .from("field_definitions")
        .update(payload)
        .eq("id", id)

      if (error) {
        toast({ variant: "destructive", title: "Failed to update field", description: error.message })
        return
      }

      setFields((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                ...(changes.fieldLabel !== undefined && { fieldLabel: changes.fieldLabel }),
                ...(changes.fieldType !== undefined && { fieldType: changes.fieldType }),
                ...(changes.options !== undefined && { options: changes.options }),
                ...(changes.isRequired !== undefined && { isRequired: changes.isRequired }),
              }
            : f
        )
      )
    } catch {
      // silent
    }
  }, [toast])

  const deleteField = useCallback(async (id: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("field_definitions").delete().eq("id", id)

      if (error) {
        toast({ variant: "destructive", title: "Failed to delete field", description: error.message })
        return
      }

      setFields((prev) => prev.filter((f) => f.id !== id))
    } catch {
      // silent
    }
  }, [toast])

  const moveField = useCallback(async (id: string, direction: "up" | "down") => {
    const idx = fields.findIndex((f) => f.id === id)
    if (idx === -1) return
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= fields.length) return

    const newFields = [...fields]
    const tempPos = newFields[idx].position
    newFields[idx] = { ...newFields[idx], position: newFields[swapIdx].position }
    newFields[swapIdx] = { ...newFields[swapIdx], position: tempPos }
    newFields.sort((a, b) => a.position - b.position)
    setFields(newFields)

    try {
      const supabase = getSupabase()
      await Promise.all([
        supabase.from("field_definitions").update({ position: newFields[idx].position }).eq("id", newFields[idx].id),
        supabase.from("field_definitions").update({ position: newFields[swapIdx].position }).eq("id", newFields[swapIdx].id),
      ])
    } catch {
      // silent — revert on next fetch
    }
  }, [fields])

  return { fields, loading, refetch: fetchFields, createField, updateField, deleteField, moveField }
}

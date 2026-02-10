"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Sequence, SequenceStep, SequenceEnrollment, SequenceStepType, SequenceEnrollmentStatus } from "@/lib/store"

function mapSequenceRow(row: Record<string, unknown>): Sequence {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    isActive: (row.is_active ?? row.isActive ?? true) as boolean,
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

function mapStepRow(row: Record<string, unknown>): SequenceStep {
  return {
    id: row.id as string,
    sequenceId: (row.sequence_id ?? row.sequenceId) as string,
    position: (row.position ?? 0) as number,
    stepType: (row.step_type ?? row.stepType) as SequenceStepType,
    delayDays: (row.delay_days ?? row.delayDays ?? 0) as number,
    templateId: (row.template_id ?? row.templateId) as string | undefined,
    config: (row.config ?? {}) as Record<string, unknown>,
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

function mapEnrollmentRow(row: Record<string, unknown>): SequenceEnrollment {
  return {
    id: row.id as string,
    leadId: (row.lead_id ?? row.leadId) as string,
    sequenceId: (row.sequence_id ?? row.sequenceId) as string,
    currentStep: (row.current_step ?? row.currentStep ?? 0) as number,
    status: (row.status ?? "active") as SequenceEnrollmentStatus,
    enrolledAt: (row.enrolled_at ?? row.enrolledAt ?? new Date().toISOString()) as string,
    lastStepCompletedAt: (row.last_step_completed_at ?? row.lastStepCompletedAt) as string | undefined,
    nextStepDueAt: (row.next_step_due_at ?? row.nextStepDueAt) as string | undefined,
    exitReason: (row.exit_reason ?? row.exitReason) as string | undefined,
    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
  }
}

export function useSequences() {
  const { toast } = useToast()
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSequences = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("sequences")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        if (!error.message?.includes("does not exist")) {
          console.warn("[useSequences]", error.message)
        }
        setSequences([])
        return
      }
      if (data) {
        setSequences(data.map((row: Record<string, unknown>) => mapSequenceRow(row)))
      }
    } catch {
      setSequences([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSequences()
  }, [fetchSequences])

  const createSequence = useCallback(async (input: { name: string; description?: string }) => {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("sequences")
        .insert([{ name: input.name.trim(), description: input.description?.trim() || null }])
        .select()
        .single()

      if (error) {
        toast({ variant: "destructive", title: "Failed to create sequence", description: error.message })
        return null
      }
      if (data) {
        const seq = mapSequenceRow(data as Record<string, unknown>)
        setSequences((prev) => [seq, ...prev])
        return seq
      }
      return null
    } catch {
      return null
    }
  }, [toast])

  const updateSequence = useCallback(async (id: string, input: Partial<{ name: string; description: string; isActive: boolean }>) => {
    try {
      const updates: Record<string, unknown> = {}
      if (input.name !== undefined) updates.name = input.name.trim()
      if (input.description !== undefined) updates.description = input.description.trim() || null
      if (input.isActive !== undefined) updates.is_active = input.isActive

      const supabase = getSupabase()
      const { error } = await supabase.from("sequences").update(updates).eq("id", id)

      if (error) {
        toast({ variant: "destructive", title: "Failed to update sequence", description: error.message })
        return false
      }
      setSequences((prev) => prev.map((s) => (s.id === id ? { ...s, ...input } : s)))
      return true
    } catch {
      return false
    }
  }, [toast])

  const deleteSequence = useCallback(async (id: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("sequences").delete().eq("id", id)
      if (error) {
        toast({ variant: "destructive", title: "Failed to delete sequence", description: error.message })
        return false
      }
      setSequences((prev) => prev.filter((s) => s.id !== id))
      return true
    } catch {
      return false
    }
  }, [toast])

  return { sequences, loading, createSequence, updateSequence, deleteSequence, refetch: fetchSequences }
}

export function useSequenceSteps(sequenceId: string | null) {
  const { toast } = useToast()
  const [steps, setSteps] = useState<SequenceStep[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSteps = useCallback(async () => {
    if (!sequenceId) { setSteps([]); return }
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("sequence_steps")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("position", { ascending: true })

      if (error) {
        if (!error.message?.includes("does not exist")) {
          console.warn("[useSequenceSteps]", error.message)
        }
        setSteps([])
        return
      }
      if (data) {
        setSteps(data.map((row: Record<string, unknown>) => mapStepRow(row)))
      }
    } catch {
      setSteps([])
    } finally {
      setLoading(false)
    }
  }, [sequenceId])

  useEffect(() => {
    fetchSteps()
  }, [fetchSteps])

  const addStep = useCallback(async (input: { stepType: SequenceStepType; delayDays: number; templateId?: string; config?: Record<string, unknown> }) => {
    if (!sequenceId) return null
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("sequence_steps")
        .insert([{
          sequence_id: sequenceId,
          position: steps.length,
          step_type: input.stepType,
          delay_days: input.delayDays,
          template_id: input.templateId || null,
          config: input.config || {},
        }])
        .select()
        .single()

      if (error) {
        toast({ variant: "destructive", title: "Failed to add step", description: error.message })
        return null
      }
      if (data) {
        const step = mapStepRow(data as Record<string, unknown>)
        setSteps((prev) => [...prev, step])
        return step
      }
      return null
    } catch {
      return null
    }
  }, [sequenceId, steps.length, toast])

  const updateStep = useCallback(async (stepId: string, input: Partial<{ stepType: SequenceStepType; delayDays: number; templateId: string; config: Record<string, unknown> }>) => {
    try {
      const updates: Record<string, unknown> = {}
      if (input.stepType !== undefined) updates.step_type = input.stepType
      if (input.delayDays !== undefined) updates.delay_days = input.delayDays
      if (input.templateId !== undefined) updates.template_id = input.templateId || null
      if (input.config !== undefined) updates.config = input.config

      const supabase = getSupabase()
      const { error } = await supabase.from("sequence_steps").update(updates).eq("id", stepId)

      if (error) {
        toast({ variant: "destructive", title: "Failed to update step", description: error.message })
        return false
      }
      setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...input } : s)))
      return true
    } catch {
      return false
    }
  }, [toast])

  const removeStep = useCallback(async (stepId: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("sequence_steps").delete().eq("id", stepId)
      if (error) {
        toast({ variant: "destructive", title: "Failed to remove step", description: error.message })
        return false
      }
      setSteps((prev) => prev.filter((s) => s.id !== stepId))
      return true
    } catch {
      return false
    }
  }, [toast])

  return { steps, loading, addStep, updateStep, removeStep, refetch: fetchSteps }
}

export function useSequenceEnrollments(leadId?: string) {
  const { toast } = useToast()
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEnrollments = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = getSupabase()
      let query = supabase.from("sequence_enrollments").select("*").order("enrolled_at", { ascending: false })
      if (leadId) {
        query = query.eq("lead_id", leadId)
      }

      const { data, error } = await query

      if (error) {
        if (!error.message?.includes("does not exist")) {
          console.warn("[useSequenceEnrollments]", error.message)
        }
        setEnrollments([])
        return
      }
      if (data) {
        setEnrollments(data.map((row: Record<string, unknown>) => mapEnrollmentRow(row)))
      }
    } catch {
      setEnrollments([])
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchEnrollments()
  }, [fetchEnrollments])

  const enroll = useCallback(async (enrollLeadId: string, sequenceId: string) => {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("sequence_enrollments")
        .insert([{
          lead_id: enrollLeadId,
          sequence_id: sequenceId,
          next_step_due_at: new Date().toISOString(),
        }])
        .select()
        .single()

      if (error) {
        if (error.message?.includes("duplicate")) {
          toast({ variant: "destructive", title: "Already enrolled", description: "This lead is already in that sequence" })
        } else {
          toast({ variant: "destructive", title: "Failed to enroll", description: error.message })
        }
        return null
      }
      if (data) {
        const enrollment = mapEnrollmentRow(data as Record<string, unknown>)
        setEnrollments((prev) => [enrollment, ...prev])
        return enrollment
      }
      return null
    } catch {
      return null
    }
  }, [toast])

  const updateEnrollmentStatus = useCallback(async (enrollmentId: string, status: SequenceEnrollmentStatus, exitReason?: string) => {
    try {
      const updates: Record<string, unknown> = { status }
      if (exitReason) updates.exit_reason = exitReason

      const supabase = getSupabase()
      const { error } = await supabase.from("sequence_enrollments").update(updates).eq("id", enrollmentId)

      if (error) {
        toast({ variant: "destructive", title: "Failed to update enrollment", description: error.message })
        return false
      }
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? { ...e, status, exitReason } : e))
      )
      return true
    } catch {
      return false
    }
  }, [toast])

  const advanceStep = useCallback(async (enrollmentId: string, totalSteps: number) => {
    const enrollment = enrollments.find((e) => e.id === enrollmentId)
    if (!enrollment) return false
    try {
      const nextStep = enrollment.currentStep + 1
      const isComplete = nextStep >= totalSteps
      const updates: Record<string, unknown> = {
        current_step: nextStep,
        last_step_completed_at: new Date().toISOString(),
        status: isComplete ? "completed" : "active",
      }
      if (isComplete) {
        updates.exit_reason = "completed"
      }

      const supabase = getSupabase()
      const { error } = await supabase.from("sequence_enrollments").update(updates).eq("id", enrollmentId)

      if (error) return false
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId
            ? { ...e, currentStep: nextStep, lastStepCompletedAt: new Date().toISOString(), status: isComplete ? "completed" : "active", exitReason: isComplete ? "completed" : e.exitReason }
            : e
        )
      )
      return true
    } catch {
      return false
    }
  }, [enrollments])

  return { enrollments, loading, enroll, updateEnrollmentStatus, advanceStep, refetch: fetchEnrollments }
}

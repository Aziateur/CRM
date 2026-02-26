"use client"

import { useEffect, useCallback, useRef } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"

/**
 * Sequence runner — polls active enrollments every 60s and advances
 * leads past completed wait steps. For call/email/sms/task steps,
 * creates a task entry so the rep can action them manually.
 *
 * Mount once in layout.tsx:
 *   <SequenceRunnerProvider />
 */

interface EnrollmentRow {
    id: string
    lead_id: string
    sequence_id: string
    current_step: number
    status: string
    enrolled_at: string
    last_step_completed_at?: string
}

interface StepRow {
    id: string
    sequence_id: string
    position: number
    step_type: string
    delay_days: number
    config: Record<string, unknown>
}

export function useSequenceRunner() {
    const projectId = useProjectId()
    const runningRef = useRef(false)

    const processEnrollments = useCallback(async () => {
        if (!projectId || runningRef.current) return
        runningRef.current = true

        try {
            const supabase = getSupabase()

            // 1. Fetch active enrollments
            const { data: enrollments, error: enrollErr } = await supabase
                .from("sequence_enrollments")
                .select("*")
                .eq("status", "active")

            if (enrollErr || !enrollments || enrollments.length === 0) {
                runningRef.current = false
                return
            }

            // 2. Fetch steps for all relevant sequences
            const sequenceIds = [...new Set(enrollments.map((e: EnrollmentRow) => e.sequence_id))]
            const { data: allSteps, error: stepsErr } = await supabase
                .from("sequence_steps")
                .select("*")
                .in("sequence_id", sequenceIds)
                .order("position", { ascending: true })

            if (stepsErr || !allSteps) {
                runningRef.current = false
                return
            }

            // Group steps by sequence
            const stepsBySequence = new Map<string, StepRow[]>()
            for (const step of allSteps as StepRow[]) {
                const steps = stepsBySequence.get(step.sequence_id) || []
                steps.push(step)
                stepsBySequence.set(step.sequence_id, steps)
            }

            // 3. Process each enrollment
            for (const enrollment of enrollments as EnrollmentRow[]) {
                const steps = stepsBySequence.get(enrollment.sequence_id) || []
                if (steps.length === 0) continue

                const currentStepIndex = enrollment.current_step
                if (currentStepIndex >= steps.length) {
                    // Past last step — mark complete
                    await supabase
                        .from("sequence_enrollments")
                        .update({ status: "completed" })
                        .eq("id", enrollment.id)
                    continue
                }

                const currentStep = steps[currentStepIndex]
                const lastStepAt = enrollment.last_step_completed_at || enrollment.enrolled_at
                const lastStepTime = new Date(lastStepAt).getTime()
                const delayMs = (currentStep.delay_days || 0) * 24 * 60 * 60 * 1000
                const now = Date.now()

                // Check if delay has elapsed
                if (now < lastStepTime + delayMs) continue

                // ── Execute the step ──
                if (currentStep.step_type === "wait") {
                    // Wait step — just advance
                    const nextStep = currentStepIndex + 1
                    if (nextStep >= steps.length) {
                        await supabase
                            .from("sequence_enrollments")
                            .update({ status: "completed", current_step: nextStep })
                            .eq("id", enrollment.id)
                    } else {
                        await supabase
                            .from("sequence_enrollments")
                            .update({ current_step: nextStep, last_step_completed_at: new Date().toISOString() })
                            .eq("id", enrollment.id)
                    }
                } else if (currentStep.step_type === "task" || currentStep.step_type === "call" || currentStep.step_type === "email" || currentStep.step_type === "sms") {
                    // Action steps — create a task and advance
                    const stepLabel = currentStep.step_type === "call" ? "Call" :
                        currentStep.step_type === "email" ? "Send email" :
                            currentStep.step_type === "sms" ? "Send SMS" :
                                (currentStep.config?.title as string) || "Task"

                    const title = `[Sequence] ${stepLabel}`

                    await supabase
                        .from("tasks")
                        .insert([{
                            lead_id: enrollment.lead_id,
                            type: currentStep.step_type === "call" ? "call_back" : "custom",
                            title,
                            due_at: new Date().toISOString(),
                            priority: "normal",
                            project_id: projectId,
                        }])

                    const nextStep = currentStepIndex + 1
                    if (nextStep >= steps.length) {
                        await supabase
                            .from("sequence_enrollments")
                            .update({ status: "completed", current_step: nextStep, last_step_completed_at: new Date().toISOString() })
                            .eq("id", enrollment.id)
                    } else {
                        await supabase
                            .from("sequence_enrollments")
                            .update({ current_step: nextStep, last_step_completed_at: new Date().toISOString() })
                            .eq("id", enrollment.id)
                    }
                }
            }
        } catch (err) {
            console.warn("[SequenceRunner] Error:", err)
        } finally {
            runningRef.current = false
        }
    }, [projectId])

    // Poll every 60 seconds
    useEffect(() => {
        if (!projectId) return

        // Run immediately on mount
        processEnrollments()

        const intervalId = setInterval(processEnrollments, 60_000)
        return () => clearInterval(intervalId)
    }, [processEnrollments, projectId])
}

// ─── Provider Component ───────────────────────────────────────────────

export function SequenceRunnerProvider() {
    useSequenceRunner()
    return null
}

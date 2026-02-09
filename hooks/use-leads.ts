"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Lead, Contact } from "@/lib/store"

export function mapLeadRow(l: Record<string, unknown>): Lead {
  return {
    id: l.id as string,
    company: l.company as string,
    phone: l.phone as string | undefined,
    segment: (l.segment as string) || "Unknown",
    isDecisionMaker: (l.is_decision_maker || l.isDecisionMaker || "unknown") as Lead["isDecisionMaker"],
    isFleetOwner: (l.is_fleet_owner || l.isFleetOwner || "unknown") as Lead["isFleetOwner"],
    confirmedFacts: (l.confirmed_facts || l.confirmedFacts || []) as string[],
    openQuestions: (l.open_questions || l.openQuestions || []) as string[],
    nextCallObjective: (l.next_call_objective || l.nextCallObjective) as string | undefined,
    operationalContext: (l.operational_context || l.operationalContext) as string | undefined,
    constraints: (l.constraints || []) as Lead["constraints"],
    constraintOther: (l.constraint_other || l.constraintOther) as string | undefined,
    opportunityAngle: (l.opportunity_angle || l.opportunityAngle) as string | undefined,
    website: l.website as string | undefined,
    email: l.email as string | undefined,
    address: l.address as string | undefined,
    leadSource: (l.lead_source || l.leadSource) as string | undefined,
    // Pipeline
    stage: (l.stage as string | undefined),
    stageChangedAt: (l.stage_changed_at || l.stageChangedAt) as string | undefined,
    dealValue: (l.deal_value ?? l.dealValue) as number | undefined,
    closeProbability: (l.close_probability ?? l.closeProbability) as number | undefined,
    // Custom fields
    customFields: (l.custom_fields || l.customFields || {}) as Record<string, unknown>,
    contacts: ((l.contacts || []) as Record<string, unknown>[]).map((c): Contact => ({
      id: c.id as string,
      name: c.name as string,
      role: (c.role || "Other") as Contact["role"],
      phone: c.phone as string | undefined,
      email: c.email as string | undefined,
    })),
    createdAt: (l.created_at || l.createdAt || new Date().toISOString()) as string,
  }
}

interface UseLeadsOptions {
  withContacts?: boolean
}

export function useLeads(options: UseLeadsOptions = {}) {
  const { withContacts = false } = options
  const { toast } = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabase()
      const query = withContacts
        ? supabase.from("leads").select("*, contacts(*)").order("created_at", { ascending: false })
        : supabase.from("leads").select("*").order("created_at", { ascending: false })

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError(fetchError.message)
        toast({ variant: "destructive", title: "Failed to load leads", description: fetchError.message })
        return
      }

      if (data) {
        setLeads(data.map((row: Record<string, unknown>) => mapLeadRow(row)))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [withContacts, toast])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  return { leads, setLeads, loading, error, refetch: fetchLeads }
}

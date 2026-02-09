"use client"

import { useState, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Phone } from "lucide-react"
import type { PipelineStage, Attempt } from "@/lib/store"
import { getEffectiveStage } from "@/lib/store"
import type { LeadWithDerived } from "@/components/leads-table"

interface KanbanBoardProps {
  leads: LeadWithDerived[]
  stages: PipelineStage[]
  attempts: Attempt[]
  onSelectLead: (lead: LeadWithDerived) => void
  onLeadsChanged: () => void
}

export function KanbanBoard({ leads, stages, attempts, onSelectLead, onLeadsChanged }: KanbanBoardProps) {
  const { toast } = useToast()
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  const getLeadsForStage = useCallback(
    (stageName: string) => {
      return leads.filter((lead) => {
        const effective = getEffectiveStage(lead, attempts)
        return effective === stageName
      })
    },
    [leads, attempts]
  )

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", leadId)
  }

  const handleDragOver = (e: React.DragEvent, stageName: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverStage(stageName)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, stageName: string) => {
    e.preventDefault()
    setDragOverStage(null)
    const leadId = e.dataTransfer.getData("text/plain") || draggedLeadId
    setDraggedLeadId(null)

    if (!leadId) return

    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    const currentStage = getEffectiveStage(lead, attempts)
    if (currentStage === stageName) return

    const stage = stages.find((s) => s.name === stageName)

    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from("leads")
        .update({
          stage: stageName,
          stage_changed_at: new Date().toISOString(),
          close_probability: stage?.defaultProbability ?? null,
        })
        .eq("id", leadId)

      if (error) {
        toast({ variant: "destructive", title: "Failed to move lead", description: error.message })
        return
      }

      onLeadsChanged()
    } catch {
      toast({ variant: "destructive", title: "Failed to move lead" })
    }
  }

  const handleDragEnd = () => {
    setDraggedLeadId(null)
    setDragOverStage(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageLeads = getLeadsForStage(stage.name)
        const isOver = dragOverStage === stage.name

        return (
          <div
            key={stage.id}
            className={`flex-shrink-0 w-64 rounded-lg border transition-colors ${
              isOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
            }`}
            onDragOver={(e) => handleDragOver(e, stage.name)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.name)}
          >
            {/* Column header */}
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="font-medium text-sm">{stage.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stageLeads.length}
              </Badge>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[100px]">
              {stageLeads.map((lead) => (
                <Card
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectLead(lead)}
                  className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                    draggedLeadId === lead.id ? "opacity-50" : ""
                  }`}
                >
                  <p className="font-medium text-sm truncate">{lead.company}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {lead.segment}
                    </Badge>
                    {lead.lastAttempt && (
                      <Badge variant="secondary" className="text-xs">
                        {lead.lastAttempt.outcome.replace("DM reached → ", "")}
                      </Badge>
                    )}
                  </div>
                  {lead.phone && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.dealValue != null && lead.dealValue > 0 && (
                    <p className="text-xs font-medium text-green-600 mt-1">
                      ${lead.dealValue.toLocaleString()}
                    </p>
                  )}
                </Card>
              ))}

              {stageLeads.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                  Drop leads here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

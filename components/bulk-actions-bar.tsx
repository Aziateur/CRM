"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { usePipelineStages } from "@/hooks/use-pipeline-stages"
import { useCategories } from "@/hooks/use-categories"
import { CategoryIcon } from "@/components/category-icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { X, Trash2, ArrowRight, ListChecks } from "lucide-react"
import { exportLeadsCSV } from "@/lib/csv"
import { useTaskTemplates, useTaskAssignments } from "@/hooks/use-task-templates"
import type { Lead, Attempt, FieldDefinition } from "@/lib/store"
import { emitWorkflowEvent } from "@/lib/workflow-engine"

interface BulkActionsBarProps {
  selectedIds: Set<string>
  leads: Lead[]
  attempts: Attempt[]
  fieldDefinitions: FieldDefinition[]
  onClearSelection: () => void
  onLeadsUpdated: () => void
}

export function BulkActionsBar({
  selectedIds,
  leads,
  attempts,
  fieldDefinitions,
  onClearSelection,
  onLeadsUpdated,
}: BulkActionsBarProps) {
  const { toast } = useToast()
  const { stages } = usePipelineStages()
  const { activeCategories: segmentCategories } = useCategories("segment")
  const { templates } = useTaskTemplates()
  const { batchAssign } = useTaskAssignments()
  const [bulkStage, setBulkStage] = useState<string>("")
  const [bulkSegment, setBulkSegment] = useState<string>("")
  const [assignOpen, setAssignOpen] = useState(false)

  if (selectedIds.size === 0) return null

  const selectedLeads = leads.filter((l) => selectedIds.has(l.id))

  const handleBulkStageChange = async () => {
    if (!bulkStage) return
    const supabase = getSupabase()
    const ids = Array.from(selectedIds)

    const { error } = await supabase
      .from("leads")
      .update({ stage: bulkStage, stage_changed_at: new Date().toISOString() })
      .in("id", ids)

    if (error) {
      toast({ variant: "destructive", title: "Bulk update failed", description: error.message })
    } else {
      toast({ title: `${ids.length} leads moved to ${bulkStage}` })

      // Emit workflow events for each lead
      for (const lead of selectedLeads) {
        emitWorkflowEvent({
          type: "stage_change",
          leadId: lead.id,
          payload: { from_stage: lead.stage, to_stage: bulkStage },
          timestamp: new Date().toISOString(),
        })
      }

      onLeadsUpdated()
      onClearSelection()
    }
    setBulkStage("")
  }

  const handleBulkSegmentChange = async () => {
    if (!bulkSegment) return
    const supabase = getSupabase()
    const ids = Array.from(selectedIds)

    const { error } = await supabase
      .from("leads")
      .update({ segment: bulkSegment })
      .in("id", ids)

    if (error) {
      toast({ variant: "destructive", title: "Bulk segment update failed", description: error.message })
    } else {
      const segName = segmentCategories.find(s => s.id === bulkSegment)?.name ?? bulkSegment
      toast({ title: `${ids.length} leads moved to segment "${segName}"` })
      onLeadsUpdated()
      onClearSelection()
    }
    setBulkSegment("")
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} leads? This cannot be undone.`)) return
    const supabase = getSupabase()
    const ids = Array.from(selectedIds)

    const { error } = await supabase
      .from("leads")
      .delete()
      .in("id", ids)

    if (error) {
      toast({ variant: "destructive", title: "Bulk delete failed", description: error.message })
    } else {
      toast({ title: `${ids.length} leads deleted` })
      onLeadsUpdated()
      onClearSelection()
    }
  }

  const handleBulkAssignTemplate = async (templateId: string) => {
    const ids = Array.from(selectedIds)
    const count = await batchAssign(ids, templateId)
    if (count > 0) {
      const tpl = templates.find((t) => t.id === templateId)
      toast({ title: `Assigned "${tpl?.name}" to ${count} leads` })
    }
    setAssignOpen(false)
  }

  const handleExportSelected = () => {
    exportLeadsCSV(selectedLeads, attempts, fieldDefinitions)
    toast({ title: `Exported ${selectedLeads.length} leads` })
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg mb-4">
      <Badge variant="secondary" className="tabular-nums">{selectedIds.size} selected</Badge>

      <div className="flex items-center gap-1">
        <Select value={bulkStage} onValueChange={setBulkStage}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Move to stage..." />
          </SelectTrigger>
          <SelectContent>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {bulkStage && (
          <Button size="sm" className="h-8" onClick={handleBulkStageChange}>
            <ArrowRight className="h-4 w-4 mr-1" />
            Apply
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Select value={bulkSegment} onValueChange={setBulkSegment}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="Change segment..." />
          </SelectTrigger>
          <SelectContent>
            {segmentCategories.map((seg) => (
              <SelectItem key={seg.id} value={seg.id}>
                <div className="flex items-center gap-2">
                  <CategoryIcon icon={seg.icon} className="h-3 w-3" />
                  {seg.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {bulkSegment && (
          <Button size="sm" className="h-8" onClick={handleBulkSegmentChange}>
            <ArrowRight className="h-4 w-4 mr-1" />
            Apply
          </Button>
        )}
      </div>

      {templates.length > 0 && (
        <Popover open={assignOpen} onOpenChange={setAssignOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              <ListChecks className="h-4 w-4 mr-1" />
              Assign Template
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <p className="text-xs font-medium text-muted-foreground mb-2">Assign template to {selectedIds.size} leads</p>
            {templates.map((t) => (
              <Button
                key={t.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm h-8"
                onClick={() => handleBulkAssignTemplate(t.id)}
              >
                {t.name}
              </Button>
            ))}
          </PopoverContent>
        </Popover>
      )}

      <Button size="sm" variant="outline" className="h-8" onClick={handleExportSelected}>
        Export
      </Button>

      <Button size="sm" variant="outline" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleBulkDelete}>
        <Trash2 className="h-4 w-4 mr-1" />
        Delete
      </Button>

      <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={onClearSelection}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

"use client"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Phone } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Lead, Attempt, AttemptOutcome, DerivedStage, DerivedStatus, PipelineStage, FieldDefinition, Tag } from "@/lib/store"
import { getDerivedStage, getDerivedStatus, getEffectiveStage } from "@/lib/store"
import { Skeleton } from "@/components/ui/skeleton"
import { TagBadges } from "@/components/tag-manager"

const getOutcomeColor = (outcome: AttemptOutcome) => {
  const colors: Record<AttemptOutcome, string> = {
    "No connect": "bg-muted text-muted-foreground",
    "Gatekeeper only": "bg-orange-100 text-orange-800",
    "DM reached → No interest": "bg-red-100 text-red-800",
    "DM reached → Some interest": "bg-blue-100 text-blue-800",
    "Meeting set": "bg-green-100 text-green-800",
  }
  return colors[outcome] || "bg-muted text-muted-foreground"
}

export { getOutcomeColor }

export interface LeadWithDerived extends Lead {
  derivedStage: DerivedStage
  derivedStatus: DerivedStatus
  lastAttempt: Attempt | null
  attemptCount: number
}

export function deriveLeadFields(lead: Lead, attempts: Attempt[]): LeadWithDerived {
  const leadAttempts = attempts
    .filter((a) => a.leadId === lead.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return {
    ...lead,
    derivedStage: getDerivedStage(leadAttempts),
    derivedStatus: getDerivedStatus(leadAttempts),
    lastAttempt: leadAttempts[0] || null,
    attemptCount: leadAttempts.length,
  }
}

interface LeadsTableProps {
  leads: LeadWithDerived[]
  loading?: boolean
  stages?: PipelineStage[]
  attempts?: Attempt[]
  fieldDefinitions?: FieldDefinition[]
  tags?: Tag[]
  leadTagsMap?: Record<string, string[]>
  onSelectLead: (lead: LeadWithDerived) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

function getStageColor(stageName: string, stages: PipelineStage[]): string {
  const stage = stages.find((s) => s.name === stageName)
  return stage?.color ?? "#6b7280"
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  )
}

export function LeadsTable({ leads, loading, stages = [], attempts = [], fieldDefinitions = [], tags = [], leadTagsMap = {}, onSelectLead, selectedIds, onSelectionChange }: LeadsTableProps) {
  // Show up to 3 custom field columns
  const visibleFields = fieldDefinitions.slice(0, 3)
  const hasSelection = selectedIds !== undefined && onSelectionChange !== undefined
  const allSelected = hasSelection && leads.length > 0 && leads.every((l) => selectedIds!.has(l.id))

  const toggleAll = () => {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(leads.map((l) => l.id)))
    }
  }

  const toggleOne = (id: string) => {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  if (loading) {
    return (
      <div className="rounded-md border p-4">
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {hasSelection && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead className="w-[200px]">Company</TableHead>
            <TableHead className="w-[140px]">Phone</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Segment</TableHead>
            <TableHead>Last Outcome</TableHead>
            <TableHead>Next Action</TableHead>
            {visibleFields.map((f) => (
              <TableHead key={f.id}>{f.fieldLabel}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const effectiveStage = getEffectiveStage(lead, attempts)
            const stageColor = getStageColor(effectiveStage, stages)

            return (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelectLead(lead)}
              >
                {hasSelection && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds!.has(lead.id)}
                      onCheckedChange={() => toggleOne(lead.id)}
                      aria-label={`Select ${lead.company}`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  <div>{lead.company}</div>
                  {tags.length > 0 && leadTagsMap[lead.id] && (
                    <TagBadges tags={tags} tagIds={leadTagsMap[lead.id]} />
                  )}
                </TableCell>
                <TableCell>
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{ backgroundColor: `${stageColor}20`, color: stageColor, borderColor: stageColor }}
                  >
                    {effectiveStage}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{lead.segment}</Badge>
                </TableCell>
                <TableCell>
                  {lead.lastAttempt ? (
                    <Badge className={getOutcomeColor(lead.lastAttempt.outcome)} variant="secondary">
                      {lead.lastAttempt.outcome}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      New
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {lead.lastAttempt ? (
                    <span className="text-sm">{lead.lastAttempt.nextAction}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Call</span>
                  )}
                </TableCell>
                {visibleFields.map((f) => {
                  const val = lead.customFields?.[f.fieldKey]
                  return (
                    <TableCell key={f.id}>
                      <span className="text-sm text-muted-foreground">
                        {val != null ? String(val) : "-"}
                      </span>
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

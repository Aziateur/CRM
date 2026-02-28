"use client"

import { useState, useMemo, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Phone, Columns3 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Lead, Attempt, AttemptOutcome, PipelineStage, FieldDefinition, Tag } from "@/lib/store"
import { getOutcomeBadgeColor, DEFAULT_STAGE } from "@/lib/store"
import { Skeleton } from "@/components/ui/skeleton"
import { TagBadges } from "@/components/tag-manager"
import { useSegmentMap, resolveSegmentName } from "@/hooks/segment-helpers"
import type { EnrollmentSummary } from "@/hooks/use-enrollment-summary"

const getOutcomeColor = (outcome: AttemptOutcome) => getOutcomeBadgeColor(outcome)

export { getOutcomeColor }

export interface LeadWithDerived extends Lead {
  lastAttempt: Attempt | null
  attemptCount: number
}

export function deriveLeadFields(lead: Lead, attempts: Attempt[]): LeadWithDerived {
  const leadAttempts = attempts
    .filter((a) => a.leadId === lead.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return {
    ...lead,
    lastAttempt: leadAttempts[0] || null,
    attemptCount: leadAttempts.length,
  }
}

// ============================================================================
// COLUMN REGISTRY — defines every possible column
// ============================================================================

interface ColumnDef {
  key: string
  label: string
  builtIn: true
}

const BUILT_IN_COLUMNS: ColumnDef[] = [
  { key: "company", label: "Company", builtIn: true },
  { key: "phone", label: "Phone", builtIn: true },
  { key: "stage", label: "Stage", builtIn: true },
  { key: "segment", label: "Segment", builtIn: true },
  { key: "last_outcome", label: "Last Outcome", builtIn: true },
  { key: "next_action", label: "Next Action", builtIn: true },
  { key: "tags", label: "Tags", builtIn: true },
  { key: "sequence_progress", label: "Sequence", builtIn: true },
]

const ALL_BUILT_IN_KEYS = BUILT_IN_COLUMNS.map(c => c.key)

// ============================================================================
// PROPS
// ============================================================================

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
  // View schema integration
  tableColumns?: string[]
  onTableColumnsChange?: (columns: string[]) => void
  // Enrollment data for sequence progress column
  enrollmentMap?: Map<string, EnrollmentSummary>
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

// ============================================================================
// COLUMNS VISIBILITY DROPDOWN
// ============================================================================

function ColumnsDropdown({
  visibleColumns,
  allColumns,
  onChange,
}: {
  visibleColumns: string[]
  allColumns: { key: string; label: string }[]
  onChange: (columns: string[]) => void
}) {
  const toggle = useCallback((key: string) => {
    if (visibleColumns.includes(key)) {
      // Don't allow removing the last column
      if (visibleColumns.length <= 1) return
      onChange(visibleColumns.filter(k => k !== key))
    } else {
      onChange([...visibleColumns, key])
    }
  }, [visibleColumns, onChange])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Columns3 className="h-3.5 w-3.5" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
          Toggle Columns
        </div>
        <div className="space-y-0.5">
          {allColumns.map(col => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={visibleColumns.includes(col.key)}
                onCheckedChange={() => toggle(col.key)}
              />
              <span className="text-sm">{col.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LeadsTable({
  leads,
  loading,
  stages = [],
  attempts = [],
  fieldDefinitions = [],
  tags = [],
  leadTagsMap = {},
  onSelectLead,
  selectedIds,
  onSelectionChange,
  tableColumns,
  onTableColumnsChange,
  enrollmentMap,
}: LeadsTableProps) {
  const hasSelection = selectedIds !== undefined && onSelectionChange !== undefined
  const { segmentMap } = useSegmentMap()
  const allSelected = hasSelection && leads.length > 0 && leads.every((l) => selectedIds!.has(l.id))

  // Build the full list of all possible columns (built-in + custom fields)
  const allColumns = useMemo(() => {
    const cols: { key: string; label: string }[] = [...BUILT_IN_COLUMNS.map(c => ({ key: c.key, label: c.label }))]
    fieldDefinitions.forEach(f => {
      cols.push({ key: f.fieldKey, label: f.fieldLabel })
    })
    return cols
  }, [fieldDefinitions])

  // Determine visible columns — use prop if provided, else default built-in set
  const visibleColumns = useMemo(() => {
    if (tableColumns && tableColumns.length > 0) return tableColumns
    return ALL_BUILT_IN_KEYS
  }, [tableColumns])

  const handleColumnsChange = useCallback((cols: string[]) => {
    onTableColumnsChange?.(cols)
  }, [onTableColumnsChange])

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

  // ============================================================================
  // CELL RENDERERS — renders each column's cell content for a given lead
  // ============================================================================

  const renderCell = (colKey: string, lead: LeadWithDerived) => {
    const effectiveStage = lead.stage || DEFAULT_STAGE

    switch (colKey) {
      case "company":
        return (
          <TableCell key={colKey} className="font-medium">
            <div>{lead.company}</div>
            {tags.length > 0 && leadTagsMap[lead.id] && (
              <TagBadges tags={tags} tagIds={leadTagsMap[lead.id]} />
            )}
          </TableCell>
        )
      case "phone":
        return (
          <TableCell key={colKey}>
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
        )
      case "stage":
        return (
          <TableCell key={colKey}>
            <Badge
              variant="secondary"
              className="text-xs"
              style={{ backgroundColor: `${getStageColor(effectiveStage, stages)}20`, color: getStageColor(effectiveStage, stages), borderColor: getStageColor(effectiveStage, stages) }}
            >
              {effectiveStage}
            </Badge>
          </TableCell>
        )
      case "segment":
        return (
          <TableCell key={colKey}>
            <Badge variant="outline">{resolveSegmentName(lead.segment, segmentMap)}</Badge>
          </TableCell>
        )
      case "last_outcome":
        return (
          <TableCell key={colKey}>
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
        )
      case "next_action":
        return (
          <TableCell key={colKey}>
            {lead.lastAttempt ? (
              <span className="text-sm">{lead.lastAttempt.nextAction}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Call</span>
            )}
          </TableCell>
        )
      case "tags":
        return (
          <TableCell key={colKey}>
            {tags.length > 0 && leadTagsMap[lead.id] ? (
              <TagBadges tags={tags} tagIds={leadTagsMap[lead.id]} />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        )
      case "sequence_progress": {
        const summary = enrollmentMap?.get(lead.id)
        if (!summary) {
          return (
            <TableCell key={colKey}>
              <span className="text-muted-foreground text-sm">—</span>
            </TableCell>
          )
        }
        if (summary.status === "completed") {
          return (
            <TableCell key={colKey}>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                ✓ {summary.sequenceName}
              </Badge>
            </TableCell>
          )
        }
        const progressVal = summary.totalSteps > 0
          ? Math.round((summary.currentStep / summary.totalSteps) * 100)
          : 0
        return (
          <TableCell key={colKey}>
            <div className="min-w-[120px] space-y-1">
              <span className="text-xs font-medium truncate block">{summary.sequenceName}</span>
              <div className="flex items-center gap-2">
                <Progress value={progressVal} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground shrink-0">
                  {summary.currentStep}/{summary.totalSteps}
                </span>
              </div>
            </div>
          </TableCell>
        )
      }
      default: {
        // Custom field column
        const val = lead.customFields?.[colKey]
        return (
          <TableCell key={colKey}>
            <span className="text-sm text-muted-foreground">
              {val != null ? String(val) : "-"}
            </span>
          </TableCell>
        )
      }
    }
  }

  const getColumnLabel = (colKey: string) => {
    const builtIn = BUILT_IN_COLUMNS.find(c => c.key === colKey)
    if (builtIn) return builtIn.label
    const field = fieldDefinitions.find(f => f.fieldKey === colKey)
    return field?.fieldLabel ?? colKey
  }

  return (
    <div className="space-y-2">
      {/* Columns dropdown — only show if we have the change handler */}
      {onTableColumnsChange && (
        <div className="flex justify-end">
          <ColumnsDropdown
            visibleColumns={visibleColumns}
            allColumns={allColumns}
            onChange={handleColumnsChange}
          />
        </div>
      )}

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
              {visibleColumns.map(colKey => (
                <TableHead key={colKey}>{getColumnLabel(colKey)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
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
                {visibleColumns.map(colKey => renderCell(colKey, lead))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

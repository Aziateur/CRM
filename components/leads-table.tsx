"use client"

import { Badge } from "@/components/ui/badge"
import { Phone } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Lead, Attempt, AttemptOutcome, DerivedStage, DerivedStatus } from "@/lib/store"
import { getDerivedStage, getDerivedStatus } from "@/lib/store"
import { Skeleton } from "@/components/ui/skeleton"

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
  onSelectLead: (lead: LeadWithDerived) => void
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  )
}

export function LeadsTable({ leads, loading, onSelectLead }: LeadsTableProps) {
  if (loading) {
    return (
      <div className="rounded-md border p-4">
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Company</TableHead>
            <TableHead className="w-[140px]">Phone</TableHead>
            <TableHead>Segment</TableHead>
            <TableHead>Last Outcome</TableHead>
            <TableHead>Next Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow
              key={lead.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectLead(lead)}
            >
              <TableCell className="font-medium">{lead.company}</TableCell>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Merge, Trash2, Search } from "lucide-react"
import type { Lead } from "@/lib/store"

interface DuplicateGroup {
  matchField: "phone" | "email" | "company"
  matchValue: string
  leads: Lead[]
}

function findDuplicates(leads: Lead[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = []
  const seen = new Set<string>()

  // Phone duplicates
  const byPhone = new Map<string, Lead[]>()
  for (const lead of leads) {
    if (!lead.phone) continue
    const normalized = lead.phone.replace(/\D/g, "")
    if (normalized.length < 7) continue
    const existing = byPhone.get(normalized) || []
    existing.push(lead)
    byPhone.set(normalized, existing)
  }
  for (const [phone, dupes] of byPhone) {
    if (dupes.length > 1 && !seen.has(`phone:${phone}`)) {
      seen.add(`phone:${phone}`)
      groups.push({ matchField: "phone", matchValue: dupes[0].phone || phone, leads: dupes })
    }
  }

  // Email duplicates
  const byEmail = new Map<string, Lead[]>()
  for (const lead of leads) {
    if (!lead.email) continue
    const normalized = lead.email.trim().toLowerCase()
    const existing = byEmail.get(normalized) || []
    existing.push(lead)
    byEmail.set(normalized, existing)
  }
  for (const [email, dupes] of byEmail) {
    if (dupes.length > 1 && !seen.has(`email:${email}`)) {
      seen.add(`email:${email}`)
      groups.push({ matchField: "email", matchValue: email, leads: dupes })
    }
  }

  // Company duplicates (exact match, case insensitive)
  const byCompany = new Map<string, Lead[]>()
  for (const lead of leads) {
    const normalized = lead.company.trim().toLowerCase()
    const existing = byCompany.get(normalized) || []
    existing.push(lead)
    byCompany.set(normalized, existing)
  }
  for (const [company, dupes] of byCompany) {
    if (dupes.length > 1 && !seen.has(`company:${company}`)) {
      seen.add(`company:${company}`)
      groups.push({ matchField: "company", matchValue: dupes[0].company, leads: dupes })
    }
  }

  return groups
}

interface DuplicateDetectorProps {
  leads: Lead[]
  onLeadsChanged: () => void
}

export function DuplicateDetector({ leads, onLeadsChanged }: DuplicateDetectorProps) {
  const { toast } = useToast()
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null)
  const [keepId, setKeepId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const duplicates = useMemo(() => findDuplicates(leads), [leads])

  const handleMerge = async () => {
    if (!selectedGroup || !keepId) return
    setProcessing(true)
    try {
      const supabase = getSupabase()
      const deleteIds = selectedGroup.leads.filter((l) => l.id !== keepId).map((l) => l.id)

      for (const id of deleteIds) {
        // Move contacts to the kept lead
        await supabase.from("contacts").update({ lead_id: keepId }).eq("lead_id", id)
        // Move attempts to the kept lead
        await supabase.from("attempts").update({ lead_id: keepId }).eq("lead_id", id)
        // Delete the duplicate
        await supabase.from("leads").delete().eq("id", id)
      }

      toast({ title: `Merged ${deleteIds.length} duplicate(s)` })
      setSelectedGroup(null)
      setKeepId(null)
      onLeadsChanged()
    } catch (e) {
      toast({ variant: "destructive", title: "Merge failed", description: e instanceof Error ? e.message : "Unknown error" })
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteDuplicates = async () => {
    if (!selectedGroup || !keepId) return
    setProcessing(true)
    try {
      const supabase = getSupabase()
      const deleteIds = selectedGroup.leads.filter((l) => l.id !== keepId).map((l) => l.id)

      for (const id of deleteIds) {
        await supabase.from("leads").delete().eq("id", id)
      }

      toast({ title: `Deleted ${deleteIds.length} duplicate(s)` })
      setSelectedGroup(null)
      setKeepId(null)
      onLeadsChanged()
    } catch (e) {
      toast({ variant: "destructive", title: "Delete failed", description: e instanceof Error ? e.message : "Unknown error" })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Duplicate Detection</h3>
        {duplicates.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {duplicates.length} group{duplicates.length > 1 ? "s" : ""} found
          </Badge>
        )}
      </div>

      {duplicates.length === 0 ? (
        <div className="border rounded-lg p-6 text-center">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No duplicates found across {leads.length} leads</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {duplicates.map((group, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{group.matchField}</Badge>
                  <span className="text-sm font-medium">{group.matchValue}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {group.leads.length} leads: {group.leads.map((l) => l.company).join(", ")}
                </p>
              </div>
              <Button size="sm" variant="outline" className="bg-transparent" onClick={() => { setSelectedGroup(group); setKeepId(group.leads[0].id) }}>
                Resolve
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={(open) => { if (!open) { setSelectedGroup(null); setKeepId(null) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Duplicates</DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Select the lead to keep. Others will be merged or deleted.
              </p>
              <div className="space-y-2">
                {selectedGroup.leads.map((lead) => (
                  <Card
                    key={lead.id}
                    className={`cursor-pointer transition-colors ${keepId === lead.id ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
                    onClick={() => setKeepId(lead.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{lead.company}</p>
                          <p className="text-xs text-muted-foreground">
                            {[lead.phone, lead.email, lead.segment].filter(Boolean).join(" · ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.contacts.length} contacts · Created {new Date(lead.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {keepId === lead.id && (
                          <Badge variant="default" className="text-xs">Keep</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => { setSelectedGroup(null); setKeepId(null) }}>
              Cancel
            </Button>
            <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleDeleteDuplicates} disabled={!keepId || processing}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Others
            </Button>
            <Button onClick={handleMerge} disabled={!keepId || processing}>
              <Merge className="h-4 w-4 mr-1" />
              Merge Into Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

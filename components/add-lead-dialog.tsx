import { useState } from "react"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { segmentOptions, type Lead } from "@/lib/store"

interface AddLeadDialogProps {
  onLeadAdded: (lead: Lead) => void
}

export function AddLeadDialog({ onLeadAdded }: AddLeadDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [newLead, setNewLead] = useState({ company: "", phone: "", segment: "Unknown" })

  const handleAdd = async () => {
    if (!newLead.company) return

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("leads")
      .insert([{ company: newLead.company, phone: newLead.phone || null, segment: newLead.segment }])
      .select()
      .single()

    if (error) {
      toast({ variant: "destructive", title: "Failed to add lead", description: error.message })
      return
    }

    toast({ title: "Lead added", description: `${newLead.company} has been saved.` })

    if (data) {
      const lead: Lead = {
        id: data.id,
        company: data.company,
        phone: data.phone,
        segment: data.segment,
        isDecisionMaker: "unknown",
        isFleetOwner: "unknown",
        contacts: [],
        createdAt: data.created_at,
      }
      onLeadAdded(lead)
      setNewLead({ company: "", phone: "", segment: "Unknown" })
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>Enter basic lead info. Details can be added later.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              value={newLead.company}
              onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
              placeholder="Enter company name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={newLead.phone}
              onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              placeholder="+1 555-0100"
            />
          </div>
          <div className="grid gap-2">
            <Label>Segment</Label>
            <Select value={newLead.segment} onValueChange={(value) => setNewLead({ ...newLead, segment: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select segment" />
              </SelectTrigger>
              <SelectContent>
                {segmentOptions.map((seg) => (
                  <SelectItem key={seg} value={seg}>
                    {seg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!newLead.company}>
            Add Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

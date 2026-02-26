"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical } from "lucide-react"
import { usePipelineStages } from "@/hooks/use-pipeline-stages"
import type { PipelineStage } from "@/lib/store"

const STAGE_COLORS = [
  "#6b7280", "#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4",
]

function StageTypeBadge({ stage }: { stage: PipelineStage }) {
  if (stage.isWon) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs">Won</Badge>
  if (stage.isLost) return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Lost</Badge>
  return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-xs">Active</Badge>
}

export function PipelineEditor() {
  const { stages, loading, createStage, updateStage, deleteStage, moveStage } = usePipelineStages()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [formName, setFormName] = useState("")
  const [formColor, setFormColor] = useState(STAGE_COLORS[0])
  const [formProbability, setFormProbability] = useState(0)
  const [formIsWon, setFormIsWon] = useState(false)
  const [formIsLost, setFormIsLost] = useState(false)

  const resetForm = () => {
    setFormName("")
    setFormColor(STAGE_COLORS[0])
    setFormProbability(0)
    setFormIsWon(false)
    setFormIsLost(false)
  }

  const openAdd = () => {
    resetForm()
    setEditingStage(null)
    setIsAddOpen(true)
  }

  const openEdit = (stage: PipelineStage) => {
    setFormName(stage.name)
    setFormColor(stage.color)
    setFormProbability(stage.defaultProbability)
    setFormIsWon(stage.isWon)
    setFormIsLost(stage.isLost)
    setEditingStage(stage)
    setIsAddOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return

    if (editingStage) {
      await updateStage(editingStage.id, {
        name: formName.trim(),
        color: formColor,
        defaultProbability: formProbability,
        isWon: formIsWon,
        isLost: formIsLost,
      })
    } else {
      await createStage({
        name: formName.trim(),
        color: formColor,
        defaultProbability: formProbability,
        isWon: formIsWon,
        isLost: formIsLost,
      })
    }

    resetForm()
    setEditingStage(null)
    setIsAddOpen(false)
  }

  const handleDelete = async (stage: PipelineStage) => {
    if (!confirm(`Delete stage "${stage.name}"? Leads in this stage won't be affected.`)) return
    await deleteStage(stage.id)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pipeline Stages</h3>
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pipeline Stages</h3>
          <Button size="sm" variant="ghost" className="text-primary h-8" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Stage
          </Button>
        </div>

        <div className="border rounded-lg divide-y">
          {stages.map((stage, i) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 px-4 py-3 group hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-muted-foreground w-6 text-right tabular-nums">{i + 1}</span>
              <GripVertical className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-sm font-medium flex-1">{stage.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{stage.defaultProbability}%</span>
              <StageTypeBadge stage={stage} />
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => moveStage(stage.id, "up")}
                  disabled={i === 0}
                >
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2v8M3 5l3-3 3 3" />
                  </svg>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => moveStage(stage.id, "down")}
                  disabled={i === stages.length - 1}
                >
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 10V2M3 7l3 3 3-3" />
                  </svg>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(stage)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(stage)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {stages.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No pipeline stages defined. Add one to get started.
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStage ? "Edit Stage" : "Add Pipeline Stage"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Qualified, Proposal Sent"
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {STAGE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-7 w-7 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: formColor === c ? "#000" : "transparent",
                      transform: formColor === c ? "scale(1.15)" : "scale(1)",
                    }}
                    onClick={() => setFormColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Win Probability (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formProbability}
                onChange={(e) => setFormProbability(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Stage Type</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={!formIsWon && !formIsLost ? "default" : "outline"}
                  onClick={() => { setFormIsWon(false); setFormIsLost(false) }}
                >
                  Active
                </Button>
                <Button
                  size="sm"
                  variant={formIsWon ? "default" : "outline"}
                  className={formIsWon ? "bg-green-600 hover:bg-green-700" : ""}
                  onClick={() => { setFormIsWon(true); setFormIsLost(false) }}
                >
                  Won
                </Button>
                <Button
                  size="sm"
                  variant={formIsLost ? "default" : "outline"}
                  className={formIsLost ? "bg-red-600 hover:bg-red-700" : ""}
                  onClick={() => { setFormIsLost(true); setFormIsWon(false) }}
                >
                  Lost
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              {editingStage ? "Save Changes" : "Add Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

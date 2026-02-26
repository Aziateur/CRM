"use client"

import { useState, useEffect } from "react"
import { useCategories } from "@/hooks/use-categories"
import { useProjectId } from "@/hooks/use-project-id"
import { createIntelEntry, type Altitude } from "@/lib/intel"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BookOpen, Loader2 } from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"

interface SaveToKbDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Pre-filled title for the KB entry */
  defaultTitle?: string
  /** Pre-filled content for the KB entry */
  defaultContent?: string
  /** Attempt ID to link as source */
  sourceAttemptId?: string
  /** Optional lead context for auto-tagging */
  leadContext?: {
    segment?: string
    segmentId?: string
    stage?: string
    industry?: string
    industryId?: string
    company?: string
  }
}

export function SaveToKbDialog({
  open,
  onOpenChange,
  defaultTitle = "",
  defaultContent = "",
  sourceAttemptId,
  leadContext,
}: SaveToKbDialogProps) {
  const { toast } = useToast()
  const projectId = useProjectId()
  const { activeCategories } = useCategories("intel_category")

  const [categoryId, setCategoryId] = useState("")
  const [title, setTitle] = useState(defaultTitle)
  const [content, setContent] = useState(defaultContent)
  const [tagsStr, setTagsStr] = useState("")
  const [saving, setSaving] = useState(false)

  // Reset form when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle)
      setContent(defaultContent)
      setCategoryId("")
      setTagsStr(
        leadContext?.company
          ? leadContext.company
          : ""
      )
    }
  }, [open, defaultTitle, defaultContent, leadContext?.company])

  const handleSave = async () => {
    if (!categoryId || !title.trim() || !projectId) return

    setSaving(true)
    try {
      // Determine altitude based on context:
      // If we have a segmentId → altitude 2 (segment-scoped)
      // If we have an industryId → altitude 1 (industry-scoped)
      // Otherwise → altitude 2 as default
      const altitude: Altitude = leadContext?.industryId ? 1 : 2

      await createIntelEntry(projectId, {
        altitude,
        industryId: leadContext?.industryId ?? undefined,
        segmentId: leadContext?.segmentId ?? undefined,
        intelCategoryId: categoryId,
        title: title.trim(),
        content: content.trim() || "",
        tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean),
        source: leadContext?.company || undefined,
        sourceAttemptIds: sourceAttemptId ? [sourceAttemptId] : [],
      })

      toast({ title: "Saved to Knowledge Base" })
      onOpenChange(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to save", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Save to Knowledge Base
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Select a KB category..." />
              </SelectTrigger>
              <SelectContent>
                {activeCategories.length === 0 && (
                  <SelectItem value="__none__" disabled>
                    No categories — create one in Settings → Knowledge Base
                  </SelectItem>
                )}
                {activeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="inline-flex items-center gap-1.5">
                      <CategoryIcon icon={cat.icon} className="h-3.5 w-3.5" />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              className="h-9 mt-1"
              placeholder="Entry title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea
              className="mt-1 min-h-[100px]"
              placeholder="Content to save..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Tags</Label>
            <Input
              className="h-9 mt-1"
              placeholder="Comma-separated tags..."
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
            />
          </div>
          {leadContext && (leadContext.segment || leadContext.stage || leadContext.industry) && (
            <div className="flex gap-3 text-[10px] text-muted-foreground bg-muted/50 rounded p-2">
              <span>Auto-filters from lead:</span>
              {leadContext.segment && <span>Segment: <strong>{leadContext.segment}</strong></span>}
              {leadContext.stage && <span>Stage: <strong>{leadContext.stage}</strong></span>}
              {leadContext.industry && <span>Industry: <strong>{leadContext.industry}</strong></span>}
            </div>
          )}
          {sourceAttemptId && (
            <p className="text-[10px] text-muted-foreground">
              This entry will be linked to the source call attempt.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!categoryId || !title.trim() || saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save to KB
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

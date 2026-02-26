"use client"

import { useState } from "react"
import { useTags, useLeadTags } from "@/hooks/use-tags"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, X, Tag as TagIcon, Trash2 } from "lucide-react"
import type { Tag } from "@/lib/store"

const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#14b8a6",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#6b7280",
]

// Read-only tag badges for display in tables/kanban
export function TagBadges({ tags, tagIds }: { tags: Tag[]; tagIds: string[] }) {
  if (tagIds.length === 0) return null
  const matched = tags.filter((t) => tagIds.includes(t.id))
  if (matched.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {matched.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="text-xs px-1.5 py-0"
          style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }}
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  )
}

// Interactive tag toggle for lead drawer
export function TagToggle({ leadId }: { leadId: string }) {
  const { tags, createTag } = useTags()
  const { tagIds, toggleTag } = useLeadTags(leadId)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#3b82f6")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!newTagName.trim()) return
    const tag = await createTag(newTagName, newTagColor)
    if (tag) {
      await toggleTag(tag.id)
      setNewTagName("")
      setIsCreating(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 bg-transparent">
          <TagIcon className="h-3 w-3" />
          Tags
          {tagIds.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-xs">{tagIds.length}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 z-50" align="start">
        <div className="space-y-2">
          <p className="text-sm font-medium">Tags</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {tags.map((tag) => {
              const active = tagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${active ? "bg-muted" : ""}`}
                  onClick={() => toggleTag(tag.id)}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="flex-1 text-left truncate">{tag.name}</span>
                  {active && <span className="text-primary text-xs">✓</span>}
                </button>
              )
            })}
          </div>
          {isCreating ? (
            <div className="space-y-2 pt-1 border-t">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate() }}
                placeholder="Tag name"
                className="h-8"
                autoFocus
              />
              <div className="flex gap-1">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-5 h-5 rounded-full border-2 ${newTagColor === c ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewTagColor(c)}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <Button size="sm" className="h-7 flex-1" onClick={handleCreate}>Create</Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setIsCreating(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => setIsCreating(true)}>
              <Plus className="h-3 w-3 mr-1" /> New tag
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Settings page: full tag manager with CRUD
export function TagManager() {
  const { tags, createTag, updateTag, deleteTag } = useTags()
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#3b82f6")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")

  const handleCreate = async () => {
    if (!newName.trim()) return
    await createTag(newName, newColor)
    setNewName("")
  }

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return
    await updateTag(editingId, { name: editName.trim(), color: editColor })
    setEditingId(null)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tags</h3>
      <div className="border rounded-lg divide-y">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between px-4 py-2.5">
            {editingId === tag.id ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleUpdate() }}
                  className="h-8 w-40"
                  autoFocus
                />
                <div className="flex gap-1">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-4 h-4 rounded-full border-2 ${editColor === c ? "border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setEditColor(c)}
                    />
                  ))}
                </div>
                <Button size="sm" className="h-7" onClick={handleUpdate}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingId(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm font-medium">{tag.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => startEdit(tag)}>Edit</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => deleteTag(tag.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No tags yet</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate() }}
          placeholder="New tag name"
          className="flex-1"
        />
        <div className="flex gap-1">
          {TAG_COLORS.slice(0, 5).map((c) => (
            <button
              key={c}
              className={`w-5 h-5 rounded-full border-2 ${newColor === c ? "border-foreground" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              onClick={() => setNewColor(c)}
            />
          ))}
        </div>
        <Button onClick={handleCreate} disabled={!newName.trim()} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  )
}

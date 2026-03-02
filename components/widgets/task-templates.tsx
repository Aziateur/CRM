"use client"

import { useState } from "react"
import { useTaskTemplates, useTaskAssignments } from "@/hooks/use-task-templates"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ListChecks, Plus, ChevronDown, ChevronRight } from "lucide-react"
import type { TemplateItem, TaskAssignmentItemData } from "@/lib/store"

function countProgress(items: TemplateItem[], data: Record<string, TaskAssignmentItemData>): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const item of items) {
    if (item.type === "group" && item.children) {
      const sub = countProgress(item.children, data)
      done += sub.done
      total += sub.total
    } else {
      total++
      if (data[item.id]?.done) done++
    }
  }
  return { done, total }
}

export function TaskTemplatesWidget({ leadId }: { leadId: string }) {
  const { templates } = useTaskTemplates()
  const { assignments, assign, toggleItem, updateItemValue } = useTaskAssignments({ leadId })
  const [assignOpen, setAssignOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const assignedTemplateIds = new Set(assignments.map((a) => a.templateId))
  const unassigned = templates.filter((t) => !assignedTemplateIds.has(t.id))

  if (templates.length === 0 && assignments.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Tasks ({assignments.filter((a) => a.status === "active").length})
          </div>
          {unassigned.length > 0 && (
            <Popover open={assignOpen} onOpenChange={setAssignOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Assign
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <p className="text-xs font-medium text-muted-foreground mb-2">Assign template</p>
                {unassigned.map((t) => (
                  <Button
                    key={t.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm h-8"
                    onClick={async () => { await assign(leadId, t.id); setAssignOpen(false) }}
                  >
                    {t.name}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No templates assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((assignment) => {
              const template = templates.find((t) => t.id === assignment.templateId)
              if (!template) return null
              const { done, total } = countProgress(template.items, assignment.data)
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              const isExpanded = expandedId === assignment.id

              return (
                <div key={assignment.id} className="border rounded p-2">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : assignment.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="text-sm font-medium flex-1">{template.name}</span>
                    {assignment.status === "completed" ? (
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">Done</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground tabular-nums">{done}/{total}</span>
                    )}
                  </div>
                  {assignment.status !== "completed" && total > 0 && (
                    <div className="w-full h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {isExpanded && (
                    <div className="mt-2 space-y-1">
                      <InlineChecklist
                        items={template.items}
                        data={assignment.data}
                        assignmentId={assignment.id}
                        templateItems={template.items}
                        onToggle={toggleItem}
                        onUpdateValue={updateItemValue}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InlineChecklist({
  items,
  data,
  assignmentId,
  templateItems,
  onToggle,
  onUpdateValue,
  depth = 0,
}: {
  items: TemplateItem[]
  data: Record<string, TaskAssignmentItemData>
  assignmentId: string
  templateItems: TemplateItem[]
  onToggle: (assignmentId: string, itemId: string, templateItems: TemplateItem[]) => void
  onUpdateValue: (assignmentId: string, itemId: string, value: string) => void
  depth?: number
}) {
  return (
    <div className={`space-y-0.5 ${depth > 0 ? "ml-4 border-l pl-2" : ""}`}>
      {items.map((item) => {
        const itemData = data[item.id] ?? { done: false }

        if (item.type === "group" && item.children) {
          return (
            <div key={item.id}>
              <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
              <InlineChecklist
                items={item.children}
                data={data}
                assignmentId={assignmentId}
                templateItems={templateItems}
                onToggle={onToggle}
                onUpdateValue={onUpdateValue}
                depth={depth + 1}
              />
            </div>
          )
        }

        return (
          <div key={item.id} className="flex items-start gap-1.5">
            <input
              type="checkbox"
              checked={itemData.done}
              onChange={() => onToggle(assignmentId, item.id, templateItems)}
              className="rounded border-gray-300 h-3.5 w-3.5 mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className={`text-xs ${itemData.done ? "line-through text-muted-foreground" : ""}`}>
                {item.label}
              </span>
              {(item.type === "link" || item.type === "note") && (
                <Input
                  value={itemData.value ?? ""}
                  onChange={(e) => onUpdateValue(assignmentId, item.id, e.target.value)}
                  placeholder={item.type === "link" ? "Paste URL..." : "Add note..."}
                  className="h-6 text-[11px] mt-0.5"
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

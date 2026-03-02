"use client"

import { Lead } from "@/lib/store"
import { useTasks } from "@/hooks/use-tasks"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Check } from "lucide-react"
import { taskTypeLabels } from "@/lib/utils"

interface PendingTasksProps {
    lead: Lead
}

export function PendingTasksWidget({ lead }: PendingTasksProps) {
    const { tasks, completeTask, toggleChecklistItem } = useTasks({ leadId: lead.id })

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    Pending Tasks {tasks.length > 0 ? `(${tasks.length})` : ""}
                </CardTitle>
            </CardHeader>
            {tasks.length === 0 ? (
                <CardContent>
                    <p className="text-sm text-muted-foreground">No pending tasks.</p>
                </CardContent>
            ) : (
            <CardContent>
                <div className="space-y-2">
                    {tasks.map((task) => {
                        const isOverdue = new Date(task.dueAt) < new Date(new Date().toDateString())
                        return (
                            <div key={task.id} className={`p-2 rounded border ${isOverdue ? "border-red-200 bg-red-50" : ""}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">{taskTypeLabels[task.type] ?? task.type}</Badge>
                                            <span className="text-sm">{task.title}</span>
                                        </div>
                                        <span className={`text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                                            Due: {new Date(task.dueAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => completeTask(task.id)}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                                {task.checklist && task.checklist.length > 0 && (
                                    <div className="mt-1.5 space-y-1 ml-1">
                                        {task.checklist.map((item, i) => (
                                            <label key={i} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={item.done}
                                                    onChange={() => toggleChecklistItem(task.id, i)}
                                                    className="rounded border-gray-300 h-3.5 w-3.5"
                                                />
                                                <span className={`text-xs ${item.done ? "line-through text-muted-foreground" : ""}`}>
                                                    {item.label}
                                                </span>
                                            </label>
                                        ))}
                                        <span className="text-xs text-muted-foreground">
                                            {task.checklist.filter((c) => c.done).length}/{task.checklist.length} done
                                        </span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </CardContent>
            )}
        </Card>
    )
}

"use client"

import { Lead } from "@/lib/store"
import { useTasks } from "@/hooks/use-tasks"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Check } from "lucide-react"

const taskTypeLabels: Record<string, string> = {
    call_back: "Call",
    follow_up: "Follow up",
    meeting: "Meeting",
    email: "Email",
    custom: "Task",
}

interface PendingTasksProps {
    lead: Lead
}

export function PendingTasksWidget({ lead }: PendingTasksProps) {
    const { tasks, completeTask } = useTasks({ leadId: lead.id })

    if (tasks.length === 0) return null // Hide widget if no tasks

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    Pending Tasks ({tasks.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {tasks.map((task) => {
                        const isOverdue = new Date(task.dueAt) < new Date(new Date().toDateString())
                        return (
                            <div key={task.id} className={`flex items-center justify-between p-2 rounded border ${isOverdue ? "border-red-200 bg-red-50" : ""}`}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">{taskTypeLabels[task.type] ?? task.type}</Badge>
                                        <span className="text-sm">{task.title}</span>
                                    </div>
                                    <span className={`text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                                        Due: {new Date(task.dueAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => completeTask(task.id)}>
                                    <Check className="h-4 w-4" />
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

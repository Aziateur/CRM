"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Phone, MessageSquare, ChevronRight, Edit3, Clock, Check, Send,
    Mic, FileText, Tag as TagIcon, ArrowRight,
} from "lucide-react"
import type { Attempt, AttemptOutcome } from "@/lib/store"
import { getOutcomeColor } from "@/components/leads-table"

// ============================================================================
// Types
// ============================================================================

type ActivityType = "call" | "email" | "sms" | "note" | "stage_change" | "tag_change" | "field_change" | "task_created" | "task_completed"

interface Activity {
    id: string
    leadId: string
    activityType: ActivityType
    title: string
    description?: string
    metadata: Record<string, unknown>
    createdAt: string
}

interface InteractionsTimelineProps {
    leadId: string
    attempts: Attempt[]
    onViewAttempt: (attempt: Attempt) => void
    onAddNote: (text: string) => Promise<void>
}

// ============================================================================
// Activity icon + color mapping
// ============================================================================

function ActivityIcon({ type }: { type: ActivityType }) {
    switch (type) {
        case "call": return <Phone className="h-3.5 w-3.5 text-green-500" />
        case "note": return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
        case "stage_change": return <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
        case "tag_change": return <TagIcon className="h-3.5 w-3.5 text-indigo-500" />
        case "field_change": return <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
        case "task_created": return <Clock className="h-3.5 w-3.5 text-blue-500" />
        case "task_completed": return <Check className="h-3.5 w-3.5 text-green-600" />
        case "email":
        case "sms":
            return <Send className="h-3.5 w-3.5 text-muted-foreground" />
        default: return <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
    }
}

function timeSince(timestamp: string): string {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return "1 day ago"
    return `${diffDays} days ago`
}

// ============================================================================
// Component
// ============================================================================

export function InteractionsTimeline({ leadId, attempts, onViewAttempt, onAddNote }: InteractionsTimelineProps) {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(false)
    const [noteText, setNoteText] = useState("")

    // Fetch activities from lead_activities (populated by DB triggers + manual notes)
    const fetchActivities = useCallback(async () => {
        if (!leadId) { setActivities([]); return }
        setLoading(true)
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("lead_activities")
                .select("*")
                .eq("lead_id", leadId)
                .order("created_at", { ascending: false })
                .limit(100)

            if (error) {
                if (!error.message?.includes("does not exist")) {
                    console.warn("[InteractionsTimeline]", error.message)
                }
                setActivities([])
                return
            }

            if (data) {
                setActivities(data.map((row: Record<string, unknown>) => ({
                    id: row.id as string,
                    leadId: (row.lead_id ?? row.leadId) as string,
                    activityType: (row.activity_type ?? row.activityType) as ActivityType,
                    title: (row.title ?? "") as string,
                    description: (row.description ?? undefined) as string | undefined,
                    metadata: (row.metadata ?? {}) as Record<string, unknown>,
                    createdAt: (row.created_at ?? row.createdAt ?? new Date().toISOString()) as string,
                })))
            }
        } catch {
            setActivities([])
        } finally {
            setLoading(false)
        }
    }, [leadId])

    useEffect(() => { fetchActivities() }, [fetchActivities])

    // Refresh activities when attempts change (new attempt was logged → trigger wrote to lead_activities)
    useEffect(() => { fetchActivities() }, [attempts.length]) // eslint-disable-line react-hooks/exhaustive-deps

    // Handle note submission
    const handleAddNote = async () => {
        if (!noteText.trim()) return
        await onAddNote(noteText.trim())
        setNoteText("")
        // Optimistic: add locally
        const optimistic: Activity = {
            id: `temp-${Date.now()}`,
            leadId,
            activityType: "note",
            title: "Note",
            description: noteText.trim(),
            metadata: {},
            createdAt: new Date().toISOString(),
        }
        setActivities((prev) => [optimistic, ...prev])
    }

    // Find the attempt object for a "call" activity (to enable click-through)
    const findAttemptForActivity = (activity: Activity): Attempt | null => {
        const attemptId = activity.metadata?.attempt_id as string | undefined
        if (attemptId) return attempts.find((a) => a.id === attemptId) || null
        return null
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4" />
                    Interactions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Note input */}
                <div className="flex gap-2">
                    <Input
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
                        placeholder="Add a note..."
                        className="flex-1"
                    />
                    <Button size="icon" variant="ghost" onClick={handleAddNote} disabled={!noteText.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>

                {/* Timeline */}
                {loading && activities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">Loading...</p>
                )}
                {activities.length > 0 && (
                    <div className="space-y-1">
                        {activities.map((activity) => {
                            const isCall = activity.activityType === "call"
                            const attempt = isCall ? findAttemptForActivity(activity) : null
                            const outcome = activity.metadata?.outcome as AttemptOutcome | undefined

                            return (
                                <div
                                    key={activity.id}
                                    className={`flex gap-3 text-sm p-2 rounded ${isCall ? "border cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
                                    onClick={isCall && attempt ? () => onViewAttempt(attempt) : undefined}
                                >
                                    <div className="shrink-0 mt-0.5">
                                        <ActivityIcon type={activity.activityType} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* For calls: show outcome badge inline */}
                                            {isCall && outcome ? (
                                                <>
                                                    <Badge className={getOutcomeColor(outcome)} variant="secondary">{outcome}</Badge>
                                                    {activity.metadata?.why && (
                                                        <span className="text-xs text-muted-foreground">Why: {activity.metadata.why as string}</span>
                                                    )}
                                                    {attempt?.recordingUrl && <Mic className="h-3 w-3 text-muted-foreground" />}
                                                    {(attempt?.transcript?.length || attempt?.callTranscriptText) && <FileText className="h-3 w-3 text-muted-foreground" />}
                                                </>
                                            ) : (
                                                <p className="text-sm">{activity.description || activity.title}</p>
                                            )}
                                        </div>
                                        {/* For calls: show note if present */}
                                        {isCall && activity.description && (
                                            <p className="text-xs text-muted-foreground italic mt-0.5">{activity.description}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">{timeSince(activity.createdAt)}</p>
                                    </div>
                                    {isCall && attempt && (
                                        <div className="shrink-0 self-center">
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
                {!loading && activities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No interactions yet</p>
                )}
            </CardContent>
        </Card>
    )
}

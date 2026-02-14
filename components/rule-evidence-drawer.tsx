"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    X,
    ExternalLink,
    FileAudio,
    FileText,
    Calendar,
    Quote,
} from "lucide-react"

// ─── Types ───

interface EvidenceRow {
    id: string
    attemptId: string
    callSessionId: string | null
    snippetText: string | null
    timestampStart: number | null
    timestampEnd: number | null
    createdAt: string
    // Joined from v_calls_with_artifacts
    recordingUrl: string | null
    transcriptText: string | null
    leadName: string | null
    callDate: string | null
}

interface Props {
    ruleId: string
    ruleSummary: string
    onClose: () => void
}

// ─── Component ───

export function RuleEvidenceDrawer({ ruleId, ruleSummary, onClose }: Props) {
    const projectId = useProjectId()
    const [evidence, setEvidence] = useState<EvidenceRow[]>([])
    const [loading, setLoading] = useState(true)

    const fetchEvidence = useCallback(async () => {
        if (!projectId || !ruleId) return
        setLoading(true)
        const supabase = getSupabase()

        // First get evidence rows
        const { data: evRows } = await supabase
            .from("playbook_evidence")
            .select("*")
            .eq("rule_id", ruleId)
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })

        if (!evRows || evRows.length === 0) {
            setEvidence([])
            setLoading(false)
            return
        }

        // Enrich with call data
        const attemptIds = evRows.map((e: Record<string, unknown>) => e.attempt_id as string).filter(Boolean)
        const { data: callData } = attemptIds.length > 0
            ? await supabase
                .from("v_calls_with_artifacts")
                .select("attempt_id, recording_url, transcript_text, lead_name, dialed_at")
                .in("attempt_id", attemptIds)
            : { data: [] }

        const callMap = new Map<string, Record<string, unknown>>()
        for (const c of (callData ?? []) as Record<string, unknown>[]) {
            callMap.set(c.attempt_id as string, c)
        }

        setEvidence(
            (evRows as Record<string, unknown>[]).map((e) => {
                const call = callMap.get(e.attempt_id as string)
                return {
                    id: e.id as string,
                    attemptId: e.attempt_id as string,
                    callSessionId: (e.call_session_id ?? null) as string | null,
                    snippetText: (e.snippet_text ?? null) as string | null,
                    timestampStart: (e.timestamp_start ?? null) as number | null,
                    timestampEnd: (e.timestamp_end ?? null) as number | null,
                    createdAt: e.created_at as string,
                    recordingUrl: (call?.recording_url ?? null) as string | null,
                    transcriptText: (call?.transcript_text ?? null) as string | null,
                    leadName: (call?.lead_name ?? null) as string | null,
                    callDate: (call?.dialed_at ?? null) as string | null,
                }
            }),
        )
        setLoading(false)
    }, [projectId, ruleId])

    useEffect(() => {
        fetchEvidence()
    }, [fetchEvidence])

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30" />
            <div
                className="relative w-full max-w-md bg-white shadow-xl flex flex-col animate-in slide-in-from-right-full duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h3 className="font-semibold text-sm">Evidence Trail</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {ruleSummary}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1 p-4">
                    {loading ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Loading evidence…</p>
                    ) : evidence.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No evidence linked to this rule yet.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {evidence.map((ev) => (
                                <div key={ev.id} className="p-3 rounded-lg border bg-gray-50/50 space-y-2">
                                    {/* Call info */}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {ev.callDate
                                            ? new Date(ev.callDate).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })
                                            : "Unknown date"}
                                        {ev.leadName && (
                                            <>
                                                <span className="text-muted-foreground">·</span>
                                                <span className="font-medium text-foreground">{ev.leadName}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Snippet */}
                                    {ev.snippetText && (
                                        <div className="flex items-start gap-2 p-2 rounded bg-white border text-xs">
                                            <Quote className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                                            <p className="text-foreground">{ev.snippetText}</p>
                                        </div>
                                    )}

                                    {/* Artifacts */}
                                    <div className="flex gap-2">
                                        {ev.recordingUrl && (
                                            <a
                                                href={ev.recordingUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                            >
                                                <FileAudio className="h-3.5 w-3.5" />
                                                Recording
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                        {ev.transcriptText && (
                                            <Badge variant="outline" className="text-[10px] gap-1">
                                                <FileText className="h-3 w-3" />
                                                Transcript available
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    {ev.timestampStart != null && (
                                        <p className="text-[10px] text-muted-foreground">
                                            Timestamp: {Math.floor(ev.timestampStart / 60)}:{String(Math.floor(ev.timestampStart % 60)).padStart(2, "0")}
                                            {ev.timestampEnd != null && ` – ${Math.floor(ev.timestampEnd / 60)}:${String(Math.floor(ev.timestampEnd % 60)).padStart(2, "0")}`}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="p-4 border-t text-center">
                    <p className="text-xs text-muted-foreground">
                        {evidence.length} evidence item{evidence.length !== 1 ? "s" : ""} linked
                    </p>
                </div>
            </div>
        </div>
    )
}

"use client"

import { Lead, Attempt } from "@/lib/store"
import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, FileText } from "lucide-react"
import { getOutcomeColor } from "@/components/leads-table"
import { timeSince } from "@/lib/utils"

interface LastAttemptProps {
    lead: Lead
}

export function LastAttemptWidget({ lead }: LastAttemptProps) {
    const [lastAttempt, setLastAttempt] = useState<Attempt | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        const fetchLastAttempt = async () => {
            const supabase = getSupabase()
            const { data } = await supabase
                .from("attempts")
                .select("*")
                .eq("lead_id", lead.id)
                .order("timestamp", { ascending: false })
                .limit(1)
                .single()

            if (mounted) {
                if (data) {
                    setLastAttempt({
                        id: data.id,
                        leadId: data.lead_id,
                        timestamp: data.timestamp,
                        outcome: data.outcome,
                        note: data.note,
                        dmReached: data.dm_reached,
                        nextAction: data.next_action,
                        durationSec: data.call_duration_ms ? Math.floor(data.call_duration_ms / 1000) : 0,
                        transcript: data.transcript,
                        createdAt: data.created_at,
                        callTranscriptText: data.call_transcript_text
                    })
                }
                setLoading(false)
            }
        }
        fetchLastAttempt()
        return () => { mounted = false }
    }, [lead.id])

    if (loading) return null

    if (!lastAttempt) {
        return (
            <Card className="bg-muted/30">
                <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground text-center">No attempts yet</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Attempt</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center mb-2">
                    <Badge className={getOutcomeColor(lastAttempt.outcome)} variant="secondary">{lastAttempt.outcome}</Badge>
                    <span className="text-xs text-muted-foreground">{timeSince(lastAttempt.timestamp)}</span>
                </div>
                {lastAttempt.note && <p className="text-sm text-muted-foreground italic mb-2">"{lastAttempt.note}"</p>}
                <div className="flex items-center gap-4 text-xs">
                    {lastAttempt.dmReached && <span className="flex items-center gap-1 text-green-600"><Check className="h-3 w-3" /> DM Reached</span>}
                    {lastAttempt.nextAction && <span>Next: {lastAttempt.nextAction}</span>}
                    {(lastAttempt.transcript?.length || lastAttempt.callTranscriptText) && <FileText className="h-4 w-4 text-muted-foreground" />}
                </div>
            </CardContent>
        </Card>
    )
}

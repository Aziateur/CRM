import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

/**
 * OpenPhone Webhook Handler
 *
 * Handles call events from OpenPhone to update call_sessions
 * with openphone_call_id, duration, recording URL, and transcript.
 *
 * Matching strategy (in order):
 *   1. Exact match on openphone_call_id (for re-deliveries)
 *   2. Match by phone number (to/from) + recent time window (last 5 min)
 *      — this is how initial call.completed events get linked
 *
 * Once matched, the call_session gets its openphone_call_id set,
 * which enables v_calls_with_artifacts to pull recordings/transcripts
 * from webhook_events via that same ID.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface OpenPhoneCallEvent {
    type: string
    data: {
        object?: {
            id: string
            direction: string
            from: string
            to: string
            status: string
            duration?: number
            media?: { url: string }[]
            dialogue?: { identifier?: string; userId?: string; content: string; start: number }[]
            createdAt: string
            completedAt?: string
            phoneNumber?: { phoneNumber: string }
        }
        // Flat structure fallback
        id?: string
        direction?: string
        from?: string
        to?: string
        status?: string
        duration?: number
        recordingUrl?: string
        transcription?: { text: string }
        createdAt?: string
        completedAt?: string
    }
}

function normalizeE164(phone: string): string {
    return phone.replace(/[^+\d]/g, "")
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as OpenPhoneCallEvent

        // Accept multiple event types
        const eventType = body.type
        const isCallEvent = eventType?.startsWith("call.")
        if (!isCallEvent) {
            return NextResponse.json({ status: "ignored", reason: `not a call event: ${eventType}` })
        }

        // Normalize data — OpenPhone sends nested or flat structure
        const nested = body.data?.object
        const flat = body.data
        const callId = nested?.id ?? flat?.id
        const from = nested?.from ?? flat?.from
        const to = nested?.to ?? flat?.to
        const duration = nested?.duration ?? flat?.duration
        const recordingUrl = nested?.media?.[0]?.url ?? flat?.recordingUrl
        const transcriptText = flat?.transcription?.text ?? (
            nested?.dialogue
                ? nested.dialogue.map(d => `${d.identifier ?? d.userId ?? "Unknown"}: ${d.content}`).join("\n")
                : null
        )
        const createdAt = nested?.createdAt ?? flat?.createdAt

        if (!callId) {
            return NextResponse.json({ error: "Missing call ID" }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Also store in webhook_events for the view-based extraction
        // The view extracts openphone_call_id from payload JSONB, not a column
        await supabase.from("webhook_events").insert([{
            event_type: eventType,
            payload: { body: { data: body.data } },
        }]).then(() => { }) // fire and forget, don't block

        // ── Strategy 1: Find by openphone_call_id ──
        type SessionRow = { id: string; openphone_call_id: string | null; duration_sec: number | null; recording_url: string | null }
        let session: SessionRow | null = null
        {
            const { data } = await supabase
                .from("call_sessions")
                .select("id, openphone_call_id, duration_sec, recording_url")
                .eq("openphone_call_id", callId)
                .single()
            if (data) session = data as SessionRow
        }

        // ── Strategy 2: Match by phone number + recent time window ──
        if (!session && (from || to)) {
            const phones = [from, to].filter(Boolean).map(p => normalizeE164(p!))
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

            for (const phone of phones) {
                const { data: match } = await supabase
                    .from("call_sessions")
                    .select("id, openphone_call_id, duration_sec, recording_url")
                    .eq("phone_e164", phone)
                    .is("openphone_call_id", null)
                    .gte("started_at", fiveMinAgo)
                    .order("started_at", { ascending: false })
                    .limit(1)
                    .single()

                if (match) {
                    session = match as SessionRow
                    break
                }
            }

            // Fallback: wider window (30 min) for delayed webhooks
            if (!session) {
                const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
                for (const phone of phones) {
                    const { data: match } = await supabase
                        .from("call_sessions")
                        .select("id, openphone_call_id, duration_sec, recording_url")
                        .eq("phone_e164", phone)
                        .is("openphone_call_id", null)
                        .gte("started_at", thirtyMinAgo)
                        .order("started_at", { ascending: false })
                        .limit(1)
                        .single()

                    if (match) {
                        session = match as SessionRow
                        break
                    }
                }
            }
        }

        if (!session) {
            return NextResponse.json({ status: "no_match", callId })
        }

        // Only process call.completed for duration/recording/transcript updates
        if (eventType === "call.completed") {
            // Idempotency: skip if already has duration
            if (session.duration_sec && session.duration_sec > 0 && session.openphone_call_id) {
                return NextResponse.json({ status: "already_processed", sessionId: session.id })
            }

            const { error } = await supabase
                .from("call_sessions")
                .update({
                    openphone_call_id: callId,
                    duration_sec: duration || 0,
                    recording_url: recordingUrl || session.recording_url || null,
                    transcript_text: transcriptText || null,
                    status: "completed",
                })
                .eq("id", session.id)

            if (error) {
                console.error("[webhook] Update failed:", error.message)
                return NextResponse.json({ error: "Update failed" }, { status: 500 })
            }

            return NextResponse.json({ status: "updated", sessionId: session.id })
        }

        // For recording.completed or transcript.completed — just link the openphone_call_id
        if (eventType === "call.recording.completed" || eventType === "call.transcript.completed") {
            const updatePayload: Record<string, unknown> = {
                openphone_call_id: callId,
            }
            if (recordingUrl) updatePayload.recording_url = recordingUrl
            if (transcriptText) updatePayload.transcript_text = transcriptText

            await supabase
                .from("call_sessions")
                .update(updatePayload)
                .eq("id", session.id)

            return NextResponse.json({ status: "linked", sessionId: session.id, eventType })
        }

        // For other call events, just set the openphone_call_id if not already set
        if (!session.openphone_call_id) {
            await supabase
                .from("call_sessions")
                .update({ openphone_call_id: callId })
                .eq("id", session.id)
        }

        return NextResponse.json({ status: "linked", sessionId: session.id })
    } catch (err) {
        console.error("[webhook] Processing error:", err)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

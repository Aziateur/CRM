import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

/**
 * OpenPhone Webhook Handler
 * 
 * Handles call.completed events from OpenPhone to update call_sessions
 * with duration, recording URL, and transcript.
 * 
 * Idempotency: Uses openphone_call_id as a natural idempotency key.
 * If a call_session already has duration/recording data, updates are skipped.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface OpenPhoneCallEvent {
    type: string
    data: {
        id: string // OpenPhone call ID
        direction: string
        from: string
        to: string
        status: string
        duration?: number // seconds
        recordingUrl?: string
        transcription?: {
            text: string
        }
        createdAt: string
        completedAt?: string
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as OpenPhoneCallEvent

        // Only process call.completed events
        if (body.type !== "call.completed") {
            return NextResponse.json({ status: "ignored", reason: "not call.completed" })
        }

        const callData = body.data
        if (!callData?.id) {
            return NextResponse.json({ error: "Missing call ID" }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Find matching call_session by openphone_call_id
        const { data: session } = await supabase
            .from("call_sessions")
            .select("id, duration_sec, recording_url")
            .eq("openphone_call_id", callData.id)
            .single()

        if (!session) {
            // No matching session — might be a call not initiated through our app
            return NextResponse.json({ status: "no_match", callId: callData.id })
        }

        // Idempotency check — if already has duration, skip
        if (session.duration_sec && session.duration_sec > 0) {
            return NextResponse.json({ status: "already_processed", sessionId: session.id })
        }

        // Update session with webhook data
        const { error } = await supabase
            .from("call_sessions")
            .update({
                duration_sec: callData.duration || 0,
                recording_url: callData.recordingUrl || null,
                transcript: callData.transcription?.text || null,
                status: "completed",
            })
            .eq("id", session.id)

        if (error) {
            console.error("[webhook] Update failed:", error.message)
            return NextResponse.json({ error: "Update failed" }, { status: 500 })
        }

        return NextResponse.json({ status: "updated", sessionId: session.id })
    } catch (err) {
        console.error("[webhook] Processing error:", err)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

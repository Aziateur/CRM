import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// Types for OpenPhone webhook events
interface OpenPhoneWebhookEvent {
  id: string
  type: string
  data: {
    object: CallEventData | RecordingEventData | TranscriptEventData | SummaryEventData
  }
  createdAt: string
}

interface CallEventData {
  id: string
  direction: "inbound" | "outbound"
  status: "completed" | "missed" | "voicemail"
  from: string
  to: string
  phoneNumberId: string
  answeredAt?: string
  completedAt?: string
  duration?: number // in seconds
  participants?: { phoneNumber: string; name?: string }[]
}

interface RecordingEventData {
  id: string
  callId: string
  url: string
  duration: number
  status: "completed" | "processing" | "failed"
}

interface TranscriptEventData {
  id: string
  callId: string
  status: "completed" | "processing" | "failed"
  segments?: {
    speaker: string
    start: number
    end: number
    text: string
  }[]
}

interface SummaryEventData {
  id: string
  callId: string
  summary: string
  nextSteps?: string[]
}

// Verify OpenPhone webhook signature
function verifySignature(payload: string, signature: string, signingKey: string): boolean {
  try {
    // Header format: <scheme>;<version>;<timestamp>;<signature>
    const parts = signature.split(";")
    if (parts.length !== 4) return false
    
    const [scheme, version, timestamp, sig] = parts
    if (scheme !== "v1" && scheme !== "openphone") return false
    
    // Signed data: timestamp + "." + raw JSON payload
    const signedData = `${timestamp}.${payload}`
    
    // Decode base64 signing key and compute HMAC-SHA256
    const key = Buffer.from(signingKey, "base64")
    const expectedSig = crypto
      .createHmac("sha256", key)
      .update(signedData)
      .digest("base64")
    
    return crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expectedSig)
    )
  } catch {
    return false
  }
}

// In-memory store for demo (in production, use a real database)
const pendingAttempts: Map<string, { leadId: string; dialedNumber: string; startedAt: string }> = new Map()
const processedCalls: Map<string, { attemptId: string; leadId: string }> = new Map()

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get("openphone-signature")
    
    // Get signing secret from environment
    const signingSecret = process.env.OPENPHONE_WEBHOOK_SIGNING_SECRET
    
    // Verify signature if we have a signing secret
    if (signingSecret && signature) {
      const isValid = verifySignature(payload, signature, signingSecret)
      if (!isValid) {
        console.error("[v0] Invalid webhook signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }
    
    const event: OpenPhoneWebhookEvent = JSON.parse(payload)
    console.log(`[v0] OpenPhone webhook received: ${event.type}`, event.id)
    
    // Process event based on type
    switch (event.type) {
      case "call.completed":
        await handleCallCompleted(event.data.object as CallEventData)
        break
      case "call.recording.completed":
        await handleRecordingCompleted(event.data.object as RecordingEventData)
        break
      case "call.transcript.completed":
        await handleTranscriptCompleted(event.data.object as TranscriptEventData)
        break
      case "call.summary.completed":
        await handleSummaryCompleted(event.data.object as SummaryEventData)
        break
      default:
        console.log(`[v0] Unhandled webhook event type: ${event.type}`)
    }
    
    // Always respond 2xx quickly
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Webhook processing error:", error)
    // Still return 200 to acknowledge receipt
    return NextResponse.json({ received: true, error: "Processing error" })
  }
}

async function handleCallCompleted(data: CallEventData) {
  console.log(`[v0] Processing call.completed: ${data.id}`)
  
  // Find matching pending attempt by dialed number and recent time
  const participantNumber = data.direction === "outbound" ? data.to : data.from
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  
  let matchedPendingAttempt: { leadId: string; dialedNumber: string; startedAt: string } | undefined
  let pendingKey: string | undefined
  
  for (const [key, pending] of pendingAttempts.entries()) {
    if (
      pending.dialedNumber === participantNumber &&
      pending.startedAt >= thirtyMinutesAgo
    ) {
      matchedPendingAttempt = pending
      pendingKey = key
      break
    }
  }
  
  if (matchedPendingAttempt && pendingKey) {
    // Update the pending attempt with call data
    processedCalls.set(data.id, {
      attemptId: pendingKey,
      leadId: matchedPendingAttempt.leadId,
    })
    pendingAttempts.delete(pendingKey)
    console.log(`[v0] Matched pending attempt ${pendingKey} with call ${data.id}`)
  } else {
    // Create new attempt record - would look up lead by phone number in production
    console.log(`[v0] No matching pending attempt found for call ${data.id}`)
  }
  
  // Store call metadata for later UI consumption
  // In production, this would update a database record
}

async function handleRecordingCompleted(data: RecordingEventData) {
  console.log(`[v0] Processing recording.completed for call: ${data.callId}`)
  const callInfo = processedCalls.get(data.callId)
  if (callInfo) {
    console.log(`[v0] Updating attempt ${callInfo.attemptId} with recording URL`)
    // In production: update attempt record with recording URL
  }
}

async function handleTranscriptCompleted(data: TranscriptEventData) {
  console.log(`[v0] Processing transcript.completed for call: ${data.callId}`)
  const callInfo = processedCalls.get(data.callId)
  if (callInfo) {
    console.log(`[v0] Updating attempt ${callInfo.attemptId} with transcript`)
    // In production: update attempt record with transcript segments
  }
}

async function handleSummaryCompleted(data: SummaryEventData) {
  console.log(`[v0] Processing summary.completed for call: ${data.callId}`)
  const callInfo = processedCalls.get(data.callId)
  if (callInfo) {
    console.log(`[v0] Updating attempt ${callInfo.attemptId} with summary`)
    // In production: update attempt record with call summary
  }
}

// Export for pending attempt registration (called from click-to-call)
export function registerPendingAttempt(id: string, leadId: string, dialedNumber: string) {
  pendingAttempts.set(id, {
    leadId,
    dialedNumber,
    startedAt: new Date().toISOString(),
  })
}

import { NextRequest, NextResponse } from "next/server"

export const runtime = 'edge'

const OPENPHONE_API_BASE = "https://api.openphone.com/v1"

// Test API key by calling a lightweight endpoint
export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENPHONE_API_KEY
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenPhone API key not configured" },
      { status: 400 }
    )
  }
  
  try {
    // Test by fetching phone numbers (lightweight call)
    const response = await fetch(`${OPENPHONE_API_BASE}/phone-numbers`, {
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] OpenPhone API test failed:", error)
      return NextResponse.json(
        { error: "API key validation failed", details: error },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json({
      success: true,
      phoneNumbers: data.data?.map((pn: { id: string; phoneNumber: string; name: string }) => ({
        id: pn.id,
        phoneNumber: pn.phoneNumber,
        name: pn.name,
      })),
    })
  } catch (error) {
    console.error("[v0] OpenPhone API test error:", error)
    return NextResponse.json(
      { error: "Failed to connect to OpenPhone API" },
      { status: 500 }
    )
  }
}

// Import calls for a specific phone number (backfill)
export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENPHONE_API_KEY
  const phoneNumberId = process.env.OPENPHONE_PHONE_NUMBER_ID
  
  if (!apiKey || !phoneNumberId) {
    return NextResponse.json(
      { error: "OpenPhone integration not fully configured" },
      { status: 400 }
    )
  }
  
  try {
    const body = await request.json()
    const { leadPhoneNumber, daysBack = 7 } = body
    
    if (!leadPhoneNumber) {
      return NextResponse.json(
        { error: "leadPhoneNumber is required" },
        { status: 400 }
      )
    }
    
    const createdAfter = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
    
    // Fetch calls from OpenPhone API
    const callsUrl = new URL(`${OPENPHONE_API_BASE}/calls`)
    callsUrl.searchParams.set("phoneNumberId", phoneNumberId)
    callsUrl.searchParams.set("participants", leadPhoneNumber)
    callsUrl.searchParams.set("createdAfter", createdAfter)
    
    const callsResponse = await fetch(callsUrl.toString(), {
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
    })
    
    if (!callsResponse.ok) {
      const error = await callsResponse.text()
      console.error("[v0] Failed to fetch calls:", error)
      return NextResponse.json(
        { error: "Failed to fetch calls from OpenPhone" },
        { status: callsResponse.status }
      )
    }
    
    const callsData = await callsResponse.json()
    const calls = callsData.data || []
    
    // For each call, fetch recordings and transcripts
    const enrichedCalls = await Promise.all(
      calls.map(async (call: { id: string; direction: string; from: string; to: string; answeredAt?: string; completedAt?: string; duration?: number }) => {
        const callId = call.id
        
        // Fetch recording
        let recordingUrl: string | undefined
        try {
          const recResponse = await fetch(`${OPENPHONE_API_BASE}/call-recordings/${callId}`, {
            headers: { Authorization: apiKey },
          })
          if (recResponse.ok) {
            const recData = await recResponse.json()
            recordingUrl = recData.data?.url
          }
        } catch {
          console.log(`[v0] No recording for call ${callId}`)
        }
        
        // Fetch transcript
        let transcript: { speaker: string; start: number; end: number; text: string }[] | undefined
        try {
          const transResponse = await fetch(`${OPENPHONE_API_BASE}/call-transcripts/${callId}`, {
            headers: { Authorization: apiKey },
          })
          if (transResponse.ok) {
            const transData = await transResponse.json()
            transcript = transData.data?.segments
          }
        } catch {
          console.log(`[v0] No transcript for call ${callId}`)
        }
        
        return {
          callId,
          direction: call.direction,
          from: call.from,
          to: call.to,
          answeredAt: call.answeredAt,
          completedAt: call.completedAt,
          duration: call.duration,
          recordingUrl,
          transcript,
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      callsImported: enrichedCalls.length,
      calls: enrichedCalls,
    })
  } catch (error) {
    console.error("[v0] Import calls error:", error)
    return NextResponse.json(
      { error: "Failed to import calls" },
      { status: 500 }
    )
  }
}

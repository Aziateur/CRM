export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";

async function verifySignature(
  payload: string,
  signature: string,
  signingKey: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = Uint8Array.from(atob(signingKey), c => c.charCodeAt(0));
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
    
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-openphone-signature") || "";
    const signingKey = process.env.OPENPHONE_WEBHOOK_SECRET || "";
    
    const body = await request.text();
    
    if (signingKey && signature) {
      const isValid = await verifySignature(body, signature, signingKey);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }
    
    const data = JSON.parse(body);
    
    // Process webhook data here
    console.log("OpenPhone webhook received:", data.type);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "OpenPhone webhook endpoint active" });
}

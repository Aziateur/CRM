"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { Topbar } from "@/components/topbar"
import { FieldEditor } from "@/components/field-editor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react"

interface DiagCheck {
  status: "pending" | "success" | "error"
  details?: Record<string, string>
  message?: string
  mode?: string
}

function StatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 className="h-5 w-5 text-green-500" />
  if (status === "error") return <XCircle className="h-5 w-5 text-red-500" />
  return <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
}

function SystemDiagnostics() {
  const [checks, setChecks] = useState<Record<string, DiagCheck>>({
    env: { status: "pending", details: {} },
    supabase: { status: "pending", message: "" },
    browser: { status: "pending", details: {} },
  })

  const runDiagnostics = async () => {
    setChecks({
      env: { status: "pending", details: {} },
      supabase: { status: "pending", message: "" },
      browser: { status: "pending", details: {} },
    })

    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
    const envStatus = envVars.NEXT_PUBLIC_SUPABASE_URL && envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "success" : "error"

    let sbStatus: "success" | "error" = "error"
    let sbMessage = ""
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("leads").select("count").limit(1)
      if (error) {
        sbMessage = `Error ${error.code}: ${error.message}`
      } else {
        sbStatus = "success"
        sbMessage = "Connected successfully"
      }
    } catch (e) {
      sbMessage = `Client Init Failed: ${e instanceof Error ? e.message : "Unknown error"}`
    }

    setChecks({
      env: {
        status: envStatus as "success" | "error",
        details: {
          url: envVars.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "MISSING",
          key: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "MISSING",
        },
      },
      supabase: { status: sbStatus, message: sbMessage },
      browser: {
        status: "success",
        details: {
          online: navigator.onLine ? "Yes" : "No",
          cookies: navigator.cookieEnabled ? "Enabled" : "Disabled",
        },
      },
    })
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">System Diagnostics</CardTitle>
          <Button onClick={runDiagnostics} variant="outline" size="sm">
            <RefreshCw className="mr-1 h-3 w-3" /> Re-run
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <p className="text-sm font-medium">Environment Variables</p>
            <p className="text-xs text-muted-foreground">
              Supabase URL: {checks.env.details?.url} &middot; Anon Key: {checks.env.details?.key}
            </p>
          </div>
          <StatusIcon status={checks.env.status} />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <p className="text-sm font-medium">Supabase Connection</p>
            <p className="text-xs text-muted-foreground">{checks.supabase.message || "Checking..."}</p>
          </div>
          <StatusIcon status={checks.supabase.status} />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <p className="text-sm font-medium">Browser</p>
            <p className="text-xs text-muted-foreground">
              Online: {checks.browser.details?.online ?? "..."} &middot; Cookies: {checks.browser.details?.cookies ?? "..."}
            </p>
          </div>
          <StatusIcon status={checks.browser.status} />
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Settings" />

      <div className="flex-1 p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Custom fields, diagnostics, and configuration</p>
        </div>

        <div className="space-y-6">
          <FieldEditor />
          <SystemDiagnostics />
        </div>
      </div>
    </div>
  )
}

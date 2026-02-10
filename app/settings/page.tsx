"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { Topbar } from "@/components/topbar"
import { FieldEditor } from "@/components/field-editor"
import { PipelineEditor } from "@/components/pipeline-editor"
import { LeadImport } from "@/components/lead-import"
import { useLeads } from "@/hooks/use-leads"
import { useAttempts } from "@/hooks/use-attempts"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import { exportLeadsCSV, exportAttemptsCSV } from "@/lib/csv"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, RefreshCw, Download, Upload } from "lucide-react"

interface DiagCheck {
  status: "pending" | "success" | "error"
  details?: Record<string, string>
  message?: string
}

function StatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === "error") return <XCircle className="h-4 w-4 text-red-500" />
  return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">System Diagnostics</h3>
        <Button onClick={runDiagnostics} variant="ghost" size="sm" className="h-8">
          <RefreshCw className="mr-1 h-3 w-3" /> Re-run
        </Button>
      </div>
      <div className="border rounded-lg divide-y">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">Environment Variables</p>
            <p className="text-xs text-muted-foreground">
              Supabase URL: {checks.env.details?.url} &middot; Anon Key: {checks.env.details?.key}
            </p>
          </div>
          <StatusIcon status={checks.env.status} />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">Supabase Connection</p>
            <p className="text-xs text-muted-foreground">{checks.supabase.message || "Checking..."}</p>
          </div>
          <StatusIcon status={checks.supabase.status} />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">Browser</p>
            <p className="text-xs text-muted-foreground">
              Online: {checks.browser.details?.online ?? "..."} &middot; Cookies: {checks.browser.details?.cookies ?? "..."}
            </p>
          </div>
          <StatusIcon status={checks.browser.status} />
        </div>
      </div>
    </div>
  )
}

function DataManagement() {
  const { toast } = useToast()
  const { leads, setLeads } = useLeads()
  const { attempts } = useAttempts()
  const { fields: fieldDefinitions } = useFieldDefinitions("lead")

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Data Management</h3>
      <div className="border rounded-lg divide-y">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">Import Leads</p>
            <p className="text-xs text-muted-foreground">Upload a CSV file to bulk-import leads</p>
          </div>
          <LeadImport
            fieldDefinitions={fieldDefinitions}
            onImported={(imported) => {
              setLeads((prev) => [...imported, ...prev])
              toast({ title: `${imported.length} leads imported` })
            }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">Export Leads</p>
            <p className="text-xs text-muted-foreground">{leads.length} leads as CSV</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportLeadsCSV(leads, attempts, fieldDefinitions)
              toast({ title: `Exported ${leads.length} leads` })
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">Export Call History</p>
            <p className="text-xs text-muted-foreground">{attempts.length} call attempts as CSV</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportAttemptsCSV(attempts, leads)
              toast({ title: `Exported ${attempts.length} call records` })
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Settings" />

      <div className="flex-1 p-6 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Pipeline, custom fields, data management, and system configuration</p>
        </div>

        <div className="space-y-10">
          <PipelineEditor />
          <FieldEditor />
          <DataManagement />
          <SystemDiagnostics />
        </div>
      </div>
    </div>
  )
}

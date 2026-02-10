"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { Topbar } from "@/components/topbar"
import { FieldEditor } from "@/components/field-editor"
import { PipelineEditor } from "@/components/pipeline-editor"
import { LeadImport } from "@/components/lead-import"
import { TagManager } from "@/components/tag-manager"
import { TemplateManager } from "@/components/template-manager"
import { DuplicateDetector } from "@/components/duplicate-detector"
import { WorkflowEditor } from "@/components/workflow-editor"
import { SequenceManager } from "@/components/sequence-editor"
import { useLeads } from "@/hooks/use-leads"
import { useAttempts } from "@/hooks/use-attempts"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import { exportLeadsCSV, exportAttemptsCSV } from "@/lib/csv"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, XCircle, RefreshCw, Download, Phone, ExternalLink, Database, Cloud } from "lucide-react"

// ============================================================================
// TAB 1 — PIPELINE (sub-components inline: PipelineEditor, FieldEditor, TagManager)
// ============================================================================

function PipelineTab() {
  return (
    <div className="space-y-10">
      <PipelineEditor />
      <FieldEditor />
      <TagManager />
    </div>
  )
}

// ============================================================================
// TAB 2 — AUTOMATION (Templates + Workflows)
// ============================================================================

function AutomationTab() {
  return (
    <div className="space-y-10">
      <TemplateManager />
      <WorkflowEditor />
    </div>
  )
}

// ============================================================================
// TAB 3 — DATA (Import/Export + Duplicates)
// ============================================================================

function DataTab() {
  const { toast } = useToast()
  const { leads, setLeads, refetch } = useLeads()
  const { attempts } = useAttempts()
  const { fields: fieldDefinitions } = useFieldDefinitions("lead")

  return (
    <div className="space-y-10">
      {/* Import / Export */}
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

      {/* Duplicate Detection */}
      <DuplicateDetector leads={leads} onLeadsChanged={refetch} />
    </div>
  )
}

// ============================================================================
// TAB 4 — SEQUENCES
// ============================================================================

function SequencesTab() {
  return <SequenceManager />
}

// ============================================================================
// TAB 5 — SYSTEM (Diagnostics + Dev Tools / Integrations)
// ============================================================================

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

function SystemTab() {
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

  const webhookUrl = "https://ali-auto-cyberbellum.app.n8n.cloud/webhook/openphone"

  return (
    <div className="space-y-10">
      {/* Diagnostics */}
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

      {/* Integrations (from Dev Tools) */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Integrations</h3>

        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>How integrations work</AlertTitle>
          <AlertDescription>
            This is a static SPA — there are no API routes. OpenPhone sends webhooks to n8n,
            which writes to Supabase. The frontend reads from Supabase.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4" />
              OpenPhone
            </CardTitle>
            <CardDescription>
              VoIP provider — calls, recordings, and transcripts flow through n8n webhooks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-700 border-green-300">Active</Badge>
              <span className="text-sm text-muted-foreground">Webhooks configured in OpenPhone dashboard</span>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Events:</span> call.completed, call.recording.completed, call.transcript.completed</p>
              <p>
                <span className="font-medium">Webhook URL:</span>{" "}
                <code className="bg-muted px-2 py-0.5 rounded text-xs">{webhookUrl}</code>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage in{" "}
              <a
                href="https://app.openphone.com/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                OpenPhone Settings <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              n8n Workflow Automation
            </CardTitle>
            <CardDescription>
              Processes OpenPhone webhooks and writes to Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-700 border-green-300">Active</Badge>
              <span className="text-sm text-muted-foreground">1 workflow running</span>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Workflow:</span> OpenPhone Call Event Processor with Database Logging</p>
              <p><span className="font-medium">Flow:</span> Webhook → Log event → Route by type → Upsert call session / Save artifacts</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage at{" "}
              <a
                href="https://ali-auto-cyberbellum.app.n8n.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                n8n Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Supabase (PostgreSQL)
            </CardTitle>
            <CardDescription>
              Database for leads, attempts, call sessions, and webhook events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-700 border-green-300">Connected</Badge>
              <span className="text-sm text-muted-foreground">Client-side queries via anon key</span>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Key tables:</span> leads, attempts, call_sessions, webhook_events</p>
              <p><span className="font-medium">Key views:</span> v_attempts_enriched, v_calls_with_artifacts</p>
              <p><span className="font-medium">Trigger:</span> merge_call_session (deduplicates frontend + n8n rows)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="h-4 w-4" />
              Cloudflare Pages
            </CardTitle>
            <CardDescription>
              Static hosting — auto-deploys on git push.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Production:</span> crm-4z1.pages.dev (main branch)</p>
              <p><span className="font-medium">Sandbox:</span> crm-sandbox.pages.dev (sandbox branch)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN SETTINGS PAGE
// ============================================================================

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Settings" />

      <div className="flex-1 p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure your CRM pipeline, automation, data, sequences, and system</p>
        </div>

        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="sequences">Sequences</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline">
            <PipelineTab />
          </TabsContent>

          <TabsContent value="automation">
            <AutomationTab />
          </TabsContent>

          <TabsContent value="data">
            <DataTab />
          </TabsContent>

          <TabsContent value="sequences">
            <SequencesTab />
          </TabsContent>

          <TabsContent value="system">
            <SystemTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

"use client"

import { Topbar } from "@/components/topbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, ExternalLink, Database, Cloud } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FieldEditor } from "@/components/field-editor"

export default function Settings() {
  const webhookUrl = "https://ali-auto-cyberbellum.app.n8n.cloud/webhook/openphone"

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Settings" />

      <div className="flex-1 p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Integration status and configuration reference</p>
        </div>

        <div className="space-y-6">
          {/* Integration Architecture */}
          <Alert>
            <Database className="h-4 w-4" />
            <AlertTitle>How integrations work</AlertTitle>
            <AlertDescription>
              This is a static SPA — there are no API routes. OpenPhone sends webhooks to n8n,
              which writes to Supabase. The frontend reads from Supabase.
            </AlertDescription>
          </Alert>

          {/* OpenPhone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                OpenPhone
              </CardTitle>
              <CardDescription>
                VoIP provider — calls, recordings, and transcripts flow through n8n webhooks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-700 border-green-300">Active</Badge>
                <span className="text-sm text-muted-foreground">Webhooks configured in OpenPhone dashboard</span>
              </div>
              <div className="text-sm space-y-2">
                <p><span className="font-medium">Events subscribed:</span> call.completed, call.recording.completed, call.transcript.completed</p>
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

          {/* n8n */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
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

          {/* Supabase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
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

          {/* Cloudflare */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
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

          {/* Custom Fields Editor */}
          <FieldEditor />
        </div>
      </div>
    </div>
  )
}

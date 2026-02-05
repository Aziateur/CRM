"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, XCircle, RefreshCw } from "lucide-react"

export default function DiagnosisPage() {
  const [checks, setChecks] = useState<any>({
    env: { status: 'pending', details: {} },
    supabase: { status: 'pending', message: '' },
    build: { status: 'pending', mode: '' },
    browser: { status: 'pending', details: {} }
  })

  const runDiagnostics = async () => {
    // 1. Check Environment Variables
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
    const envStatus = envVars.NEXT_PUBLIC_SUPABASE_URL && envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'success' : 'error'

    // 2. Check Supabase Connection
    let sbStatus = 'pending'
    let sbMessage = ''
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.from('leads').select('count').limit(1)
      if (error) {
        sbStatus = 'error'
        sbMessage = `Error ${error.code}: ${error.message}`
      } else {
        sbStatus = 'success'
        sbMessage = 'Connected successfully'
      }
    } catch (e: any) {
      sbStatus = 'error'
      sbMessage = `Client Init Failed: ${e.message}`
    }

    // 3. Check Browser Environment
    const browserInfo = {
      userAgent: window.navigator.userAgent,
      cookiesEnabled: window.navigator.cookieEnabled,
      onLine: window.navigator.onLine
    }

    setChecks({
      env: { 
        status: envStatus, 
        details: {
          url: envVars.NEXT_PUBLIC_SUPABASE_URL ? 'Set ✅' : 'MISSING ❌',
          key: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set ✅' : 'MISSING ❌'
        }
      },
      supabase: { status: sbStatus, message: sbMessage },
      build: { status: 'success', mode: 'Static Export (Client-Side)' },
      browser: { status: 'success', details: browserInfo }
    })
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'success') return <CheckCircle2 className="h-5 w-5 text-green-500" />
    if (status === 'error') return <XCircle className="h-5 w-5 text-red-500" />
    return <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Diagnostics</h1>
        <Button onClick={runDiagnostics} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" /> Re-run
        </Button>
      </div>

      {/* Environment Variables */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Environment Variables</CardTitle>
          <StatusIcon status={checks.env.status} />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Supabase URL:</div>
            <div className="font-mono">{checks.env.details.url}</div>
            <div>Anon Key:</div>
            <div className="font-mono">{checks.env.details.key}</div>
          </div>
        </CardContent>
      </Card>

      {/* Supabase Connection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Supabase Connection</CardTitle>
          <StatusIcon status={checks.supabase.status} />
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            Result: <span className="font-mono">{checks.supabase.message}</span>
          </div>
          {checks.supabase.status === 'error' && (
            <div className="mt-2 p-2 bg-red-50 text-red-800 text-xs rounded">
              Tip: Check if RLS policies allow 'Select' for public users.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Browser Environment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Browser Environment</CardTitle>
          <StatusIcon status={checks.browser.status} />
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground font-mono break-all">
            {JSON.stringify(checks.browser.details, null, 2)}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-4">
        <Button onClick={() => window.location.href = '/'}>Back to App</Button>
      </div>
    </div>
  )
}

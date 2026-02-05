"use client"

import { useState, useMemo, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function DebugPage() {
  const [envStatus, setEnvStatus] = useState<any>({
    url: null,
    key: null,
    status: 'checking'
  })
  const [connectionStatus, setConnectionStatus] = useState<string>('pending')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check environment variables (safely)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    setEnvStatus({
      url: url ? `Present (${url.substring(0, 10)}...)` : 'Missing',
      key: key ? `Present (${key.substring(0, 10)}...)` : 'Missing',
      status: url && key ? 'ok' : 'error'
    })

    // Try connection
    const testConnection = async () => {
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase.from('leads').select('count').limit(1)
        
        if (error) {
          setConnectionStatus('failed')
          setError(JSON.stringify(error, null, 2))
        } else {
          setConnectionStatus('success')
        }
      } catch (err: any) {
        setConnectionStatus('crashed')
        setError(err.message || String(err))
      }
    }

    if (url && key) {
      testConnection()
    } else {
        setConnectionStatus('skipped')
        setError('Missing environment variables')
    }
  }, [])

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Deployment Debugger</h1>
      
      <div className="p-4 border rounded bg-slate-50">
        <h2 className="font-semibold mb-2">Environment Variables</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>URL:</div>
          <div className={envStatus.url?.includes('Missing') ? 'text-red-500' : 'text-green-600 font-mono'}>
            {envStatus.url}
          </div>
          <div>Key:</div>
          <div className={envStatus.key?.includes('Missing') ? 'text-red-500' : 'text-green-600 font-mono'}>
            {envStatus.key}
          </div>
        </div>
      </div>

      <div className="p-4 border rounded bg-slate-50">
        <h2 className="font-semibold mb-2">Connection Test</h2>
        <div className="flex items-center gap-2">
          Status: 
          <Badge variant={connectionStatus === 'success' ? 'default' : 'destructive'}>
            {connectionStatus.toUpperCase()}
          </Badge>
        </div>
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="font-mono text-xs whitespace-pre-wrap">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>Retry</Button>
        <Button variant="outline" onClick={() => window.location.href = '/'}>Go Home</Button>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Topbar } from "@/components/topbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Phone, CheckCircle2, XCircle, Loader2, ExternalLink, Download } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export default function Settings() {
  const { toast } = useToast()

  // OpenPhone integration state
  const [openPhoneApiKey, setOpenPhoneApiKey] = useState("")
  const [openPhoneNumberId, setOpenPhoneNumberId] = useState("")
  const [openPhoneSigningSecret, setOpenPhoneSigningSecret] = useState("")
  const [openPhoneStatus, setOpenPhoneStatus] = useState<"unconfigured" | "testing" | "connected" | "error">("unconfigured")
  const [openPhoneError, setOpenPhoneError] = useState<string | null>(null)
  const [openPhoneNumbers, setOpenPhoneNumbers] = useState<{ id: string; phoneNumber: string; name: string }[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; count: number } | null>(null)

  // OpenPhone handlers
  const handleTestOpenPhoneConnection = async () => {
    if (!openPhoneApiKey) {
      toast({ title: "API Key required", variant: "destructive" })
      return
    }
    
    setOpenPhoneStatus("testing")
    setOpenPhoneError(null)
    
    try {
      const response = await fetch("/api/integrations/openphone")
      const data = await response.json()
      
      if (data.success) {
        setOpenPhoneStatus("connected")
        setOpenPhoneNumbers(data.phoneNumbers || [])
        toast({ title: "Connected to OpenPhone", description: `Found ${data.phoneNumbers?.length || 0} phone numbers` })
      } else {
        setOpenPhoneStatus("error")
        setOpenPhoneError(data.error || "Connection failed")
        toast({ title: "Connection failed", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      setOpenPhoneStatus("error")
      setOpenPhoneError("Failed to connect to OpenPhone API")
      toast({ title: "Connection error", variant: "destructive" })
    }
  }

  const handleImportCalls = async () => {
    setIsImporting(true)
    setImportResult(null)
    
    try {
      const response = await fetch("/api/integrations/openphone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBack: 7 }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setImportResult({ success: true, count: data.callsImported })
        toast({ title: "Import complete", description: `Imported ${data.callsImported} calls` })
      } else {
        setImportResult({ success: false, count: 0 })
        toast({ title: "Import failed", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      setImportResult({ success: false, count: 0 })
      toast({ title: "Import error", variant: "destructive" })
    } finally {
      setIsImporting(false)
    }
  }

  const webhookUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/integrations/openphone/webhook`
    : "/api/integrations/openphone/webhook"

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Settings" />

      <div className="flex-1 p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure your OpenPhone integration</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              OpenPhone Integration
            </CardTitle>
            <CardDescription>
              Connect your OpenPhone account to automatically import call recordings and transcripts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connection Status */}
            {openPhoneStatus === "connected" && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Connected</AlertTitle>
                <AlertDescription className="text-green-700">
                  OpenPhone integration is active. Call data will sync automatically.
                </AlertDescription>
              </Alert>
            )}
            {openPhoneStatus === "error" && openPhoneError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>{openPhoneError}</AlertDescription>
              </Alert>
            )}

            {/* API Configuration */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="password"
                  placeholder="Enter your OpenPhone API key"
                  value={openPhoneApiKey}
                  onChange={(e) => setOpenPhoneApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a 
                    href="https://app.openphone.com/settings/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    OpenPhone Settings <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Phone Number ID</label>
                {openPhoneNumbers.length > 0 ? (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={openPhoneNumberId}
                    onChange={(e) => setOpenPhoneNumberId(e.target.value)}
                  >
                    <option value="">Select a phone number</option>
                    {openPhoneNumbers.map((pn) => (
                      <option key={pn.id} value={pn.id}>
                        {pn.phoneNumber} {pn.name ? `(${pn.name})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    placeholder="Test connection to load phone numbers"
                    value={openPhoneNumberId}
                    onChange={(e) => setOpenPhoneNumberId(e.target.value)}
                  />
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Webhook Signing Secret</label>
                <Input
                  type="password"
                  placeholder="Base64 signing key from webhook configuration"
                  value={openPhoneSigningSecret}
                  onChange={(e) => setOpenPhoneSigningSecret(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="bg-muted font-mono text-xs"
                  />
                  <Button 
                    variant="outline"
                    className="bg-transparent"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl)
                      toast({ title: "Copied to clipboard" })
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add this URL to your OpenPhone webhook configuration. Subscribe to: call.completed, call.recording.completed, call.transcript.completed
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleTestOpenPhoneConnection}
                  disabled={openPhoneStatus === "testing" || !openPhoneApiKey}
                >
                  {openPhoneStatus === "testing" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Import Historical Calls */}
            {openPhoneStatus === "connected" && (
              <div className="border-t pt-6 mt-6">
                <h3 className="font-medium mb-2">Import Historical Calls</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Import call recordings and transcripts from the last 7 days.
                </p>
                
                {importResult && (
                  <Alert className={importResult.success ? "border-green-200 bg-green-50 mb-4" : "mb-4"} variant={importResult.success ? "default" : "destructive"}>
                    {importResult.success ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Import Complete</AlertTitle>
                        <AlertDescription className="text-green-700">
                          Successfully imported {importResult.count} calls.
                        </AlertDescription>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Import Failed</AlertTitle>
                        <AlertDescription>
                          Could not import calls. Please try again.
                        </AlertDescription>
                      </>
                    )}
                  </Alert>
                )}
                
                <Button 
                  variant="outline" 
                  className="bg-transparent"
                  onClick={handleImportCalls}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Import Last 7 Days
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

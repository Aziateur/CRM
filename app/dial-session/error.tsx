"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { Topbar } from "@/components/topbar"

export default function DialSessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[DialSession Error]", error)
  }, [error])

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Dial Session" />
      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <h2 className="text-lg font-semibold">Dial Session Error</h2>
            <p className="text-sm text-muted-foreground">
              {error.message || "The dialer encountered an error."}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={reset}>Retry</Button>
              <Button variant="outline" onClick={() => window.location.href = "/"}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

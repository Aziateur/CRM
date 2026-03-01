import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthGate } from "@/components/auth-gate"
import { QueryProvider } from "@/components/query-provider"
import { Toaster } from "@/components/ui/toaster"
import { SequenceRunnerProvider } from "@/hooks/use-sequence-runner"
import { WorkflowRunnerProvider } from "@/hooks/use-workflow-runner"

export const metadata: Metadata = {
  title: "Dalio CRM - Sales Pipeline",
  description: "Modern Sales CRM with multi-project support",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <QueryProvider>
          <AuthGate>
            {children}
            <SequenceRunnerProvider />
            <WorkflowRunnerProvider />
          </AuthGate>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  )
}

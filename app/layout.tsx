import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthGate } from "@/components/auth-gate"
import { Toaster } from "@/components/ui/toaster"

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
        <AuthGate>{children}</AuthGate>
        <Toaster />
      </body>
    </html>
  )
}

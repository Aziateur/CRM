"use client"

import React from "react"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { LoginPage } from "@/components/login-page"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Loader2 } from "lucide-react"

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <LoginPage />
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <main className="flex-1 overflow-auto">{children}</main>
            </div>
        </SidebarProvider>
    )
}

export function AuthGate({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <AuthenticatedLayout>{children}</AuthenticatedLayout>
        </AuthProvider>
    )
}

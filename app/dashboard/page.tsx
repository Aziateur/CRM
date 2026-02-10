"use client"

import { Topbar } from "@/components/topbar"
import { useLeads } from "@/hooks/use-leads"
import { useAttempts } from "@/hooks/use-attempts"
import { usePipelineStages } from "@/hooks/use-pipeline-stages"
import { useTasks } from "@/hooks/use-tasks"
import { useDialSession } from "@/hooks/use-dial-session"
import { DashboardWidgets } from "@/components/dashboard-widgets"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const { leads, loading: leadsLoading } = useLeads()
  const { attempts, loading: attemptsLoading } = useAttempts()
  const { stages } = usePipelineStages()
  const { tasks } = useTasks()
  const { session } = useDialSession()

  const loading = leadsLoading || attemptsLoading

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Dashboard" />

      <div className="flex-1 p-6">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-40 rounded-lg" />
          </div>
        ) : (
          <DashboardWidgets
            leads={leads}
            attempts={attempts}
            stages={stages}
            tasks={tasks}
            sessionStartedAt={session?.status === "active" ? session.startedAt : null}
          />
        )}
      </div>
    </div>
  )
}

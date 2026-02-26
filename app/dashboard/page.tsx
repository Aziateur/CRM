"use client"

import { useState } from "react"
import { Topbar } from "@/components/topbar"
import { useLeads } from "@/hooks/use-leads"
import { useAttempts } from "@/hooks/use-attempts"
import { usePipelineStages } from "@/hooks/use-pipeline-stages"
import { useTasks } from "@/hooks/use-tasks"
import { DashboardWidgets } from "@/components/dashboard-widgets"
import { AnalyticsSection } from "@/components/analytics-section"
import { DashboardReviewsPanel } from "@/components/dashboard-reviews-panel"
import { DashboardDiagnosticsPanel } from "@/components/dashboard-diagnostics-panel"
import { DashboardSkillsPanel } from "@/components/dashboard-skills-panel"
import { InsightLog } from "@/components/insight-log"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, ClipboardCheck, Wrench, Target } from "lucide-react"

type DashboardPanel = "activity" | "reviews" | "diagnostics" | "skills"

const PANELS: { id: DashboardPanel; label: string; icon: React.ElementType }[] = [
  { id: "activity", label: "Activity", icon: Activity },
  { id: "reviews", label: "Reviews", icon: ClipboardCheck },
  { id: "diagnostics", label: "Diagnostics", icon: Wrench },
  { id: "skills", label: "Skills", icon: Target },
]

export default function DashboardPage() {
  const { leads, loading: leadsLoading } = useLeads()
  const { attempts, loading: attemptsLoading } = useAttempts()
  const { stages } = usePipelineStages()
  const { tasks } = useTasks()
  const [panel, setPanel] = useState<DashboardPanel>("activity")

  const loading = leadsLoading || attemptsLoading

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Dashboard" />

      <div className="flex-1 p-6 space-y-6">
        {/* Panel Tabs */}
        <div className="flex items-center gap-1 border-b pb-px">
          {PANELS.map(p => {
            const Icon = p.icon
            const active = panel === p.id
            return (
              <button
                key={p.id}
                onClick={() => setPanel(p.id)}
                className={`
                                    flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors
                                    ${active
                    ? "text-foreground border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                  }
                                `}
              >
                <Icon className="h-4 w-4" />
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Panel Content */}
        {panel === "activity" && (
          loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-40 rounded-lg" />
            </div>
          ) : (
            <>
              <DashboardWidgets
                leads={leads}
                attempts={attempts}
                stages={stages}
                tasks={tasks}
              />
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Analytics</h2>
                <AnalyticsSection attempts={attempts} />
              </div>
            </>
          )
        )}

        {panel === "reviews" && <DashboardReviewsPanel />}
        {panel === "diagnostics" && <DashboardDiagnosticsPanel />}
        {panel === "skills" && <DashboardSkillsPanel />}

        {/* Insight Log — always visible */}
        <div className="mt-8 border-t pt-6">
          <InsightLog />
        </div>
      </div>
    </div>
  )
}

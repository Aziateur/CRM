"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Play,
  RotateCcw,
  UserPlus,
  Clock,
  Flame,
  Sprout,
  Phone,
  Monitor,
  Globe,
  Beaker,
  ChevronRight,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { Topbar } from "@/components/topbar"
import type { DialMode } from "@/hooks/use-dial-modes"
import type { Experiment as ExperimentObj } from "@/queries/experiments"
import type { QueueItem } from "@/hooks/use-dial-queue"

// ─── Icon map for mode cards ───
const MODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "user-plus": UserPlus,
  "clock": Clock,
  "flame": Flame,
  "sprout": Sprout,
}

// ─── Color configs for mode cards ───
const MODE_COLORS: Record<string, {
  bg: string
  bgSelected: string
  border: string
  borderSelected: string
  iconBg: string
  iconColor: string
  countColor: string
  ring: string
}> = {
  blue: {
    bg: "bg-blue-50/40",
    bgSelected: "bg-gradient-to-br from-blue-50 to-blue-100/80",
    border: "border-blue-100",
    borderSelected: "border-blue-400",
    iconBg: "bg-blue-500",
    iconColor: "text-white",
    countColor: "text-blue-700",
    ring: "ring-blue-400/25",
  },
  amber: {
    bg: "bg-amber-50/40",
    bgSelected: "bg-gradient-to-br from-amber-50 to-amber-100/80",
    border: "border-amber-100",
    borderSelected: "border-amber-400",
    iconBg: "bg-amber-500",
    iconColor: "text-white",
    countColor: "text-amber-700",
    ring: "ring-amber-400/25",
  },
  rose: {
    bg: "bg-rose-50/40",
    bgSelected: "bg-gradient-to-br from-rose-50 to-rose-100/80",
    border: "border-rose-100",
    borderSelected: "border-rose-400",
    iconBg: "bg-rose-500",
    iconColor: "text-white",
    countColor: "text-rose-700",
    ring: "ring-rose-400/25",
  },
  emerald: {
    bg: "bg-emerald-50/40",
    bgSelected: "bg-gradient-to-br from-emerald-50 to-emerald-100/80",
    border: "border-emerald-100",
    borderSelected: "border-emerald-400",
    iconBg: "bg-emerald-500",
    iconColor: "text-white",
    countColor: "text-emerald-700",
    ring: "ring-emerald-400/25",
  },
}

interface DialModeInfo {
  id: DialMode
  label: string
  icon: string
  count: number
  description: string
  color: string
  gradient: string
}

interface PersistedSession {
  id: string
  startedAt: string
  target?: number | null
  experiment?: string | null
}

interface DialSetupScreenProps {
  modes: DialModeInfo[]
  selectedMode: DialMode | null
  onModeChange: (mode: DialMode) => void
  queue: QueueItem[]
  sessionTarget: number
  onSessionTargetChange: (target: number) => void
  dialMethod: "app" | "web"
  onDialMethodChange: (method: "app" | "web") => void
  activeExperiments: ExperimentObj[]
  selectedExperimentObj: ExperimentObj | null
  onExperimentChange: (experimentId: string) => void
  hasActiveSession: boolean
  persistedSession: PersistedSession | null
  sessionLoading: boolean
  onStartSession: () => void
  onResumeSession: () => void
  onAbandonSession: () => void
}

export function DialSetupScreen({
  modes,
  selectedMode,
  onModeChange,
  queue,
  sessionTarget,
  onSessionTargetChange,
  dialMethod,
  onDialMethodChange,
  activeExperiments,
  selectedExperimentObj,
  onExperimentChange,
  hasActiveSession,
  persistedSession,
  sessionLoading,
  onStartSession,
  onResumeSession,
  onAbandonSession,
}: DialSetupScreenProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <Topbar title="Dial Session" />

      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="w-full max-w-lg space-y-6">

          {/* ─── Resume Card ─── */}
          {hasActiveSession && persistedSession && !sessionLoading && (
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-primary/5 p-5 shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-12 translate-x-12" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                    <RotateCcw className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Resume Session?</h3>
                    <p className="text-xs text-muted-foreground">
                      Active since {new Date(persistedSession.startedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4 ml-[52px]">
                  <Badge variant="secondary" className="text-xs font-medium">
                    Target: {persistedSession.target || "—"}
                  </Badge>
                  {persistedSession.experiment && (
                    <Badge variant="outline" className="text-xs">
                      {persistedSession.experiment}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 ml-[52px]">
                  <Button size="sm" onClick={onResumeSession} className="gap-1.5 rounded-lg shadow-sm">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Resume
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAbandonSession}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Abandon
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Main Setup ─── */}
          <div className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm shadow-xl shadow-slate-200/50 overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/20">
                  <Phone className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">
                    {hasActiveSession ? "Start Fresh" : "Start Dial Session"}
                  </h2>
                  <p className="text-sm text-muted-foreground">Select a queue and configure your session</p>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {/* ─── Mode Cards Grid ─── */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                  Choose Queue
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {modes.map((mode) => {
                    const isSelected = selectedMode === mode.id
                    const Icon = MODE_ICONS[mode.icon] || UserPlus
                    const colors = MODE_COLORS[mode.color] || MODE_COLORS.blue

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => onModeChange(mode.id)}
                        className={`
                          relative p-4 rounded-xl border-2 text-left
                          transition-all duration-200 ease-out group
                          ${isSelected
                            ? `${colors.bgSelected} ${colors.borderSelected} ring-4 ${colors.ring} scale-[1.02] shadow-md`
                            : `${colors.bg} ${colors.border} hover:border-opacity-60 hover:shadow-sm hover:scale-[1.01]`
                          }
                        `}
                      >
                        {/* Icon */}
                        <div className={`
                          inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3
                          transition-transform duration-200
                          ${isSelected ? colors.iconBg : "bg-white shadow-sm border border-border/50"}
                          ${isSelected ? "" : "group-hover:scale-110"}
                        `}>
                          <Icon className={`h-4 w-4 ${isSelected ? colors.iconColor : "text-muted-foreground"}`} />
                        </div>

                        {/* Label */}
                        <p className="font-semibold text-sm mb-0.5">{mode.label}</p>

                        {/* Count */}
                        <p className={`text-2xl font-bold tabular-nums ${isSelected ? colors.countColor : "text-foreground"}`}>
                          {mode.count.toLocaleString()}
                        </p>

                        {/* Description */}
                        <p className="text-[11px] text-muted-foreground leading-snug mt-1.5 line-clamp-2">
                          {mode.description}
                        </p>

                        {/* Selected indicator */}
                        {isSelected && (
                          <div className={`absolute top-3 right-3 w-5 h-5 rounded-full ${colors.iconBg} flex items-center justify-center`}>
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ─── Queue Preview ─── */}
              {selectedMode && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/60 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-border/50 shadow-sm">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold tabular-nums">{queue.length}</span>
                      <span className="text-sm text-muted-foreground">leads queued</span>
                    </div>
                    {queue.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        First up: <span className="font-medium text-foreground">{queue[0].lead.company}</span> — {queue[0].reason}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </div>
              )}

              {/* ─── Divider ─── */}
              <div className="border-t border-border/40" />

              {/* ─── Settings Row ─── */}
              <div className="grid grid-cols-2 gap-4">
                {/* Call Target */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Call Target</Label>
                  <Select
                    value={sessionTarget.toString()}
                    onValueChange={(v) => onSessionTargetChange(parseInt(v))}
                  >
                    <SelectTrigger className="h-10 rounded-lg border-border/60 bg-white focus:ring-2 focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 calls</SelectItem>
                      <SelectItem value="20">20 calls</SelectItem>
                      <SelectItem value="50">50 calls</SelectItem>
                      <SelectItem value="100">100 calls</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dial Method */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Dialing via</Label>
                  <div className="flex gap-1.5 p-1 rounded-lg bg-slate-100/80 border border-border/40">
                    <button
                      type="button"
                      onClick={() => onDialMethodChange("app")}
                      className={`
                        flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium
                        transition-all duration-150
                        ${dialMethod === "app"
                          ? "bg-white text-foreground shadow-sm border border-border/50"
                          : "text-muted-foreground hover:text-foreground"
                        }
                      `}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => onDialMethodChange("web")}
                      className={`
                        flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium
                        transition-all duration-150
                        ${dialMethod === "web"
                          ? "bg-white text-foreground shadow-sm border border-border/50"
                          : "text-muted-foreground hover:text-foreground"
                        }
                      `}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Web
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── Experiment Selector ─── */}
              {activeExperiments.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Beaker className="h-3 w-3" />
                    Experiment
                    <span className="text-[10px] text-muted-foreground/60 font-normal">(optional)</span>
                  </Label>
                  <Select
                    value={selectedExperimentObj?.id || "none"}
                    onValueChange={onExperimentChange}
                  >
                    <SelectTrigger className="h-10 rounded-lg border-border/60 bg-white focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="No experiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No experiment</SelectItem>
                      {activeExperiments.map(exp => (
                        <SelectItem key={exp.id} value={exp.id}>
                          {exp.name} ({exp.sampleSizeTarget} target)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedExperimentObj && (
                    <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/60 text-xs space-y-1 animate-in slide-in-from-top-1 duration-200">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-purple-900">{selectedExperimentObj.hypothesis}</p>
                          <p className="text-purple-600 mt-0.5">
                            {selectedExperimentObj.variants.map(v => v.name).join(" vs ")}
                            {" · "} {selectedExperimentObj.primaryMetric.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Divider ─── */}
              <div className="border-t border-border/40" />

              {/* ─── Action Buttons ─── */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl bg-transparent border-border/60 hover:bg-slate-50 text-muted-foreground font-medium"
                  onClick={() => router.push("/")}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-200 disabled:shadow-none gap-2"
                  onClick={onStartSession}
                  disabled={!selectedMode || queue.length === 0}
                >
                  <Play className="h-4 w-4" />
                  Start Session
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5 opacity-60" />
                </Button>
              </div>
            </div>
          </div>

          {/* Dial method hint */}
          <p className="text-center text-xs text-muted-foreground/60">
            {dialMethod === "app"
              ? "Opens OpenPhone desktop app directly — no new browser tabs"
              : "Copies number to clipboard — paste in your OpenPhone browser tab"}
          </p>
        </div>
      </div>
    </div>
  )
}

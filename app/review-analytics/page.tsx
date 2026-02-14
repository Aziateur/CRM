"use client"

import { useState, useEffect, useMemo } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { Topbar } from "@/components/topbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    BarChart3,
    Tag,
    Zap,
    TrendingUp,
    Calendar,
} from "lucide-react"

// ─── Types ───

interface ReviewRow {
    id: string
    review_type: string
    tags: string[] | null
    decision_type: string | null
    evidence_verified: boolean
    created_at: string
    // Deep review scores (legacy)
    score_opening: number | null
    score_discovery: number | null
    score_control: number | null
    score_objections: number | null
    score_close: number | null
    score_next_step: number | null
}

// ─── Page ───

export default function ReviewAnalyticsPage() {
    const projectId = useProjectId()
    const [reviews, setReviews] = useState<ReviewRow[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!projectId) return
        const fetchReviews = async () => {
            const supabase = getSupabase()
            const { data } = await supabase
                .from("call_reviews")
                .select("id, review_type, tags, decision_type, evidence_verified, created_at, score_opening, score_discovery, score_control, score_objections, score_close, score_next_step")
                .eq("project_id", projectId)
                .order("created_at", { ascending: false })

            if (data) setReviews(data as ReviewRow[])
            setLoading(false)
        }
        fetchReviews()
    }, [projectId])

    // ─── Computed Analytics ───

    const stats = useMemo(() => {
        const total = reviews.length
        const quick = reviews.filter(r => r.review_type === "quick").length
        const deep = reviews.filter(r => r.review_type === "deep").length
        const verified = reviews.filter(r => r.evidence_verified).length

        // Tag frequency
        const tagCounts: Record<string, number> = {}
        for (const r of reviews) {
            for (const tag of (r.tags ?? [])) {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1
            }
        }
        const topTags = Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15)

        // Decision breakdown
        const decisionCounts: Record<string, number> = {}
        for (const r of reviews) {
            if (r.decision_type) {
                decisionCounts[r.decision_type] = (decisionCounts[r.decision_type] || 0) + 1
            }
        }

        // Score averages (deep reviews only)
        const deepReviews = reviews.filter(r => r.review_type === "deep")
        const scoreKeys = ["score_opening", "score_discovery", "score_control", "score_objections", "score_close", "score_next_step"] as const
        const scoreAverages: Record<string, number> = {}
        for (const key of scoreKeys) {
            const vals = deepReviews.map(r => r[key]).filter((v): v is number => v != null)
            if (vals.length > 0) {
                scoreAverages[key.replace("score_", "")] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
            }
        }

        // Reviews per week (last 8 weeks)
        const weeks: { label: string; count: number }[] = []
        const now = new Date()
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now)
            weekStart.setDate(weekStart.getDate() - (i * 7))
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 7)
            const count = reviews.filter(r => {
                const d = new Date(r.created_at)
                return d >= weekStart && d < weekEnd
            }).length
            weeks.push({
                label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                count,
            })
        }

        return { total, quick, deep, verified, topTags, decisionCounts, scoreAverages, weeks }
    }, [reviews])

    const maxWeekCount = Math.max(...stats.weeks.map(w => w.count), 1)

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Topbar title="Review Analytics" />
                <div className="flex-1 p-6 flex items-center justify-center text-muted-foreground">
                    Loading analytics…
                </div>
            </div>
        )
    }

    const decisionLabels: Record<string, string> = {
        rule_draft: "📝 Rule Draft",
        experiment: "🧪 Experiment",
        drill: "🎯 Drill",
        no_decision: "⏭️ No Decision",
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Topbar title="Review Analytics" />

            <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                                <BarChart3 className="h-3.5 w-3.5" /> Total Reviews
                            </div>
                            <p className="text-2xl font-bold mt-1">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                                <Zap className="h-3.5 w-3.5" /> Quick / Deep
                            </div>
                            <p className="text-2xl font-bold mt-1">
                                {stats.quick} / {stats.deep}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                                <TrendingUp className="h-3.5 w-3.5" /> Evidence Rate
                            </div>
                            <p className="text-2xl font-bold mt-1">
                                {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                                <Calendar className="h-3.5 w-3.5" /> This Week
                            </div>
                            <p className="text-2xl font-bold mt-1">
                                {stats.weeks[stats.weeks.length - 1]?.count || 0}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Weekly Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Reviews per Week</CardTitle>
                        <CardDescription>Last 8 weeks activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 h-32">
                            {stats.weeks.map((week, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div
                                        className="w-full bg-primary/80 rounded-t transition-all"
                                        style={{ height: `${(week.count / maxWeekCount) * 100}%`, minHeight: week.count > 0 ? 4 : 0 }}
                                    />
                                    <span className="text-[10px] text-muted-foreground">{week.label}</span>
                                    <span className="text-[10px] font-medium">{week.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tag Frequency */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Tag className="h-4 w-4" /> Tag Frequency
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats.topTags.length > 0 ? (
                                <div className="space-y-2">
                                    {stats.topTags.map(([tag, count]) => (
                                        <div key={tag} className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="font-medium">{tag.replace(/_/g, " ")}</span>
                                                    <span className="text-muted-foreground">{count}</span>
                                                </div>
                                                <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full"
                                                        style={{ width: `${(count / stats.topTags[0][1]) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No tags recorded yet</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Decision Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Zap className="h-4 w-4" /> Decision Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {Object.keys(stats.decisionCounts).length > 0 ? (
                                <div className="space-y-3">
                                    {Object.entries(stats.decisionCounts)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([type, count]) => (
                                            <div key={type} className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{decisionLabels[type] || type}</span>
                                                <Badge variant="secondary">{count}</Badge>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No decisions recorded yet</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Score Averages */}
                {Object.keys(stats.scoreAverages).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Average Scores (Deep Reviews)</CardTitle>
                            <CardDescription>Based on {stats.deep} deep review{stats.deep !== 1 ? "s" : ""}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.entries(stats.scoreAverages).map(([key, avg]) => (
                                    <div key={key} className="p-3 rounded-lg bg-muted/50 text-center">
                                        <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                                        <p className="text-xl font-bold mt-1">{avg}</p>
                                        <p className="text-[10px] text-muted-foreground">/ 5</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

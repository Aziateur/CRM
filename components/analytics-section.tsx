"use client"

import { useEffect, useState, useMemo } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"
import { Phone, TrendingUp, Clock } from "lucide-react"
import { format, startOfDay, subDays } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Use the existing Attempt type from store if compatible, or define a local one that matches what useAttempts returns
// The Dashboard uses useAttempts which returns store.Attempt.
// Let's import Attempt from hooks/use-attempts or store.
import type { Attempt } from "@/lib/store"

interface CallSession {
    id: string
    duration_sec?: number
}

interface AnalyticsSectionProps {
    attempts: Attempt[]
    className?: string
}

export function AnalyticsSection({ attempts, className }: AnalyticsSectionProps) {
    const projectId = useProjectId()
    const [callSessions, setCallSessions] = useState<CallSession[]>([])
    // We assume attempts are passed in, so we only load session data.
    // Ideally we might want a loading state for sessions, but we can just show 0 or loading placeholder for duration.

    useEffect(() => {
        if (!projectId) return

        const fetchSessions = async () => {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("call_sessions")
                .select("*")
                .eq("project_id", projectId)

            if (!error && data) {
                setCallSessions(data)
            }
        }

        fetchSessions()
    }, [projectId])

    const kpis = useMemo(() => {
        const today = startOfDay(new Date())
        // Attempt.timestamp is string ISO
        const callsToday = attempts.filter(
            (a) => startOfDay(new Date(a.timestamp)).getTime() === today.getTime()
        ).length

        const totalAttempts = attempts.length
        // Attempt.dmReached is boolean
        const connects = attempts.filter((a) => a.dmReached).length
        const connectRate =
            totalAttempts > 0 ? ((connects / totalAttempts) * 100).toFixed(1) : "0.0"

        const durations = callSessions
            .map((s) => s.duration_sec)
            .filter((d): d is number => d !== null && d !== undefined)
        const avgDuration =
            durations.length > 0
                ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
                : 0

        return { callsToday, connectRate, avgDuration }
    }, [attempts, callSessions])

    const chartData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(new Date(), 6 - i)
            return {
                day: format(date, "EEE"),
                date: startOfDay(date).getTime(),
                calls: 0,
                connects: 0,
            }
        })

        attempts.forEach((attempt) => {
            const attemptDay = startOfDay(new Date(attempt.timestamp)).getTime()
            const dayData = last7Days.find((d) => d.date === attemptDay)
            if (dayData) {
                dayData.calls++
                if (attempt.dmReached) dayData.connects++
            }
        })

        return last7Days.map(({ day, calls, connects }) => ({
            day,
            calls,
            connects,
        }))
    }, [attempts])

    if (!projectId) return null

    return (
        <div className={`flex flex-col gap-6 ${className || ""}`}>
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
                        <Phone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.callsToday}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Connect Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.connectRate}%</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.avgDuration}s</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="md:col-span-4">
                    <CardHeader>
                        <CardTitle>Call Activity (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="calls" fill="#8884d8" name="Total Calls" />
                                <Bar dataKey="connects" fill="#82ca9d" name="Connects" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {attempts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No activity yet</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Outcome</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attempts.slice(0, 5).map((attempt) => (
                                        <TableRow key={attempt.id}>
                                            <TableCell>
                                                {format(new Date(attempt.timestamp), "h:mm a")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        attempt.dmReached ? "default" : "secondary"
                                                    }
                                                >
                                                    {attempt.dmReached ? "Connected" : "No Answer"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

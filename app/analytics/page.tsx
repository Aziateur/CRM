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

interface Attempt {
    id: string
    timestamp: string
    lead_id: string
    dm_reached: boolean
    outcome?: string
    lead?: {
        full_name?: string
    }
}

interface CallSession {
    id: string
    duration_sec?: number
}

export default function AnalyticsPage() {
    const projectId = useProjectId()
    const [attempts, setAttempts] = useState<Attempt[]>([])
    const [callSessions, setCallSessions] = useState<CallSession[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!projectId) return

        const fetchData = async () => {
            try {
                const supabase = getSupabase()

                const [attemptsRes, sessionsRes] = await Promise.all([
                    supabase
                        .from("attempts")
                        .select("*, lead:leads(full_name)")
                        .eq("project_id", projectId)
                        .order("timestamp", { ascending: false })
                        .limit(100),
                    supabase
                        .from("call_sessions")
                        .select("*")
                        .eq("project_id", projectId),
                ])

                if (attemptsRes.error) throw attemptsRes.error
                if (sessionsRes.error) throw sessionsRes.error

                setAttempts(attemptsRes.data || [])
                setCallSessions(sessionsRes.data || [])
            } catch (error) {
                console.error("Error fetching analytics data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [projectId])

    const kpis = useMemo(() => {
        const today = startOfDay(new Date())
        const callsToday = attempts.filter(
            (a) => startOfDay(new Date(a.timestamp)).getTime() === today.getTime()
        ).length

        const totalAttempts = attempts.length
        const connects = attempts.filter((a) => a.dm_reached).length
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
                if (attempt.dm_reached) dayData.connects++
            }
        })

        return last7Days.map(({ day, calls, connects }) => ({
            day,
            calls,
            connects,
        }))
    }, [attempts])

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-muted-foreground">No project selected</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-muted-foreground">
                    Call performance and engagement metrics
                </p>
            </div>

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
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : attempts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No activity yet</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Lead</TableHead>
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
                                                {attempt.lead?.full_name || "Unknown"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        attempt.dm_reached ? "default" : "secondary"
                                                    }
                                                >
                                                    {attempt.dm_reached ? "Connected" : "No Answer"}
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

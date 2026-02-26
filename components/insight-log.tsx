"use client"

import { useState, useEffect, useRef } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lightbulb, Plus, Loader2, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InsightEntry {
    id: string
    content: string
    tags: string[]
    created_at: string
}

export function InsightLog() {
    const projectId = useProjectId()
    const { toast } = useToast()
    const [entries, setEntries] = useState<InsightEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [text, setText] = useState("")
    const [saving, setSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!projectId) return
        const fetch = async () => {
            const supabase = getSupabase()
            const { data } = await supabase
                .from("intel_entries")
                .select("id, content, tags, created_at")
                .eq("project_id", projectId)
                .eq("altitude", 0)
                .eq("title", "__insight__")
                .order("created_at", { ascending: false })
                .limit(30)

            if (data) setEntries(data as InsightEntry[])
            setLoading(false)
        }
        fetch()
    }, [projectId])

    const handleAdd = async () => {
        if (!projectId || !text.trim()) return
        setSaving(true)
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("intel_entries")
                .insert({
                    project_id: projectId,
                    altitude: 0,
                    title: "__insight__",
                    content: text.trim(),
                    tags: [],
                })
                .select("id, content, tags, created_at")
                .single()

            if (error) throw error
            setEntries(prev => [data as InsightEntry, ...prev])
            setText("")
            inputRef.current?.focus()
        } catch {
            toast({ variant: "destructive", title: "Failed to save insight" })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const supabase = getSupabase()
            await supabase.from("intel_entries").delete().eq("id", id)
            setEntries(prev => prev.filter(e => e.id !== id))
        } catch {
            toast({ variant: "destructive", title: "Delete failed" })
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleAdd()
        }
    }

    const formatDate = (iso: string) => {
        const d = new Date(iso)
        const now = new Date()
        const diff = now.getTime() - d.getTime()
        const mins = Math.floor(diff / 60_000)
        if (mins < 1) return "just now"
        if (mins < 60) return `${mins}m ago`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        if (days < 7) return `${days}d ago`
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Insight Log
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Input */}
                <div className="flex gap-2 mb-4">
                    <Input
                        ref={inputRef}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Write an insight, observation, or learning..."
                        className="flex-1"
                        disabled={saving}
                    />
                    <Button
                        size="sm"
                        onClick={handleAdd}
                        disabled={!text.trim() || saving}
                        className="gap-1 shrink-0"
                    >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Add
                    </Button>
                </div>

                {/* Feed */}
                {loading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                        No insights yet. Start logging what you learn from calls, reviews, and experiments.
                    </p>
                ) : (
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                        {entries.map(entry => (
                            <div key={entry.id} className="group flex items-start gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors">
                                <Lightbulb className="h-3.5 w-3.5 text-amber-500/60 mt-0.5 shrink-0" />
                                <p className="text-sm flex-1">{entry.content}</p>
                                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                                    {formatDate(entry.created_at)}
                                </span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    onClick={() => handleDelete(entry.id)}
                                >
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

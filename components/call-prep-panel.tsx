"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { useProjectId } from "@/hooks/use-project-id"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Lightbulb, AlertTriangle } from "lucide-react"

interface ActiveRule {
    id: string
    ifWhen: string
    then: string
    confidence: string
}

interface ActiveSignal {
    id: string
    name: string
    description: string
}

interface CallPrepProps {
    leadSegment?: string
    leadStage?: string
    onRulesLoaded?: (ruleIds: string[]) => void
}

export function CallPrepPanel({ leadSegment, leadStage, onRulesLoaded }: CallPrepProps) {
    const projectId = useProjectId()
    const [rules, setRules] = useState<ActiveRule[]>([])
    const [signals, setSignals] = useState<ActiveSignal[]>([])

    useEffect(() => {
        if (!projectId) return

        const fetch = async () => {
            const supabase = getSupabase()
            const [rulesRes, signalsRes] = await Promise.all([
                supabase.from("rules").select("id, if_when, then_action, confidence").eq("project_id", projectId).eq("is_active", true),
                supabase.from("stop_signals").select("id, name, description").eq("project_id", projectId).eq("is_active", true),
            ])

            if (rulesRes.data) {
                setRules(rulesRes.data.map((r: Record<string, unknown>) => ({
                    id: r.id as string,
                    ifWhen: (r.if_when || "") as string,
                    then: (r.then_action || "") as string,
                    confidence: (r.confidence || "hypothesis") as string,
                })))
            }
            if (signalsRes.data) {
                setSignals(signalsRes.data.map((s: Record<string, unknown>) => ({
                    id: s.id as string,
                    name: s.name as string,
                    description: (s.description || "") as string,
                })))
            }

            // Notify parent of loaded rule IDs for telemetry
            if (onRulesLoaded && rulesRes.data) {
                onRulesLoaded(rulesRes.data.map((r: Record<string, unknown>) => r.id as string))
            }
        }
        fetch()
    }, [projectId])

    if (rules.length === 0 && signals.length === 0) return null

    return (
        <Card className="border-blue-200/50 bg-blue-50/30">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    Call Prep
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Active Rules */}
                {rules.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            Active Rules ({rules.length})
                        </p>
                        <div className="space-y-1.5">
                            {rules.slice(0, 5).map((rule) => (
                                <div key={rule.id} className="text-xs p-2 bg-white/60 rounded border border-blue-100">
                                    <span className="text-muted-foreground">If </span>
                                    <span className="font-medium">{rule.ifWhen}</span>
                                    <span className="text-muted-foreground"> → </span>
                                    <span className="text-blue-700">{rule.then}</span>
                                </div>
                            ))}
                            {rules.length > 5 && (
                                <p className="text-xs text-muted-foreground">+{rules.length - 5} more</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Stop Signals */}
                {signals.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Watch For
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {signals.map((sig) => (
                                <Badge key={sig.id} variant="outline" className="text-xs bg-white/60">
                                    {sig.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

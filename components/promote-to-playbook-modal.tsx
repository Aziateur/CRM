"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    BookOpen,
    Plus,
    Link2,
    X,
    Sparkles,
} from "lucide-react"
import {
    usePlaybookPromotion,
    type PromotionInput,
    type ActiveRule,
} from "@/hooks/use-playbook-promotion"

// ─── Props ───

interface Props {
    attemptId: string
    callSessionId?: string
    snippetText?: string
    sourceReviewId?: string
    onPromoted?: (result: { ruleId: string; evidenceId: string }) => void
    onClose: () => void
}

// ─── Component ───

export function PromoteToPlaybookModal({
    attemptId,
    callSessionId,
    snippetText,
    sourceReviewId,
    onPromoted,
    onClose,
}: Props) {
    const { promote, fetchActiveRules, promoting } = usePlaybookPromotion()
    const [mode, setMode] = useState<"new" | "existing">("new")
    const [activeRules, setActiveRules] = useState<ActiveRule[]>([])
    const [loadingRules, setLoadingRules] = useState(false)

    // New rule fields
    const [ifWhen, setIfWhen] = useState("")
    const [thenAction, setThenAction] = useState("")
    const [because, setBecause] = useState("")
    const [confidence, setConfidence] = useState<"hypothesis" | "tested" | "proven">("hypothesis")

    // Existing rule selection
    const [selectedRuleId, setSelectedRuleId] = useState<string>("")

    // Load active rules when switching to "existing" tab
    useEffect(() => {
        if (mode === "existing" && activeRules.length === 0) {
            setLoadingRules(true)
            fetchActiveRules().then((rules) => {
                setActiveRules(rules)
                setLoadingRules(false)
            })
        }
    }, [mode, activeRules.length, fetchActiveRules])

    const canSubmit =
        mode === "new"
            ? ifWhen.trim().length > 0 && thenAction.trim().length > 0
            : selectedRuleId.length > 0

    const handleSubmit = async () => {
        const input: PromotionInput = {
            attemptId,
            callSessionId,
            snippetText,
            sourceReviewId,
        }

        if (mode === "new") {
            input.newRule = {
                ifWhen: ifWhen.trim(),
                thenAction: thenAction.trim(),
                because: because.trim(),
                confidence,
            }
        } else {
            input.existingRuleId = selectedRuleId
        }

        const result = await promote(input)
        if (result) {
            onPromoted?.(result)
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">Promote to Playbook</h3>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Mode selector */}
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant={mode === "new" ? "default" : "outline"}
                        onClick={() => setMode("new")}
                        className="gap-1 flex-1"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New Rule
                    </Button>
                    <Button
                        size="sm"
                        variant={mode === "existing" ? "default" : "outline"}
                        onClick={() => setMode("existing")}
                        className="gap-1 flex-1"
                    >
                        <Link2 className="h-3.5 w-3.5" />
                        Existing Rule
                    </Button>
                </div>

                {/* New Rule Form */}
                {mode === "new" && (
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs font-semibold">If / When…</Label>
                            <Textarea
                                value={ifWhen}
                                onChange={(e) => setIfWhen(e.target.value)}
                                placeholder="e.g., Prospect says 'we already have a solution'"
                                rows={2}
                                className="resize-none text-sm mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">Then…</Label>
                            <Textarea
                                value={thenAction}
                                onChange={(e) => setThenAction(e.target.value)}
                                placeholder="e.g., Acknowledge, ask 'What's one thing you wish it did better?'"
                                rows={2}
                                className="resize-none text-sm mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">Because…</Label>
                            <Textarea
                                value={because}
                                onChange={(e) => setBecause(e.target.value)}
                                placeholder="e.g., This reframe opened 3 of last 5 conversations to next step"
                                rows={2}
                                className="resize-none text-sm mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">Confidence</Label>
                            <Select value={confidence} onValueChange={(v) => setConfidence(v as typeof confidence)}>
                                <SelectTrigger className="h-8 mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hypothesis">🧪 Hypothesis</SelectItem>
                                    <SelectItem value="tested">🔬 Tested</SelectItem>
                                    <SelectItem value="proven">✅ Proven</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {/* Existing Rule Selector */}
                {mode === "existing" && (
                    <div className="space-y-3">
                        {loadingRules ? (
                            <p className="text-sm text-muted-foreground">Loading rules…</p>
                        ) : activeRules.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No active rules. Create one first.</p>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {activeRules.map((rule) => (
                                    <button
                                        key={rule.id}
                                        onClick={() => setSelectedRuleId(rule.id)}
                                        className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${selectedRuleId === rule.id
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300 bg-white"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-[10px]">
                                                {rule.confidence}
                                            </Badge>
                                        </div>
                                        <p className="text-xs">
                                            <span className="text-muted-foreground">If </span>
                                            <span className="font-medium">{rule.ifWhen}</span>
                                            <span className="text-muted-foreground"> → </span>
                                            <span className="text-blue-700">{rule.thenAction}</span>
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Snippet preview */}
                {snippetText && (
                    <div className="p-2 rounded bg-gray-50 border text-xs text-muted-foreground">
                        <span className="font-semibold">Evidence snippet: </span>{snippetText.slice(0, 200)}
                        {snippetText.length > 200 && "…"}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!canSubmit || promoting}
                        className="gap-1"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        {promoting ? "Promoting…" : mode === "new" ? "Create Rule + Link Evidence" : "Link Evidence"}
                    </Button>
                </div>
            </div>
        </div>
    )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Beaker, Plus, Trash2, Shield, FlaskConical } from "lucide-react"
import {
    useCreateExperiment as useCreateExperimentMutation,
    type CreateExperimentInput,
    type ExperimentMetric,
    type Experiment,
} from "@/queries/experiments"

interface CreateExperimentModalProps {
    sourceReviewId?: string
    onCreated: (experiment: Experiment) => void
    onCancel: () => void
    /** Optional: inject shared createExperiment to avoid separate hook instance */
    createExperimentFn?: (input: CreateExperimentInput) => Promise<Experiment | null>
}

interface VariantInput {
    name: string
    description: string
    isControl: boolean
    protocol: string
}

export function CreateExperimentModal({ sourceReviewId, onCreated, onCancel, createExperimentFn }: CreateExperimentModalProps) {
    const createMutation = useCreateExperimentMutation()
    const createExperiment = createExperimentFn || createMutation.mutateAsync

    const [name, setName] = useState("")
    const [hypothesis, setHypothesis] = useState("")
    const [primaryMetric, setPrimaryMetric] = useState<ExperimentMetric>("dm_engagement")
    const [successDefinition, setSuccessDefinition] = useState("")
    const [sampleSizeTarget, setSampleSizeTarget] = useState(100)
    const [protocol, setProtocol] = useState("")
    const [scope, setScope] = useState("")
    const [variants, setVariants] = useState<VariantInput[]>([
        { name: "Control", description: "Current approach", isControl: true, protocol: "" },
        { name: "Test", description: "", isControl: false, protocol: "" },
    ])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    const addVariant = () => {
        setVariants(prev => [...prev, {
            name: `Variant ${String.fromCharCode(65 + prev.length)}`,
            description: "",
            isControl: false,
            protocol: "",
        }])
    }

    const removeVariant = (idx: number) => {
        if (variants.length <= 2) return
        setVariants(prev => prev.filter((_, i) => i !== idx))
    }

    const updateVariant = (idx: number, field: keyof VariantInput, value: string | boolean) => {
        setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
    }

    const handleSubmit = async () => {
        if (!name.trim()) { setError("Name is required"); return }
        if (!hypothesis.trim()) { setError("Hypothesis is required"); return }
        if (variants.length < 2) { setError("Need at least 2 variants"); return }

        setSubmitting(true)
        setError("")

        const input: CreateExperimentInput = {
            name: name.trim(),
            hypothesis: hypothesis.trim(),
            primaryMetric,
            successDefinition: successDefinition.trim(),
            sampleSizeTarget,
            scope: scope ? { raw: scope } : {},
            protocol: protocol.trim(),
            sourceReviewId,
            variants: variants.map(v => ({
                name: v.name,
                description: v.description,
                isControl: v.isControl,
                protocol: v.protocol,
            })),
        }

        try {
            const result = await createExperiment(input)
            setSubmitting(false)

            if (result) {
                onCreated(result)
            } else {
                setError("Failed to create experiment — unknown error")
            }
        } catch (err: unknown) {
            setSubmitting(false)
            const msg = err instanceof Error ? err.message : "Failed to create experiment"
            setError(msg)
        }
    }

    const isValid = name.trim() && hypothesis.trim() && variants.length >= 2

    return (
        <div className="space-y-5 border rounded-lg p-5 bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-950/10">
            <div className="flex items-center gap-2 mb-1">
                <Beaker className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-base">Design Experiment</h3>
                <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200">
                    Structured A/B Test
                </Badge>
            </div>

            {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded">{error}</p>
            )}

            {/* Name */}
            <div className="space-y-1.5">
                <Label className="text-xs font-medium">What are you testing? *</Label>
                <input
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    placeholder="e.g. Pain-first opener"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </div>

            {/* Hypothesis */}
            <div className="space-y-1.5">
                <Label className="text-xs font-medium">Hypothesis *</Label>
                <Textarea
                    className="text-sm resize-none"
                    rows={2}
                    placeholder="If we [change], then [metric] will [improve] because [reason]"
                    value={hypothesis}
                    onChange={e => setHypothesis(e.target.value)}
                />
            </div>

            {/* Metric + Sample Size row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Primary Metric *</Label>
                    <Select value={primaryMetric} onValueChange={(v) => setPrimaryMetric(v as ExperimentMetric)}>
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dm_engagement">DM Engagement</SelectItem>
                            <SelectItem value="meeting_set">Meeting Set</SelectItem>
                            <SelectItem value="follow_up_accepted">Follow-up Accepted</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Sample Size (per variant)</Label>
                    <input
                        type="number"
                        className="w-full px-3 py-2 text-sm border rounded-md bg-background h-9"
                        value={sampleSizeTarget}
                        onChange={e => setSampleSizeTarget(Math.max(10, parseInt(e.target.value) || 100))}
                        min={10}
                        step={10}
                    />
                </div>
            </div>

            {/* Success Definition */}
            <div className="space-y-1.5">
                <Label className="text-xs font-medium">Success Definition</Label>
                <input
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    placeholder="e.g. ≥20% improvement over control"
                    value={successDefinition}
                    onChange={e => setSuccessDefinition(e.target.value)}
                />
            </div>

            {/* Protocol */}
            <div className="space-y-1.5">
                <Label className="text-xs font-medium">Protocol (instructions to follow)</Label>
                <Textarea
                    className="text-sm resize-none"
                    rows={2}
                    placeholder="What should the rep do differently during test calls?"
                    value={protocol}
                    onChange={e => setProtocol(e.target.value)}
                />
            </div>

            {/* Scope */}
            <div className="space-y-1.5">
                <Label className="text-xs font-medium">Scope (optional)</Label>
                <input
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    placeholder="e.g. SMB segment, Tech persona, High-intent list"
                    value={scope}
                    onChange={e => setScope(e.target.value)}
                />
            </div>

            {/* Variants */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Variants</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addVariant}>
                        <Plus className="h-3 w-3" /> Add Variant
                    </Button>
                </div>
                {variants.map((v, idx) => (
                    <div key={idx} className={`border rounded-md p-3 space-y-2 ${v.isControl ? "border-blue-200 bg-blue-50/30 dark:bg-blue-950/10" : "border-purple-200 bg-purple-50/30 dark:bg-purple-950/10"}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {v.isControl ? (
                                    <Badge variant="secondary" className="text-[10px] gap-1">
                                        <Shield className="h-2.5 w-2.5" /> Control
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] gap-1 text-purple-600 border-purple-200">
                                        <FlaskConical className="h-2.5 w-2.5" /> Test
                                    </Badge>
                                )}
                                <input
                                    className="text-sm font-medium bg-transparent border-none outline-none w-32"
                                    value={v.name}
                                    onChange={e => updateVariant(idx, "name", e.target.value)}
                                />
                            </div>
                            {!v.isControl && variants.length > 2 && (
                                <button
                                    className="text-muted-foreground/50 hover:text-red-500"
                                    onClick={() => removeVariant(idx)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <input
                            className="w-full px-2 py-1 text-xs border rounded bg-background"
                            placeholder={v.isControl ? "Current approach (auto)" : "What changes in this variant?"}
                            value={v.description}
                            onChange={e => updateVariant(idx, "description", e.target.value)}
                        />
                        {!v.isControl && (
                            <Textarea
                                className="text-xs resize-none"
                                rows={2}
                                placeholder="Variant-specific protocol (what to do differently)"
                                value={v.protocol}
                                onChange={e => updateVariant(idx, "protocol", e.target.value)}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={!isValid || submitting}
                    onClick={handleSubmit}
                >
                    <Beaker className="h-3.5 w-3.5" />
                    {submitting ? "Creating…" : "Create Experiment"}
                </Button>
            </div>
        </div>
    )
}

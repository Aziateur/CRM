"use client"

import { Lead } from "@/lib/store"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Target, HelpCircle, X, Plus, AlertCircle } from "lucide-react"

// To auto-save from within widgets, we must use the single source of truth callback
import { getSupabase } from "@/lib/supabase"
// Wait, autoSave was debounced. We should pass an onFieldChange prop 
// Or we just updateLead and let the parent handle the auto-commit, but Account Reality uses arrays.
// For now, let's accept autoSave as a prop, or we can use the original autoSave.
// To keep things simple, we'll use a local debounce or just pass `onSaveArrayField`
// Actually, since this is a widget, let's define the props correctly based on WidgetProps.

interface AccountRealityProps {
    lead: Lead
    updateLead: (id: string, updates: Partial<Lead>) => void
}

export function AccountRealityWidget({ lead, updateLead }: AccountRealityProps) {

    // Basic auto-save similar to original
    const autoSave = async (field: string, value: any) => {
        const supabase = getSupabase()
        await supabase.from("leads").update({ [field]: value }).eq("id", lead.id)
    }

    const handleRemoveFact = async (index: number) => {
        const newFacts = [...(lead.confirmedFacts || [])]
        newFacts.splice(index, 1)
        updateLead(lead.id, { confirmedFacts: newFacts })
        await autoSave("confirmed_facts", newFacts)
    }

    const handleRemoveQuestion = async (index: number) => {
        const newQs = [...(lead.openQuestions || [])]
        newQs.splice(index, 1)
        updateLead(lead.id, { openQuestions: newQs })
        await autoSave("open_questions", newQs)
    }

    return (
        <Card className={!lead.nextCallObjective ? "border-amber-500" : ""}>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-sm font-medium">Account Reality</CardTitle>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">Map the customer's reality. What do we know (Facts), what don't we know (Open Questions), and what's the next move?</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Confirmed Facts</Label>
                        <span className="text-xs text-muted-foreground">{(lead.confirmedFacts || []).length}/5</span>
                    </div>
                    <div className="space-y-2">
                        {(lead.confirmedFacts || []).map((fact, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-sm">•</span>
                                <Input
                                    value={fact}
                                    onChange={(e) => {
                                        const nf = [...(lead.confirmedFacts || [])];
                                        nf[i] = e.target.value.slice(0, 120);
                                        updateLead(lead.id, { confirmedFacts: nf })
                                    }}
                                    onBlur={() => autoSave("confirmed_facts", lead.confirmedFacts)}
                                    maxLength={120}
                                    className="flex-1"
                                />
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveFact(i)}><X className="h-4 w-4" /></Button>
                            </div>
                        ))}
                        {(lead.confirmedFacts || []).length < 5 && (
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => updateLead(lead.id, { confirmedFacts: [...(lead.confirmedFacts || []), ""] })}>
                                <Plus className="h-4 w-4 mr-1" /> Add Fact
                            </Button>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Open Questions */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Open Questions</Label>
                        <span className="text-xs text-muted-foreground">{(lead.openQuestions || []).length}/3</span>
                    </div>
                    <div className="space-y-2">
                        {(lead.openQuestions || []).map((q, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-sm">•</span>
                                <Input
                                    value={q}
                                    onChange={(e) => {
                                        const nq = [...(lead.openQuestions || [])];
                                        nq[i] = e.target.value.slice(0, 120);
                                        updateLead(lead.id, { openQuestions: nq })
                                    }}
                                    onBlur={() => autoSave("open_questions", lead.openQuestions)}
                                    placeholder="Do they... / Can they... / Will they..."
                                    maxLength={120}
                                    className="flex-1"
                                />
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveQuestion(i)}><X className="h-4 w-4" /></Button>
                            </div>
                        ))}
                        {(lead.openQuestions || []).length < 3 && (
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => updateLead(lead.id, { openQuestions: [...(lead.openQuestions || []), ""] })}>
                                <Plus className="h-4 w-4 mr-1" /> Add Question
                            </Button>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Next Call Objective */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            Next Call Objective
                            {!lead.nextCallObjective && <AlertCircle className="h-4 w-4 text-amber-500" />}
                        </Label>
                    </div>
                    <div className="space-y-1">
                        <Input
                            value={lead.nextCallObjective || ""}
                            onChange={(e) => updateLead(lead.id, { nextCallObjective: e.target.value })}
                            onBlur={() => autoSave("next_call_objective", lead.nextCallObjective)}
                            placeholder="Confirm whether fuel contracts renew quarterly or annually."
                        />
                        <p className="text-xs text-muted-foreground">What do you want to learn or achieve on the next call?</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

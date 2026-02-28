"use client"

import { useState } from "react"
import { useFieldTemplates } from "@/hooks/use-field-templates"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import { FieldTemplateModal } from "@/components/field-template-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, Search, Users, FileText, ArrowRight, Sparkles } from "lucide-react"
import type { Lead, FieldTemplate, FieldDefinition } from "@/lib/store"
import type { WidgetProps } from "@/components/schema-renderer"

function getTemplateIcon(iconKey: string, className = "h-4 w-4") {
    const icons: Record<string, React.ReactNode> = {
        "clipboard-list": <ClipboardList className={className} />,
        "search": <Search className={className} />,
        "users": <Users className={className} />,
        "file-text": <FileText className={className} />,
    }
    return icons[iconKey] || <ClipboardList className={className} />
}

// Count filled fields in a template for a given lead
function countFilled(
    template: FieldTemplate,
    lead: Lead,
    fieldDefs: FieldDefinition[]
): { filled: number; total: number } {
    const templateFields = template.fieldKeys
        .map((key) => fieldDefs.find((f) => f.fieldKey === key))
        .filter(Boolean) as FieldDefinition[]

    const filled = templateFields.filter((f) => {
        const val = (lead.customFields || {})[f.fieldKey]
        if (val === null || val === undefined || val === "") return false
        if (Array.isArray(val) && val.length === 0) return false
        return true
    }).length

    return { filled, total: templateFields.length }
}

// Extract "key intel" — text field values from filled templates
function extractKeyIntel(
    templates: FieldTemplate[],
    lead: Lead,
    fieldDefs: FieldDefinition[]
): { label: string; value: string }[] {
    const intel: { label: string; value: string }[] = []
    const customFields = lead.customFields || {}

    for (const template of templates) {
        for (const key of template.fieldKeys) {
            const field = fieldDefs.find((f) => f.fieldKey === key)
            if (!field) continue
            // Only surface text-type fields with actual content
            if (field.fieldType !== "text") continue
            const val = customFields[key]
            if (!val || typeof val !== "string" || val.trim() === "") continue
            intel.push({ label: field.fieldLabel, value: val as string })
        }
    }

    return intel.slice(0, 4) // Max 4 intel items to keep it compact
}

// ============================================================================
// MAIN WIDGET
// ============================================================================

export function PrepTemplatesWidget(props: WidgetProps) {
    const { lead, updateLead } = props
    const { templates } = useFieldTemplates()
    const { fields } = useFieldDefinitions()
    const [openTemplate, setOpenTemplate] = useState<FieldTemplate | null>(null)

    if (templates.length === 0) return null

    const keyIntel = extractKeyIntel(templates, lead, fields)

    const handleSave = (leadId: string, customFields: Record<string, unknown>) => {
        updateLead(leadId, { customFields })
    }

    return (
        <>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <ClipboardList className="h-4 w-4" />
                        Prep Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                    {/* Template summary rows */}
                    {templates.map((template) => {
                        const { filled, total } = countFilled(template, lead, fields)
                        const isComplete = total > 0 && filled === total

                        return (
                            <button
                                key={template.id}
                                onClick={() => setOpenTemplate(template)}
                                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-left"
                            >
                                <span className="shrink-0 text-muted-foreground">
                                    {getTemplateIcon(template.icon)}
                                </span>
                                <span className="text-sm font-medium truncate flex-1">{template.name}</span>
                                <Badge
                                    variant="outline"
                                    className={`text-xs shrink-0 ${isComplete
                                            ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400"
                                            : filled > 0
                                                ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400"
                                                : ""
                                        }`}
                                >
                                    {isComplete ? `${filled}/${total} ✓` : `${filled}/${total}`}
                                </Badge>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            </button>
                        )
                    })}
                </CardContent>
            </Card>

            {/* Key Intel section */}
            {keyIntel.length > 0 && (
                <div className="p-3 rounded-md bg-muted/30 border-l-4 border-primary/50 space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        Key Intel
                    </h4>
                    {keyIntel.map((item, i) => (
                        <div key={i}>
                            <span className="text-sm font-medium">{item.label}:</span>
                            <span className="text-sm italic text-muted-foreground ml-1.5">{item.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Template popup modal */}
            {openTemplate && (
                <FieldTemplateModal
                    template={openTemplate}
                    lead={lead}
                    fieldDefinitions={fields}
                    open={!!openTemplate}
                    onOpenChange={(open) => !open && setOpenTemplate(null)}
                    onSave={handleSave}
                />
            )}
        </>
    )
}

"use client"

import { useState, useEffect } from "react"
import { DynamicFieldRenderer } from "@/components/dynamic-field-renderer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ClipboardList, Search, Users, FileText } from "lucide-react"
import type { Lead, FieldTemplate, FieldDefinition } from "@/lib/store"

function getTemplateIcon(iconKey: string) {
    const icons: Record<string, React.ReactNode> = {
        "clipboard-list": <ClipboardList className="h-5 w-5" />,
        "search": <Search className="h-5 w-5" />,
        "users": <Users className="h-5 w-5" />,
        "file-text": <FileText className="h-5 w-5" />,
    }
    return icons[iconKey] || <ClipboardList className="h-5 w-5" />
}

interface FieldTemplateModalProps {
    template: FieldTemplate
    lead: Lead
    fieldDefinitions: FieldDefinition[]
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (leadId: string, customFields: Record<string, unknown>) => void
}

export function FieldTemplateModal({
    template,
    lead,
    fieldDefinitions,
    open,
    onOpenChange,
    onSave,
}: FieldTemplateModalProps) {
    // Local copy of customFields for editing
    const [localFields, setLocalFields] = useState<Record<string, unknown>>({})

    // Sync from lead when opening
    useEffect(() => {
        if (open) {
            setLocalFields({ ...(lead.customFields || {}) })
        }
    }, [open, lead.customFields])

    // Resolve template field keys to definitions
    const templateFields = template.fieldKeys
        .map((key) => fieldDefinitions.find((f) => f.fieldKey === key))
        .filter(Boolean) as FieldDefinition[]

    // Count filled fields
    const filledCount = templateFields.filter((f) => {
        const val = localFields[f.fieldKey]
        if (val === null || val === undefined || val === "") return false
        if (Array.isArray(val) && val.length === 0) return false
        return true
    }).length

    const handleFieldChange = (fieldKey: string, value: unknown) => {
        setLocalFields((prev) => ({ ...prev, [fieldKey]: value }))
    }

    const handleSave = () => {
        onSave(lead.id, localFields)
        onOpenChange(false)
    }

    const progressPercent = templateFields.length > 0
        ? Math.round((filledCount / templateFields.length) * 100)
        : 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-muted">
                            {getTemplateIcon(template.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-lg">{template.name}</DialogTitle>
                            {template.description && (
                                <p className="text-sm text-muted-foreground mt-0.5">{template.description}</p>
                            )}
                        </div>
                        <Badge
                            variant="outline"
                            className={`shrink-0 ${filledCount === templateFields.length
                                    ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400"
                                    : filledCount > 0
                                        ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400"
                                        : ""
                                }`}
                        >
                            {filledCount}/{templateFields.length} filled
                        </Badge>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-muted rounded-full h-1.5 mt-3">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${progressPercent === 100 ? "bg-green-500" : "bg-primary"
                                }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-4 py-2">
                        {templateFields.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No fields in this template. Edit it in Settings → Prep Templates.
                            </p>
                        ) : (
                            templateFields.map((field) => (
                                <DynamicFieldRenderer
                                    key={field.fieldKey}
                                    field={field}
                                    value={localFields[field.fieldKey] ?? ""}
                                    onChange={(val) => handleFieldChange(field.fieldKey, val)}
                                    readOnly={false}
                                />
                            ))
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

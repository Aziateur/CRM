"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { useViewSchema } from "@/hooks/use-view-schema"
import { useFieldDefinitions } from "@/hooks/use-field-definitions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DynamicFieldRenderer } from "@/components/dynamic-field-renderer"
import { Skeleton } from "@/components/ui/skeleton"
import type { Lead, FieldDefinition, ViewSection, ViewItem } from "@/lib/store"

// --- ERROR BOUNDARY ---
interface ErrorBoundaryProps {
    children: ReactNode
    fallbackName: string
}
interface ErrorBoundaryState {
    hasError: boolean
}
export class WidgetErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = { hasError: false }

    public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
        return { hasError: true }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`UI Error in Widget "${this.props.fallbackName}":`, error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4 flex items-center justify-center text-sm text-red-600">
                        Failed to load component: {this.props.fallbackName}
                    </CardContent>
                </Card>
            )
        }
        return this.props.children
    }
}

// --- WIDGET REGISTRY ---
// We pass the required props down to the widgets.
export interface WidgetProps {
    lead: Lead
    updateLead: (id: string, updates: Partial<Lead>) => void
    [key: string]: any // allow passing specific components like CallPanel if needed
}

export type WidgetRegistry = Record<string, React.FC<WidgetProps>>

// --- SCHEMA RENDERER ---
interface SchemaRendererProps {
    viewType: "lead_drawer" | "add_lead" | "leads_table"
    lead: Lead
    updateLead: (id: string, updates: Partial<Lead>) => void
    widgets: WidgetRegistry // The actual React components passed in from the parent
    widgetContext?: Record<string, any> // Extra props or functions to pass securely to widgets
}

export function SchemaRenderer({
    viewType,
    lead,
    updateLead,
    widgets,
    widgetContext = {}
}: SchemaRendererProps) {
    const { schema, loading: schemaLoading, error: schemaError } = useViewSchema(viewType)
    const { fields: fieldDefinitions, loading: fieldsLoading } = useFieldDefinitions()

    if (schemaLoading || fieldsLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
                <Skeleton className="h-[500px]" />
                <Skeleton className="h-[500px]" />
                <Skeleton className="h-[500px]" />
            </div>
        )
    }

    if (schemaError || !schema || !schema.schema.columns) {
        return <div className="p-4 text-red-500">Error loading layout schema.</div>
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {schema.schema.columns.map((col) => (
                <div key={col.id} className="space-y-6">
                    {col.sections.map((section) => (
                        <SectionRenderer
                            key={section.id}
                            section={section}
                            fieldDefs={fieldDefinitions}
                            lead={lead}
                            updateLead={updateLead}
                            widgets={widgets}
                            widgetContext={widgetContext}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}

interface SectionRendererProps {
    section: ViewSection
    fieldDefs: FieldDefinition[]
    lead: Lead
    updateLead: (id: string, updates: Partial<Lead>) => void
    widgets: WidgetRegistry
    widgetContext: Record<string, any>
}

function SectionRenderer({
    section,
    fieldDefs,
    lead,
    updateLead,
    widgets
}: SectionRendererProps) {
    // If the section is empty, don't render it at all
    if (!section.items || section.items.length === 0) return null

    // See if this section contains ONLY widgets, ONLY fields, or MIXED.
    // We generally draw a Card for the Section, UNLESS it's a structural section that just holds a massive Widget (like Calls Panel)
    // Let's render everything inside a single Card to represent the category, EXCEPT if the item specifically wants to be its own card.
    // Actually, standardizing: The section is a visual grouping. If it's pure widgets, they might be cards themselves.

    const renderItem = (item: ViewItem) => {
        if (item.type === "widget" && item.widgetId) {
            const WidgetComponent = widgets[item.widgetId]
            if (!WidgetComponent) {
                return null
            }
            return (
                <WidgetErrorBoundary key={item.id} fallbackName={item.widgetId}>
                    <WidgetComponent
                        lead={lead}
                        updateLead={updateLead}
                    />
                </WidgetErrorBoundary>
            )
        }

        if (item.type === "field" && item.fieldKey) {
            const def = fieldDefs.find(f => f.fieldKey === item.fieldKey)
            if (!def) return null // Field was deleted or missing

            // Extract value
            let value: any
            if (def.source === "native") {
                value = (lead as any)[def.fieldKey]
            } else if (def.source === "custom") {
                value = lead.customFields?.[def.fieldKey]
            }

            const handleChange = (newVal: any) => {
                if (def.source === "native") {
                    updateLead(lead.id, { [def.fieldKey]: newVal })
                } else if (def.source === "custom") {
                    updateLead(lead.id, {
                        customFields: {
                            ...(lead.customFields || {}),
                            [def.fieldKey]: newVal
                        }
                    })
                }
            }

            return (
                <WidgetErrorBoundary key={item.id} fallbackName={`Field: ${def.fieldLabel}`}>
                    <div className="py-1">
                        <DynamicFieldRenderer
                            field={def}
                            value={value}
                            onChange={handleChange}
                            readOnly={false}
                        />
                    </div>
                </WidgetErrorBoundary>
            )
        }

        return null
    }

    // Group consec fields together so they live in ONE shared Card.
    // Widgets will render on their own outside the Card.
    const blocks: ReactNode[] = []
    let currentFieldGroup: ViewItem[] = []

    const flushFields = () => {
        if (currentFieldGroup.length > 0) {
            const fieldsToRender = [...currentFieldGroup]
            blocks.push(
                <Card key={`field-group-${fieldsToRender[0].id}`}>
                    {section.name && section.name.toLowerCase() !== "execution" && section.name.toLowerCase() !== "strategy & reality" && section.name.toLowerCase() !== "history" && (
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">{section.name}</CardTitle>
                        </CardHeader>
                    )}
                    <CardContent className="space-y-3 pt-4">
                        {fieldsToRender.map(renderItem)}
                    </CardContent>
                </Card>
            )
            currentFieldGroup = []
        }
    }

    section.items.forEach(item => {
        if (item.type === "field") {
            currentFieldGroup.push(item)
        } else {
            flushFields()
            blocks.push(renderItem(item))
        }
    })
    flushFields()

    return (
        <div className="space-y-6">
            {blocks}
        </div>
    )
}

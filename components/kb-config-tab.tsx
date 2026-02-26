"use client"

import { useTabConfig } from "@/hooks/use-categories"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CategoryManager } from "@/components/category-manager"
import {
    BookOpen,
    FolderOpen,
    Tag,
    Layers,
    Globe,
    Target,
    AlertTriangle,
    LayoutGrid,
} from "lucide-react"

// ─── Category Type Config ───

const CATEGORY_SECTIONS = [
    { type: "industry", label: "Industries", desc: "Top-level verticals (e.g., Tutoring, Healthcare). Segments nest underneath." },
    { type: "segment", label: "Segments", desc: "Market segments grouped by industry (e.g., Med School Prep, Music)" },
    { type: "intel_category", label: "Intel Categories", desc: "Types of intelligence at each altitude (Competitor Landscape, Pain Points, etc.)" },
    { type: "script_section_type", label: "Script Section Types", desc: "Section types for structured scripts (e.g., Opener, Discovery)" },
    { type: "segment_section_type", label: "Altitude 3 — ICP Sections", desc: "Per-segment human intel types (e.g., Language Bank, Mindset Notes, Pain Points)" },
    { type: "friction_category", label: "Friction Categories", desc: "Types of friction/blockers" },
    { type: "root_cause_type", label: "Root Cause Types", desc: "Why friction occurs" },
    { type: "stage", label: "Sales Stages", desc: "Script stages (e.g., Cold Open, Follow-up)" },
] as const

// ─── Tab Visibility Manager ───

function TabVisibilitySection() {
    const { tabs, editTab, isLoading } = useTabConfig()
    const { toast } = useToast()

    if (isLoading) return null

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    Tab Visibility
                </CardTitle>
                <CardDescription className="text-xs">Control which Knowledge Base tabs appear and their labels</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {tabs.map((tab) => (
                        <div key={tab.id} className="flex items-center justify-between px-3 py-2 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={tab.isVisible}
                                    onCheckedChange={() => {
                                        editTab.mutate(
                                            { id: tab.id, updates: { isVisible: !tab.isVisible } },
                                            { onSuccess: () => toast({ title: tab.isVisible ? "Tab hidden" : "Tab visible" }) }
                                        )
                                    }}
                                />
                                <Input
                                    className="h-7 text-sm font-medium border-0 px-0 shadow-none focus-visible:ring-0 w-40"
                                    value={tab.label}
                                    onBlur={(e) => {
                                        if (e.target.value !== tab.label) {
                                            editTab.mutate({ id: tab.id, updates: { label: e.target.value } })
                                        }
                                    }}
                                    onChange={() => { }}
                                    defaultValue={tab.label}
                                />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono">{tab.slug}</Badge>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Main KB Config Component ───

export function KbConfigTab() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Knowledge Base Configuration
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Manage all KB categories, tab visibility, and modular settings. Changes take effect immediately.
                </p>
            </div>

            {/* Tab Visibility */}
            <TabVisibilitySection />

            {/* Category Managers — using shared component */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        Category Types
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Add, rename, reorder, archive, or delete categories. All dropdowns and filters update automatically.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {CATEGORY_SECTIONS.map((section) => (
                        <CategoryManager
                            key={section.type}
                            categoryType={section.type}
                            title={section.label}
                            description={section.desc}
                            showColor
                            compact
                            iconPreset={section.type}
                        />
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}

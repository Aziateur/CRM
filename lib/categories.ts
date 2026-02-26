import { getSupabase } from "@/lib/supabase"

// ─── Types ───

export interface Category {
    id: string
    projectId: string
    categoryType: string
    name: string
    slug: string
    icon: string
    color: string | null
    description: string | null
    sortOrder: number
    isActive: boolean
    metadata: Record<string, unknown>
    parentId: string | null
    altitude: number | null
    cardinality: string | null
    createdAt: string
    updatedAt: string
}

export interface TabConfig {
    id: string
    projectId: string
    slug: string
    label: string
    sortOrder: number
    isVisible: boolean
}

// ─── Slug helper ───

function toSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60)
}

// ─── Default seeds per category type ───

type CategorySeed = Omit<Category, "id" | "projectId" | "createdAt" | "updatedAt" | "parentId" | "altitude" | "cardinality"> & {
    parentId?: string | null
    altitude?: number | null
    cardinality?: string | null
}

const DEFAULT_SEEDS: Record<string, CategorySeed[]> = {
    industry: [
        { categoryType: "industry", name: "Tutoring", slug: "tutoring", icon: "graduation-cap", color: "#3b82f6", description: "Tutoring services across all verticals", sortOrder: 0, isActive: true, metadata: {} },
    ],
    segment: [
        { categoryType: "segment", name: "Unknown", slug: "unknown", icon: "help-circle", color: "#6b7280", description: null, sortOrder: 0, isActive: true, metadata: {} },
        { categoryType: "segment", name: "Trucking", slug: "trucking", icon: "truck", color: "#3b82f6", description: null, sortOrder: 1, isActive: true, metadata: {} },
        { categoryType: "segment", name: "Home Services", slug: "home-services", icon: "home", color: "#22c55e", description: null, sortOrder: 2, isActive: true, metadata: {} },
        { categoryType: "segment", name: "Construction", slug: "construction", icon: "hard-hat", color: "#f59e0b", description: null, sortOrder: 3, isActive: true, metadata: {} },
        { categoryType: "segment", name: "Other", slug: "other", icon: "clipboard-list", color: "#8b5cf6", description: null, sortOrder: 4, isActive: true, metadata: {} },
    ],
    root_cause_type: [
        { categoryType: "root_cause_type", name: "Script Issue", slug: "script-issue", icon: "scroll-text", color: "#ef4444", description: "The script didn't work for this situation", sortOrder: 0, isActive: true, metadata: {} },
        { categoryType: "root_cause_type", name: "ICP Mismatch", slug: "icp-mismatch", icon: "target", color: "#f97316", description: "Lead didn't match ideal customer profile", sortOrder: 1, isActive: true, metadata: {} },
        { categoryType: "root_cause_type", name: "Knowledge Gap", slug: "knowledge-gap", icon: "book-open", color: "#eab308", description: "Didn't know enough about industry/competitor/product", sortOrder: 2, isActive: true, metadata: {} },
        { categoryType: "root_cause_type", name: "Skill Gap", slug: "skill-gap", icon: "graduation-cap", color: "#14b8a6", description: "Need to practice this technique", sortOrder: 3, isActive: true, metadata: {} },
        { categoryType: "root_cause_type", name: "Market Condition", slug: "market-condition", icon: "trending-up", color: "#6366f1", description: "External factor (timing, economy, etc.)", sortOrder: 4, isActive: true, metadata: {} },
        { categoryType: "root_cause_type", name: "Bad Data", slug: "bad-data", icon: "alert-triangle", color: "#ec4899", description: "Wrong number, wrong contact, outdated info", sortOrder: 5, isActive: true, metadata: {} },
        { categoryType: "root_cause_type", name: "Process Issue", slug: "process-issue", icon: "settings", color: "#64748b", description: "Workflow or process needs improvement", sortOrder: 6, isActive: true, metadata: {} },
    ],
    intel_category: [
        { categoryType: "intel_category", name: "Competitor Landscape", slug: "competitor-landscape", icon: "building", color: "#ef4444", description: "Who they compare you to, alternatives they use", sortOrder: 0, isActive: true, metadata: { altitude: 1 } },
        { categoryType: "intel_category", name: "Market Trends & Conditions", slug: "market-trends-conditions", icon: "bar-chart", color: "#8b5cf6", description: "Industry shifts, economic factors, seasonal patterns", sortOrder: 1, isActive: true, metadata: { altitude: 1 } },
        { categoryType: "intel_category", name: "Regulations & Compliance", slug: "regulations-compliance", icon: "file-text", color: "#06b6d4", description: "Rules, mandates, certifications affecting the entire industry", sortOrder: 2, isActive: true, metadata: { altitude: 1 } },
        { categoryType: "intel_category", name: "How Their Business Works", slug: "how-their-business-works", icon: "factory", color: "#3b82f6", description: "Revenue model, operations, day-in-the-life — per segment", sortOrder: 3, isActive: true, metadata: { altitude: 2 } },
        { categoryType: "intel_category", name: "Pricing & Deal Intelligence", slug: "pricing-deal-intelligence", icon: "dollar-sign", color: "#22c55e", description: "What they pay, budget cycles, deal structures — per segment", sortOrder: 4, isActive: true, metadata: { altitude: 2 } },
        { categoryType: "intel_category", name: "Technology & Tools They Use", slug: "technology-tools", icon: "monitor", color: "#14b8a6", description: "Software, hardware, systems in their workflow — per segment", sortOrder: 5, isActive: true, metadata: { altitude: 2 } },
        { categoryType: "intel_category", name: "Buying Process & Decision Chain", slug: "buying-process-decision-chain", icon: "link", color: "#f97316", description: "Who decides, who influences, how they buy — per segment", sortOrder: 6, isActive: true, metadata: { altitude: 2 } },
    ],
    script_stage: [
        { categoryType: "script_stage", name: "Cold Open", slug: "cold-open", icon: "mic", color: "#3b82f6", description: null, sortOrder: 0, isActive: true, metadata: {} },
        { categoryType: "script_stage", name: "Discovery", slug: "discovery", icon: "search", color: "#8b5cf6", description: null, sortOrder: 1, isActive: true, metadata: {} },
        { categoryType: "script_stage", name: "Value Prop", slug: "value-prop", icon: "gem", color: "#22c55e", description: null, sortOrder: 2, isActive: true, metadata: {} },
        { categoryType: "script_stage", name: "Close / CTA", slug: "close-cta", icon: "target", color: "#f59e0b", description: null, sortOrder: 3, isActive: true, metadata: {} },
    ],
    script_section_type: [
        { categoryType: "script_section_type", name: "Opener", slug: "opener", icon: "mic", color: "#3b82f6", description: "Opening line / cold intro", sortOrder: 0, isActive: true, metadata: {} },
        { categoryType: "script_section_type", name: "Connection Questions", slug: "connection-questions", icon: "handshake", color: "#8b5cf6", description: "Build rapport, find common ground", sortOrder: 1, isActive: true, metadata: {} },
        { categoryType: "script_section_type", name: "Discovery / Qualification", slug: "discovery-qualification", icon: "search", color: "#06b6d4", description: "Uncover pain, qualify the opportunity", sortOrder: 2, isActive: true, metadata: {} },
        { categoryType: "script_section_type", name: "Value Proposition", slug: "value-proposition", icon: "gem", color: "#22c55e", description: "Pitch the value, tie to their pain", sortOrder: 3, isActive: true, metadata: {} },
        { categoryType: "script_section_type", name: "Objection Handling", slug: "objection-handling", icon: "shield", color: "#f59e0b", description: "Responses to common pushbacks", sortOrder: 4, isActive: true, metadata: {} },
        { categoryType: "script_section_type", name: "Close", slug: "close", icon: "target", color: "#ef4444", description: "Ask for the meeting / next step", sortOrder: 5, isActive: true, metadata: {} },
        { categoryType: "script_section_type", name: "Voicemail Script", slug: "voicemail-script", icon: "phone", color: "#64748b", description: "Message to leave on voicemail", sortOrder: 6, isActive: true, metadata: {} },
        { categoryType: "script_section_type", name: "Full Script", slug: "full-script", icon: "file-text", color: "#6b7280", description: "Complete script (migrated from flat format)", sortOrder: 7, isActive: true, metadata: {} },
    ],
    segment_section_type: [
        { categoryType: "segment_section_type", name: "Language Bank", slug: "language-bank", icon: "message-circle", color: "#3b82f6", description: "Phrases, sentences, and terminology this segment uses", sortOrder: 0, isActive: true, metadata: {} },
        { categoryType: "segment_section_type", name: "Mindset Notes", slug: "mindset-notes", icon: "brain", color: "#8b5cf6", description: "How they think, what motivates them, what they fear", sortOrder: 1, isActive: true, metadata: {} },
        { categoryType: "segment_section_type", name: "Pain Points", slug: "pain-points", icon: "heart-crack", color: "#ef4444", description: "Deep pain — budgets, frustrations, fears. This is psychology, not a 1-liner.", sortOrder: 2, isActive: true, metadata: {} },
    ],
    friction_type: [
        { categoryType: "friction_type", name: "Got Stuck", slug: "got-stuck", icon: "shield-alert", color: "#ef4444", description: null, sortOrder: 0, isActive: true, metadata: {} },
        { categoryType: "friction_type", name: "Wrong Approach", slug: "wrong-approach", icon: "crosshair", color: "#f97316", description: null, sortOrder: 1, isActive: true, metadata: {} },
        { categoryType: "friction_type", name: "Knowledge Missing", slug: "knowledge-missing", icon: "help-circle", color: "#eab308", description: null, sortOrder: 2, isActive: true, metadata: {} },
        { categoryType: "friction_type", name: "Timing Issue", slug: "timing-issue", icon: "clock", color: "#6366f1", description: null, sortOrder: 3, isActive: true, metadata: {} },
    ],
    offer_category: [
        { categoryType: "offer_category", name: "Capabilities", slug: "capabilities", icon: "zap", color: "#f59e0b", description: "What you can deliver — your actual skills and services", sortOrder: 0, isActive: true, metadata: {} },
        { categoryType: "offer_category", name: "What They Need", slug: "what-they-need", icon: "target", color: "#ef4444", description: "Segment-specific problems and needs you solve", sortOrder: 1, isActive: true, metadata: {} },
        { categoryType: "offer_category", name: "Value Propositions", slug: "value-propositions", icon: "gem", color: "#8b5cf6", description: "Capability → Need mapping with value equation", sortOrder: 2, isActive: true, metadata: {} },
        { categoryType: "offer_category", name: "Upsides & Downsides", slug: "upsides-downsides", icon: "scale", color: "#06b6d4", description: "Pros and cons of this offer level", sortOrder: 3, isActive: true, metadata: {} },
    ],
    offer_level: [
        { categoryType: "offer_level", name: "Intro", slug: "intro", icon: "door-open", color: "#22c55e", description: "Entry-level offer to get them in the door", sortOrder: 0, isActive: true, metadata: {} },
        { categoryType: "offer_level", name: "Main", slug: "main", icon: "star", color: "#3b82f6", description: "Core offer — the main thing you sell", sortOrder: 1, isActive: true, metadata: {} },
        { categoryType: "offer_level", name: "Upsell", slug: "upsell", icon: "arrow-up-circle", color: "#8b5cf6", description: "Premium add-on or upgrade", sortOrder: 2, isActive: true, metadata: {} },
        { categoryType: "offer_level", name: "Downsell", slug: "downsell", icon: "arrow-down-circle", color: "#f97316", description: "Lower-tier alternative if they can't afford main", sortOrder: 3, isActive: true, metadata: {} },
    ],
}

const DEFAULT_TAB_SEEDS: Omit<TabConfig, "id" | "projectId">[] = [
    { slug: "playbook", label: "Playbook", sortOrder: 0, isVisible: true },
    { slug: "scripts", label: "Scripts", sortOrder: 1, isVisible: true },
    { slug: "market-intel", label: "Market Intel", sortOrder: 2, isVisible: true },
    { slug: "offer", label: "Offer & Value", sortOrder: 3, isVisible: true },
    { slug: "friction", label: "Friction", sortOrder: 4, isVisible: true },
    { slug: "metrics", label: "Metrics & Diagnostics", sortOrder: 5, isVisible: true },
]

// ─── Supabase row mapper ───

function rowToCategory(row: Record<string, unknown>): Category {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        categoryType: row.category_type as string,
        name: row.name as string,
        slug: row.slug as string,
        icon: (row.icon as string) ?? "file-text",
        color: (row.color as string) ?? null,
        description: (row.description as string) ?? null,
        sortOrder: (row.sort_order as number) ?? 0,
        isActive: (row.is_active as boolean) ?? true,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        parentId: (row.parent_id as string) ?? null,
        altitude: (row.altitude as number) ?? null,
        cardinality: (row.cardinality as string) ?? null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }
}

function rowToTabConfig(row: Record<string, unknown>): TabConfig {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        slug: row.slug as string,
        label: row.label as string,
        sortOrder: (row.sort_order as number) ?? 0,
        isVisible: (row.is_visible as boolean) ?? true,
    }
}

// ─── Categories CRUD ───

export async function fetchCategories(projectId: string, categoryType: string): Promise<Category[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("project_id", projectId)
        .eq("category_type", categoryType)
        .order("sort_order", { ascending: true })

    if (error) throw error

    // Auto-seed if empty
    if (!data || data.length === 0) {
        const seeds = DEFAULT_SEEDS[categoryType]
        if (seeds && seeds.length > 0) {
            const rows = seeds.map((s) => ({
                project_id: projectId,
                type: s.categoryType,
                category_type: s.categoryType,
                name: s.name,
                slug: s.slug,
                icon: s.icon,
                color: s.color,
                description: s.description,
                sort_order: s.sortOrder,
                is_active: s.isActive,
                metadata: s.metadata,
            }))
            const { data: seeded, error: seedErr } = await supabase
                .from("categories")
                .insert(rows)
                .select("*")
            if (seedErr) throw seedErr
            return (seeded ?? []).map(rowToCategory)
        }
        return []
    }

    return data.map(rowToCategory)
}

export async function createCategory(
    projectId: string,
    input: {
        categoryType: string
        name: string
        icon?: string
        color?: string
        description?: string
        metadata?: Record<string, unknown>
    }
): Promise<Category> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("categories")
        .insert({
            project_id: projectId,
            type: input.categoryType,
            category_type: input.categoryType,
            name: input.name,
            slug: toSlug(input.name),
            icon: input.icon ?? "file-text",
            color: input.color ?? null,
            description: input.description ?? null,
            metadata: input.metadata ?? {},
        })
        .select("*")
        .single()

    if (error) throw error
    return rowToCategory(data)
}

export async function updateCategory(
    id: string,
    updates: Partial<Pick<Category, "name" | "icon" | "color" | "description" | "sortOrder" | "isActive" | "metadata">>
): Promise<Category> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.name !== undefined) {
        row.name = updates.name
        row.slug = toSlug(updates.name)
    }
    if (updates.icon !== undefined) row.icon = updates.icon
    if (updates.color !== undefined) row.color = updates.color
    if (updates.description !== undefined) row.description = updates.description
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder
    if (updates.isActive !== undefined) row.is_active = updates.isActive
    if (updates.metadata !== undefined) row.metadata = updates.metadata

    const { data, error } = await supabase
        .from("categories")
        .update(row)
        .eq("id", id)
        .select("*")
        .single()

    if (error) throw error
    return rowToCategory(data)
}

export async function deleteCategory(id: string): Promise<void> {
    const supabase = getSupabase()

    // Clear ALL FK references in child tables before deleting
    // friction_logs
    await supabase.from("friction_logs").update({ category_id: null }).eq("category_id", id)
    await supabase.from("friction_logs").update({ root_cause_id: null }).eq("root_cause_id", id)
    // intel_entries (3 FKs)
    await supabase.from("intel_entries").update({ intel_category_id: null }).eq("intel_category_id", id)
    await supabase.from("intel_entries").update({ industry_id: null }).eq("industry_id", id)
    await supabase.from("intel_entries").update({ segment_id: null }).eq("segment_id", id)
    // kb_entries
    await supabase.from("kb_entries").update({ category_id: null }).eq("category_id", id)
    // segment_entries (2 FKs)
    await supabase.from("segment_entries").update({ segment_id: null }).eq("segment_id", id)
    await supabase.from("segment_entries").update({ section_type_id: null }).eq("section_type_id", id)
    // kb_script_sections
    await supabase.from("kb_script_sections").update({ section_type_id: null }).eq("section_type_id", id)
    // categories self-ref (parent_id)
    await supabase.from("categories").update({ parent_id: null }).eq("parent_id", id)

    const { error } = await supabase.from("categories").delete().eq("id", id)
    if (error) {
        // If still blocked (e.g., an unknown FK), provide a readable message
        if (error.code === "23503") {
            throw new Error("This category is still in use. Archive it instead.")
        }
        throw error
    }
}

// ─── Tab Config CRUD ───

export async function fetchTabConfig(projectId: string): Promise<TabConfig[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("kb_tab_config")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })

    if (error) throw error

    // Auto-seed if empty
    if (!data || data.length === 0) {
        const rows = DEFAULT_TAB_SEEDS.map((s) => ({
            project_id: projectId,
            slug: s.slug,
            label: s.label,
            sort_order: s.sortOrder,
            is_visible: s.isVisible,
        }))
        const { data: seeded, error: seedErr } = await supabase
            .from("kb_tab_config")
            .insert(rows)
            .select("*")
        if (seedErr) throw seedErr
        return (seeded ?? []).map(rowToTabConfig)
    }

    // Auto-insert any missing tab slugs (e.g. newly added tabs like "offer")
    const existingSlugs = new Set(data.map((r: Record<string, unknown>) => r.slug as string))
    const missing = DEFAULT_TAB_SEEDS.filter(s => !existingSlugs.has(s.slug))
    if (missing.length > 0) {
        const rows = missing.map((s) => ({
            project_id: projectId,
            slug: s.slug,
            label: s.label,
            sort_order: s.sortOrder,
            is_visible: s.isVisible,
        }))
        const { data: inserted, error: insertErr } = await supabase
            .from("kb_tab_config")
            .insert(rows)
            .select("*")
        if (!insertErr && inserted) {
            return [...data, ...inserted].map(rowToTabConfig).sort((a, b) => a.sortOrder - b.sortOrder)
        }
    }

    return data.map(rowToTabConfig)
}

export async function updateTabConfig(
    id: string,
    updates: Partial<Pick<TabConfig, "label" | "sortOrder" | "isVisible">>
): Promise<TabConfig> {
    const supabase = getSupabase()
    const row: Record<string, unknown> = {}
    if (updates.label !== undefined) row.label = updates.label
    if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder
    if (updates.isVisible !== undefined) row.is_visible = updates.isVisible

    const { data, error } = await supabase
        .from("kb_tab_config")
        .update(row)
        .eq("id", id)
        .select("*")
        .single()

    if (error) throw error
    return rowToTabConfig(data)
}

// ─── Convenience: get default seeds for a type ───
export function getDefaultSeeds(categoryType: string) {
    return DEFAULT_SEEDS[categoryType] ?? []
}

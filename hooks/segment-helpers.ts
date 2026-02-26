"use client"

import { useMemo } from "react"
import { useCategories } from "@/hooks/use-categories"

/**
 * Build a UUID → name map for segments.
 * Used by display components to resolve stored UUIDs back to human-readable names.
 */
export function useSegmentMap() {
    const { activeCategories: segments } = useCategories("segment")

    const segmentMap = useMemo(
        () => new Map(segments.map(s => [s.id, s])),
        [segments]
    )

    return { segments, segmentMap }
}

/**
 * Resolve a segment value to a display name.
 * - If the value is a known UUID → returns the category name
 * - If the value is an old plain-text name → returns it as-is (backward compat)
 * - If null/empty → returns fallback
 */
export function resolveSegmentName(
    segment: string | null | undefined,
    segmentMap: Map<string, { name: string; icon?: string }>,
    fallback = "Unknown"
): string {
    if (!segment) return fallback
    const cat = segmentMap.get(segment)
    return cat ? cat.name : segment
}

/**
 * Resolve a segment name to its UUID (for import use).
 * Returns the original value if no match found.
 */
export function resolveSegmentToId(
    segmentName: string,
    segments: { id: string; name: string }[]
): string {
    const match = segments.find(
        s => s.name.toLowerCase() === segmentName.toLowerCase()
    )
    return match?.id ?? segmentName
}

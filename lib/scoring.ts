import type { ReviewField, ReviewFieldConfig } from "@/hooks/use-review-templates"

// ─── Types ───

export interface ScoreBreakdownItem {
    fieldKey: string
    fieldLabel: string
    value: number
    maxValue: number
}

export interface ScoreResult {
    total: number
    breakdown: ScoreBreakdownItem[]
    isUnscored: boolean // true if no template or no scoreable fields
}

// ─── Pure scoring function ───

/**
 * Calculate a deterministic score for a review.
 *
 * Score = f(responses, fieldDefs)
 *
 * Rules:
 * - If fields is empty and responses is null/empty → isUnscored=true, total=0
 * - If fields is empty but responses has numeric values → fallback: sum all numbers
 * - score fields: add the numeric value
 * - multi_select fields: sum the `score` property of each selected option
 * - checkbox fields: add `checkedScore` if checked
 * - text / evidence_quote: no score contribution
 */
export function calculateScore(
    responses: Record<string, unknown> | null,
    fields: ReviewField[],
): ScoreResult {
    if (!responses) {
        return { total: 0, breakdown: [], isUnscored: true }
    }

    // Fallback: no template fields — sum all numeric values in responses
    if (fields.length === 0) {
        let total = 0
        const breakdown: ScoreBreakdownItem[] = []
        for (const [key, val] of Object.entries(responses)) {
            if (typeof val === "number") {
                total += val
                breakdown.push({ fieldKey: key, fieldLabel: key, value: val, maxValue: val })
            }
        }
        return {
            total,
            breakdown,
            isUnscored: breakdown.length === 0,
        }
    }

    // Template-driven scoring
    let total = 0
    const breakdown: ScoreBreakdownItem[] = []

    for (const field of fields) {
        const value = responses[field.key]
        if (value === undefined || value === null) continue

        switch (field.fieldType) {
            case "score": {
                if (typeof value === "number") {
                    total += value
                    breakdown.push({
                        fieldKey: field.key,
                        fieldLabel: field.label,
                        value,
                        maxValue: field.config.max ?? 5,
                    })
                }
                break
            }
            case "multi_select": {
                const opts = (field.config.options ?? []) as { value: string; score?: number }[]
                const scoreMap = new Map(opts.map(o => [o.value, o.score ?? 0]))
                let fieldTotal = 0
                let fieldMax = 0
                // Max = sum of all option scores (if all selected)
                for (const o of opts) fieldMax += o.score ?? 0
                if (Array.isArray(value)) {
                    for (const selected of value) {
                        fieldTotal += scoreMap.get(String(selected)) ?? 0
                    }
                }
                if (fieldMax > 0) {
                    total += fieldTotal
                    breakdown.push({
                        fieldKey: field.key,
                        fieldLabel: field.label,
                        value: fieldTotal,
                        maxValue: fieldMax,
                    })
                }
                break
            }
            case "checkbox": {
                const checkedScore = (field.config as ReviewFieldConfig).checkedScore ?? 0
                if (checkedScore > 0) {
                    const pts = value === true ? checkedScore : 0
                    total += pts
                    breakdown.push({
                        fieldKey: field.key,
                        fieldLabel: field.label,
                        value: pts,
                        maxValue: checkedScore,
                    })
                }
                break
            }
            // text and evidence_quote don't contribute to score
        }
    }

    return {
        total,
        breakdown,
        isUnscored: breakdown.length === 0,
    }
}

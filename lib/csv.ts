import type { Lead, Attempt, FieldDefinition } from "@/lib/store"

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCSVRow(values: string[]): string {
  return values.map((v) => escapeCSV(v ?? "")).join(",")
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportLeadsCSV(
  leads: Lead[],
  attempts: Attempt[],
  fieldDefinitions: FieldDefinition[]
) {
  const baseHeaders = [
    "Company",
    "Phone",
    "Email",
    "Website",
    "Segment",
    "Stage",
    "Deal Value",
    "Close Probability",
    "Lead Source",
    "Address",
    "Decision Maker",
    "Fleet Owner",
    "Attempts",
    "Last Outcome",
    "Next Action",
    "Created At",
  ]

  const customHeaders = fieldDefinitions.map((f) => f.fieldLabel)
  const headers = [...baseHeaders, ...customHeaders]

  const rows = leads.map((lead) => {
    const leadAttempts = attempts
      .filter((a) => a.leadId === lead.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const lastAttempt = leadAttempts[0]

    const baseValues = [
      lead.company,
      lead.phone ?? "",
      lead.email ?? "",
      lead.website ?? "",
      lead.segment,
      lead.stage ?? "New",
      lead.dealValue?.toString() ?? "",
      lead.closeProbability?.toString() ?? "",
      lead.leadSource ?? "",
      lead.address ?? "",
      lead.isDecisionMaker ?? "unknown",
      lead.isFleetOwner ?? "unknown",
      leadAttempts.length.toString(),
      lastAttempt?.outcome ?? "",
      lastAttempt?.nextAction ?? "",
      lead.createdAt,
    ]

    const customValues = fieldDefinitions.map((f) => {
      const val = lead.customFields?.[f.fieldKey]
      if (val === null || val === undefined) return ""
      if (Array.isArray(val)) return val.join("; ")
      return String(val)
    })

    return toCSVRow([...baseValues, ...customValues])
  })

  const csv = [toCSVRow(headers), ...rows].join("\n")
  const date = new Date().toISOString().slice(0, 10)
  downloadCSV(`leads-export-${date}.csv`, csv)
}

export function exportAttemptsCSV(attempts: Attempt[], leads: Lead[]) {
  const headers = [
    "Date",
    "Company",
    "Outcome",
    "Why",
    "Rep Mistake",
    "DM Reached",
    "Next Action",
    "Note",
    "Duration (sec)",
    "Experiment",
    "Direction",
    "Phone Dialed",
  ]

  const leadMap = new Map(leads.map((l) => [l.id, l]))

  const rows = attempts.map((a) => {
    const lead = leadMap.get(a.leadId)
    return toCSVRow([
      a.timestamp,
      lead?.company ?? "",
      a.outcome,
      a.why ?? "",
      a.repMistake ?? "",
      a.dmReached ? "Yes" : "No",
      a.nextAction,
      a.note ?? "",
      a.durationSec.toString(),
      a.experimentTag ?? "",
      a.direction ?? "",
      a.dialedNumber ?? "",
    ])
  })

  const csv = [toCSVRow(headers), ...rows].join("\n")
  const date = new Date().toISOString().slice(0, 10)
  downloadCSV(`attempts-export-${date}.csv`, csv)
}

// --- CSV Parsing ---

export interface ParsedCSV {
  headers: string[]
  rows: string[][]
  rowCount: number
}

export function parseCSV(text: string): ParsedCSV {
  const lines: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "\n" && !inQuotes) {
      lines.push(current)
      current = ""
    } else if (char === "\r" && !inQuotes) {
      // skip \r
    } else {
      current += char
    }
  }
  if (current.trim()) lines.push(current)

  const parseLine = (line: string): string[] => {
    const cells: string[] = []
    let cell = ""
    let q = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          q = !q
        }
      } else if (c === "," && !q) {
        cells.push(cell)
        cell = ""
      } else {
        cell += c
      }
    }
    cells.push(cell)
    return cells
  }

  if (lines.length === 0) return { headers: [], rows: [], rowCount: 0 }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine).filter((r) => r.some((c) => c.trim()))

  return { headers, rows, rowCount: rows.length }
}

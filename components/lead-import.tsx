"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react"
import { parseCSV, type ParsedCSV } from "@/lib/csv"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Lead, FieldDefinition } from "@/lib/store"

const LEAD_FIELDS = [
  { key: "company", label: "Company", required: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "segment", label: "Segment" },
  { key: "stage", label: "Stage" },
  { key: "deal_value", label: "Deal Value" },
  { key: "lead_source", label: "Lead Source" },
  { key: "address", label: "Address" },
  { key: "skip", label: "-- Skip this column --" },
]

interface LeadImportProps {
  fieldDefinitions: FieldDefinition[]
  onImported: (leads: Lead[]) => void
}

type Step = "upload" | "map" | "preview" | "done"

export function LeadImport({ fieldDefinitions, onImported }: LeadImportProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("upload")
  const [csv, setCSV] = useState<ParsedCSV | null>(null)
  const [mapping, setMapping] = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState({ imported: 0, skipped: 0 })

  const allFields = [
    ...LEAD_FIELDS,
    ...fieldDefinitions.map((f) => ({ key: `custom:${f.fieldKey}`, label: `${f.fieldLabel} (custom)` })),
  ]

  const reset = () => {
    setStep("upload")
    setCSV(null)
    setMapping({})
    setImporting(false)
    setResult({ imported: 0, skipped: 0 })
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) return
      const parsed = parseCSV(text)
      setCSV(parsed)

      // Auto-map columns by fuzzy header matching
      const autoMap: Record<number, string> = {}
      parsed.headers.forEach((header, i) => {
        const h = header.toLowerCase().trim()
        for (const field of allFields) {
          if (field.key === "skip") continue
          const label = field.label.toLowerCase()
          const key = field.key.replace("custom:", "").replace(/_/g, " ")
          if (h === label || h === key || h === field.key) {
            autoMap[i] = field.key
            break
          }
        }
      })
      setMapping(autoMap)
      setStep("map")
    }
    reader.readAsText(file)
  }, [allFields])

  const handleImport = async () => {
    if (!csv) return

    const companyColIdx = Object.entries(mapping).find(([, v]) => v === "company")?.[0]
    if (companyColIdx === undefined) {
      toast({ variant: "destructive", title: "Company column required", description: "Map at least the Company column before importing." })
      return
    }

    setImporting(true)
    setStep("preview")

    const supabase = getSupabase()
    let imported = 0
    let skipped = 0

    // Build rows
    const insertRows: Record<string, unknown>[] = []
    for (const row of csv.rows) {
      const company = row[Number(companyColIdx)]?.trim()
      if (!company) {
        skipped++
        continue
      }

      const record: Record<string, unknown> = { company }
      const customFields: Record<string, unknown> = {}

      for (const [colStr, fieldKey] of Object.entries(mapping)) {
        const col = Number(colStr)
        const val = row[col]?.trim() ?? ""
        if (!val || fieldKey === "skip") continue

        if (fieldKey.startsWith("custom:")) {
          customFields[fieldKey.replace("custom:", "")] = val
        } else if (fieldKey === "deal_value") {
          const num = parseFloat(val)
          if (!isNaN(num)) record.deal_value = num
        } else {
          record[fieldKey] = val
        }
      }

      if (Object.keys(customFields).length > 0) {
        record.custom_fields = customFields
      }

      insertRows.push(record)
    }

    // Batch insert in chunks of 50
    const chunkSize = 50
    const importedLeads: Lead[] = []

    for (let i = 0; i < insertRows.length; i += chunkSize) {
      const chunk = insertRows.slice(i, i + chunkSize)
      const { data, error } = await supabase
        .from("leads")
        .insert(chunk)
        .select()

      if (error) {
        toast({ variant: "destructive", title: "Import error", description: error.message })
        skipped += chunk.length
      } else if (data) {
        imported += data.length
        // Minimal lead mapping for the callback
        for (const row of data) {
          importedLeads.push({
            id: row.id,
            company: row.company,
            phone: row.phone,
            segment: row.segment ?? "Unknown",
            contacts: [],
            customFields: row.custom_fields ?? {},
            createdAt: row.created_at,
            stage: row.stage,
          } as Lead)
        }
      }
    }

    setResult({ imported, skipped })
    setImporting(false)
    setStep("done")

    if (importedLeads.length > 0) {
      onImported(importedLeads)
    }
  }

  const companyMapped = Object.values(mapping).includes("company")

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { reset(); setOpen(true) }}>
        <Upload className="h-4 w-4 mr-1" />
        Import
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === "upload" && "Import Leads from CSV"}
              {step === "map" && "Map Columns"}
              {step === "preview" && "Importing..."}
              {step === "done" && "Import Complete"}
            </DialogTitle>
            <DialogDescription>
              {step === "upload" && "Upload a CSV file with your leads data."}
              {step === "map" && `${csv?.rowCount ?? 0} rows found. Map CSV columns to lead fields.`}
              {step === "preview" && "Writing leads to database..."}
              {step === "done" && `${result.imported} leads imported, ${result.skipped} skipped.`}
            </DialogDescription>
          </DialogHeader>

          {step === "upload" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="border-2 border-dashed rounded-lg p-8 text-center w-full">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">
                  Drop a CSV file here or click to browse
                </p>
                <label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button variant="outline" asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                First row must be headers. Supported: CSV with comma delimiter.
              </p>
            </div>
          )}

          {step === "map" && csv && (
            <div className="space-y-4">
              <div className="border rounded-lg divide-y max-h-[50vh] overflow-y-auto">
                {csv.headers.map((header, i) => {
                  const mapped = mapping[i]
                  const isMapped = mapped && mapped !== "skip"
                  return (
                    <div key={i} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{header}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            e.g. {csv.rows[0]?.[i] ?? "—"}
                          </p>
                        </div>
                        {isMapped && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {allFields.find((f) => f.key === mapped)?.label ?? mapped}
                          </Badge>
                        )}
                      </div>
                      <Select
                        value={mapping[i] ?? "skip"}
                        onValueChange={(v) => setMapping((prev) => ({ ...prev, [i]: v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="-- Skip this column --" />
                        </SelectTrigger>
                        <SelectContent>
                          {allFields.map((f) => (
                            <SelectItem key={f.key} value={f.key}>
                              {f.label}
                              {f.key === "company" ? " *" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
              {!companyMapped && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Map at least the Company column to import.
                </p>
              )}
            </div>
          )}

          {step === "preview" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Importing {csv?.rowCount ?? 0} rows...</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <div className="text-center">
                <p className="text-lg font-medium">{result.imported} leads imported</p>
                {result.skipped > 0 && (
                  <p className="text-sm text-muted-foreground">{result.skipped} rows skipped (missing company name or errors)</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {step === "upload" && (
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            )}
            {step === "map" && (
              <>
                <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
                <Button onClick={handleImport} disabled={!companyMapped}>
                  Import {csv?.rowCount ?? 0} Leads
                </Button>
              </>
            )}
            {step === "done" && (
              <Button onClick={() => setOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import { useState, useCallback, useMemo } from "react"
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react"
import { parseCSV, type ParsedCSV } from "@/lib/csv"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Lead, FieldDefinition } from "@/lib/store"

// All real columns on the leads table
const LEAD_FIELDS = [
  { key: "company", label: "Company", required: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "address", label: "Address" },
  { key: "segment", label: "Segment" },
  { key: "lead_source", label: "Lead Source" },
  { key: "stage", label: "Pipeline Stage" },
  { key: "deal_value", label: "Deal Value" },
  { key: "close_probability", label: "Close Probability" },
  { key: "operational_context", label: "Operational Context" },
  { key: "opportunity_angle", label: "Opportunity Angle" },
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

  // Existing custom fields from field_definitions
  const existingCustomFields = useMemo(
    () => fieldDefinitions.map((f) => ({ key: `custom:${f.fieldKey}`, label: f.fieldLabel })),
    [fieldDefinitions]
  )

  // CSV headers that aren't matched to built-in or existing custom fields get offered as new custom fields
  const newCustomFieldOptions = useMemo(() => {
    if (!csv) return []
    const builtInKeys = new Set(LEAD_FIELDS.map((f) => f.key))
    const existingCustomKeys = new Set(fieldDefinitions.map((f) => f.fieldKey))
    const opts: { key: string; label: string }[] = []
    const seen = new Set<string>()

    for (const header of csv.headers) {
      const normalized = header.toLowerCase().trim().replace(/\s+/g, "_")
      if (builtInKeys.has(normalized) || existingCustomKeys.has(normalized) || seen.has(normalized)) continue
      seen.add(normalized)
      opts.push({ key: `new_custom:${normalized}`, label: header })
    }
    return opts
  }, [csv, fieldDefinitions])

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
        const hNorm = h.replace(/\s+/g, "_")

        // Check built-in fields
        for (const field of LEAD_FIELDS) {
          const label = field.label.toLowerCase()
          const key = field.key.replace(/_/g, " ")
          if (h === label || h === key || h === field.key || hNorm === field.key) {
            autoMap[i] = field.key
            return
          }
        }

        // Check existing custom fields
        for (const fd of fieldDefinitions) {
          const label = fd.fieldLabel.toLowerCase()
          const key = fd.fieldKey.toLowerCase()
          if (h === label || h === key || hNorm === fd.fieldKey) {
            autoMap[i] = `custom:${fd.fieldKey}`
            return
          }
        }

        // No match → auto-map to "new custom field" for this CSV header
        const newKey = `new_custom:${hNorm}`
        autoMap[i] = newKey
      })
      setMapping(autoMap)
      setStep("map")
    }
    reader.readAsText(file)
  }, [fieldDefinitions])

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

    // Auto-create field_definitions for any new_custom: fields being used
    const newCustomKeysUsed = new Set<string>()
    for (const fieldKey of Object.values(mapping)) {
      if (fieldKey.startsWith("new_custom:")) {
        newCustomKeysUsed.add(fieldKey.replace("new_custom:", ""))
      }
    }

    if (newCustomKeysUsed.size > 0) {
      const existingKeys = new Set(fieldDefinitions.map((f) => f.fieldKey))
      const toCreate = [...newCustomKeysUsed]
        .filter((k) => !existingKeys.has(k))
        .map((k, idx) => ({
          entity_type: "lead",
          field_key: k,
          field_label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          field_type: "text",
          position: fieldDefinitions.length + idx,
        }))

      if (toCreate.length > 0) {
        try {
          await supabase.from("field_definitions").insert(toCreate)
        } catch {
          // Non-critical — fields will still import into custom_fields JSONB
        }
      }
    }

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
        } else if (fieldKey.startsWith("new_custom:")) {
          customFields[fieldKey.replace("new_custom:", "")] = val
        } else if (fieldKey === "deal_value" || fieldKey === "close_probability") {
          const num = parseFloat(val)
          if (!isNaN(num)) record[fieldKey] = num
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

  // Count how many columns are mapped (not skipped)
  const mappedCount = Object.values(mapping).filter((v) => v !== "skip").length
  const totalCols = csv?.headers.length ?? 0

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
              {step === "map" && `${csv?.rowCount ?? 0} rows found. ${mappedCount}/${totalCols} columns mapped.`}
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
                  const isNewCustom = mapped?.startsWith("new_custom:")
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
                          <Badge
                            variant={isNewCustom ? "outline" : "secondary"}
                            className="shrink-0 text-xs"
                          >
                            {isNewCustom ? `+ ${header} (new field)` :
                              (LEAD_FIELDS.find((f) => f.key === mapped)?.label ??
                               existingCustomFields.find((f) => f.key === mapped)?.label ??
                               mapped)}
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
                          <SelectItem value="skip">-- Skip this column --</SelectItem>
                          <SelectGroup>
                            <SelectLabel>Lead Fields</SelectLabel>
                            {LEAD_FIELDS.map((f) => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label}{f.required ? " *" : ""}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          {existingCustomFields.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>Custom Fields</SelectLabel>
                              {existingCustomFields.map((f) => (
                                <SelectItem key={f.key} value={f.key}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                          {newCustomFieldOptions.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>Create New Custom Field</SelectLabel>
                              {newCustomFieldOptions.map((f) => (
                                <SelectItem key={f.key} value={f.key}>
                                  + {f.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
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

"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Plus } from "lucide-react"
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

// Common CSV header aliases → lead field key
const FIELD_ALIASES: Record<string, string> = {
  "name": "company",
  "business": "company",
  "business name": "company",
  "business_name": "company",
  "company name": "company",
  "company_name": "company",
  "organization": "company",
  "org": "company",
  "account": "company",
  "account name": "company",
  "account_name": "company",
  "phone number": "phone",
  "phone_number": "phone",
  "telephone": "phone",
  "tel": "phone",
  "mobile": "phone",
  "cell": "phone",
  "email address": "email",
  "email_address": "email",
  "e-mail": "email",
  "site": "website",
  "url": "website",
  "web": "website",
  "homepage": "website",
  "street": "address",
  "location": "address",
  "source": "lead_source",
  "lead source": "lead_source",
  "origin": "lead_source",
  "stage": "stage",
  "pipeline stage": "stage",
  "pipeline_stage": "stage",
  "deal value": "deal_value",
  "value": "deal_value",
  "amount": "deal_value",
  "revenue": "deal_value",
}

const NEW_CUSTOM_SENTINEL = "__new_custom__"

interface LeadImportProps {
  fieldDefinitions: FieldDefinition[]
  onImported: (leads: Lead[]) => void
}

type Step = "upload" | "map" | "preview" | "done"

// Per-column mapping row
function ColumnMappingRow({
  header,
  sample,
  value,
  customName,
  existingCustomFields,
  onChange,
  onCustomNameChange,
}: {
  header: string
  sample: string
  value: string
  customName: string
  existingCustomFields: { key: string; label: string }[]
  onChange: (v: string) => void
  onCustomNameChange: (name: string) => void
}) {
  const isNewCustom = value === NEW_CUSTOM_SENTINEL
  const isBuiltIn = LEAD_FIELDS.some((f) => f.key === value)
  const isExistingCustom = value.startsWith("custom:")

  let badgeLabel = ""
  if (isBuiltIn) {
    badgeLabel = LEAD_FIELDS.find((f) => f.key === value)?.label ?? value
  } else if (isExistingCustom) {
    badgeLabel = existingCustomFields.find((f) => f.key === value)?.label ?? value
  } else if (isNewCustom && customName) {
    badgeLabel = `+ ${customName}`
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{header}</p>
          <p className="text-xs text-muted-foreground truncate">e.g. {sample}</p>
        </div>
        {value !== "skip" && badgeLabel && (
          <Badge
            variant={isNewCustom ? "outline" : "secondary"}
            className="shrink-0 text-xs"
          >
            {badgeLabel}
          </Badge>
        )}
      </div>
      <Select value={value} onValueChange={onChange}>
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
              <SelectLabel>Existing Custom Fields</SelectLabel>
              {existingCustomFields.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          <SelectGroup>
            <SelectLabel>Other</SelectLabel>
            <SelectItem value={NEW_CUSTOM_SENTINEL}>
              <span className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                Save as new custom field...
              </span>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      {isNewCustom && (
        <Input
          value={customName}
          onChange={(e) => onCustomNameChange(e.target.value)}
          placeholder={`Custom field name (e.g. "${header}")`}
          className="text-sm"
          autoFocus
        />
      )}
    </div>
  )
}

export function LeadImport({ fieldDefinitions, onImported }: LeadImportProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("upload")
  const [csv, setCSV] = useState<ParsedCSV | null>(null)
  const [mapping, setMapping] = useState<Record<number, string>>({})
  // Stores the user-typed custom field name per column index
  const [customNames, setCustomNames] = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState({ imported: 0, skipped: 0 })

  const existingCustomFields = useMemo(
    () => fieldDefinitions.map((f) => ({ key: `custom:${f.fieldKey}`, label: f.fieldLabel })),
    [fieldDefinitions]
  )

  const reset = () => {
    setStep("upload")
    setCSV(null)
    setMapping({})
    setCustomNames({})
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

        // Check exact match on built-in fields
        for (const field of LEAD_FIELDS) {
          const label = field.label.toLowerCase()
          const key = field.key.replace(/_/g, " ")
          if (h === label || h === key || h === field.key || hNorm === field.key) {
            autoMap[i] = field.key
            return
          }
        }

        // Check aliases
        if (FIELD_ALIASES[h]) {
          autoMap[i] = FIELD_ALIASES[h]
          return
        }
        if (FIELD_ALIASES[hNorm]) {
          autoMap[i] = FIELD_ALIASES[hNorm]
          return
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

        // No match → default to skip so user can choose
        autoMap[i] = "skip"
      })
      setMapping(autoMap)
      setCustomNames({})
      setStep("map")
    }
    reader.readAsText(file)
  }, [fieldDefinitions])

  const handleImport = async () => {
    if (!csv) return

    const companyColIdx = Object.entries(mapping).find(([, v]) => v === "company")?.[0]

    // Validate that all "new custom" selections have names
    for (const [colStr, val] of Object.entries(mapping)) {
      if (val === NEW_CUSTOM_SENTINEL && !customNames[Number(colStr)]?.trim()) {
        toast({ variant: "destructive", title: "Missing custom field name", description: `Please enter a name for the "${csv.headers[Number(colStr)]}" custom field.` })
        return
      }
    }

    setImporting(true)
    setStep("preview")

    const supabase = getSupabase()
    let imported = 0
    let skipped = 0

    // Auto-create field_definitions for new custom fields
    const newCustomKeysUsed = new Map<string, string>() // normalized_key → label
    for (const [colStr, val] of Object.entries(mapping)) {
      if (val === NEW_CUSTOM_SENTINEL) {
        const name = customNames[Number(colStr)]?.trim()
        if (name) {
          const key = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
          newCustomKeysUsed.set(key, name)
        }
      }
    }

    if (newCustomKeysUsed.size > 0) {
      const existingKeys = new Set(fieldDefinitions.map((f) => f.fieldKey))
      const toCreate = [...newCustomKeysUsed.entries()]
        .filter(([k]) => !existingKeys.has(k))
        .map(([k, label], idx) => ({
          entity_type: "lead",
          field_key: k,
          field_label: label,
          field_type: "text",
          position: fieldDefinitions.length + idx,
        }))

      if (toCreate.length > 0) {
        try {
          await supabase.from("field_definitions").insert(toCreate)
        } catch {
          // Non-critical — values still go into custom_fields JSONB
        }
      }
    }

    // Build a resolved mapping: column index → { target: "field_key" | "custom:key", isCustom: boolean }
    const resolvedMapping: Record<number, { target: string; isCustom: boolean }> = {}
    for (const [colStr, val] of Object.entries(mapping)) {
      const col = Number(colStr)
      if (val === "skip") continue
      if (val === NEW_CUSTOM_SENTINEL) {
        const name = customNames[col]?.trim()
        if (name) {
          const key = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
          resolvedMapping[col] = { target: key, isCustom: true }
        }
      } else if (val.startsWith("custom:")) {
        resolvedMapping[col] = { target: val.replace("custom:", ""), isCustom: true }
      } else {
        resolvedMapping[col] = { target: val, isCustom: false }
      }
    }

    // Build rows
    const insertRows: Record<string, unknown>[] = []
    for (let rowIdx = 0; rowIdx < csv.rows.length; rowIdx++) {
      const row = csv.rows[rowIdx]

      // Get company name: from mapped column, or first non-empty text value, or fallback
      let company = companyColIdx !== undefined ? row[Number(companyColIdx)]?.trim() : ""
      if (!company) {
        // Try to use the first non-empty mapped value as company name
        for (const [colStr, resolved] of Object.entries(resolvedMapping)) {
          const val = row[Number(colStr)]?.trim()
          if (val && !resolved.isCustom) {
            company = val
            break
          }
        }
      }
      if (!company) {
        company = `Imported Lead #${rowIdx + 1}`
      }

      const record: Record<string, unknown> = { company }
      const customFields: Record<string, unknown> = {}

      for (const [colStr, resolved] of Object.entries(resolvedMapping)) {
        const col = Number(colStr)
        const val = row[col]?.trim() ?? ""
        if (!val) continue

        if (resolved.isCustom) {
          customFields[resolved.target] = val
        } else if (resolved.target === "deal_value" || resolved.target === "close_probability") {
          const num = parseFloat(val)
          if (!isNaN(num)) record[resolved.target] = num
        } else if (resolved.target !== "company") {
          record[resolved.target] = val
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
  const hasAnyMapping = Object.values(mapping).some((v) => v !== "skip")

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
                {csv.headers.map((header, i) => (
                  <ColumnMappingRow
                    key={i}
                    header={header}
                    sample={csv.rows[0]?.[i] ?? "—"}
                    value={mapping[i] ?? "skip"}
                    customName={customNames[i] ?? ""}
                    existingCustomFields={existingCustomFields}
                    onChange={(v) => setMapping((prev) => ({ ...prev, [i]: v }))}
                    onCustomNameChange={(name) => setCustomNames((prev) => ({ ...prev, [i]: name }))}
                  />
                ))}
              </div>
              {!companyMapped && hasAnyMapping && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Tip: Map a column to Company for best results. Otherwise, a fallback name will be used.
                </p>
              )}
              {!hasAnyMapping && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Map at least one column to import.
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
                <Button onClick={handleImport} disabled={!hasAnyMapping}>
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

"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
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
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Users, Building2, BarChart3, Wrench } from "lucide-react"
import { parseCSV, type ParsedCSV } from "@/lib/csv"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useProjectId } from "@/hooks/use-project-id"
import type { Lead, FieldDefinition } from "@/lib/store"

// ─── Unified Field Registry ───────────────────────────────────────

interface MappableField {
  key: string
  label: string
  group: "company" | "contact" | "pipeline" | "custom"
  entity: "lead" | "contact"
  dbColumn: string        // actual column name written to DB
  required?: boolean
  fieldType?: string      // for auto-creating field_definitions
}

const BUILT_IN_LEAD_FIELDS: MappableField[] = [
  { key: "company", label: "Company Name", group: "company", entity: "lead", dbColumn: "company", required: true },
  { key: "phone", label: "Main Phone", group: "company", entity: "lead", dbColumn: "phone" },
  { key: "email", label: "Company Email", group: "company", entity: "lead", dbColumn: "email" },
  { key: "website", label: "Website", group: "company", entity: "lead", dbColumn: "website" },
  { key: "address", label: "Address", group: "company", entity: "lead", dbColumn: "address" },
  { key: "segment", label: "Segment", group: "company", entity: "lead", dbColumn: "segment" },
  { key: "lead_source", label: "Lead Source", group: "company", entity: "lead", dbColumn: "lead_source" },
  { key: "operational_context", label: "Operational Context", group: "company", entity: "lead", dbColumn: "operational_context" },
  { key: "opportunity_angle", label: "Opportunity Angle", group: "company", entity: "lead", dbColumn: "opportunity_angle" },
  { key: "stage", label: "Pipeline Stage", group: "pipeline", entity: "lead", dbColumn: "stage" },
  { key: "deal_value", label: "Deal Value", group: "pipeline", entity: "lead", dbColumn: "deal_value" },
  { key: "close_probability", label: "Close Probability", group: "pipeline", entity: "lead", dbColumn: "close_probability" },
]

const BUILT_IN_CONTACT_FIELDS: MappableField[] = [
  { key: "contact_first_name", label: "Contact First Name", group: "contact", entity: "contact", dbColumn: "first_name" },
  { key: "contact_last_name", label: "Contact Last Name", group: "contact", entity: "contact", dbColumn: "last_name" },
  { key: "contact_full_name", label: "Contact Full Name", group: "contact", entity: "contact", dbColumn: "name" },
  { key: "contact_job_title", label: "Job Title", group: "contact", entity: "contact", dbColumn: "job_title" },
  { key: "contact_mobile", label: "Mobile Phone", group: "contact", entity: "contact", dbColumn: "mobile_phone" },
  { key: "contact_work_phone", label: "Work Phone", group: "contact", entity: "contact", dbColumn: "work_phone" },
  { key: "contact_email", label: "Personal Email", group: "contact", entity: "contact", dbColumn: "email" },
  { key: "contact_linkedin", label: "LinkedIn", group: "contact", entity: "contact", dbColumn: "linkedin" },
  { key: "contact_seniority", label: "Seniority Level", group: "contact", entity: "contact", dbColumn: "seniority_level" },
]

// ─── Built-in Aliases ─────────────────────────────────────────────

const BUILT_IN_ALIASES: Record<string, string> = {
  // Company
  "name": "company", "business": "company", "business name": "company",
  "business_name": "company", "company name": "company", "company_name": "company",
  "organization": "company", "org": "company", "account": "company",
  "account name": "company", "account_name": "company",
  // Contact names
  "full name": "contact_full_name", "full_name": "contact_full_name",
  "contact name": "contact_full_name", "contact_name": "contact_full_name",
  "first name": "contact_first_name", "first_name": "contact_first_name",
  "given name": "contact_first_name", "given_name": "contact_first_name",
  "fname": "contact_first_name", "firstname": "contact_first_name",
  "last name": "contact_last_name", "last_name": "contact_last_name",
  "surname": "contact_last_name", "family name": "contact_last_name",
  "family_name": "contact_last_name", "lname": "contact_last_name",
  "lastname": "contact_last_name",
  // Job info
  "title": "contact_job_title", "job title": "contact_job_title",
  "job_title": "contact_job_title", "position": "contact_job_title",
  "designation": "contact_job_title",
  "seniority": "contact_seniority", "seniority level": "contact_seniority",
  "seniority_level": "contact_seniority",
  // Phones
  "mobile": "contact_mobile", "mobile number": "contact_mobile",
  "mobile_number": "contact_mobile", "cell": "contact_mobile",
  "cell phone": "contact_mobile", "cell_phone": "contact_mobile",
  "personal phone": "contact_mobile", "personal_phone": "contact_mobile",
  "mobile phone": "contact_mobile", "mobile_phone": "contact_mobile",
  "company phone": "contact_work_phone", "company_phone": "contact_work_phone",
  "work phone": "contact_work_phone", "work_phone": "contact_work_phone",
  "office phone": "contact_work_phone", "office_phone": "contact_work_phone",
  "direct": "contact_work_phone", "direct line": "contact_work_phone",
  "direct_line": "contact_work_phone", "direct phone": "contact_work_phone",
  "phone number": "phone", "phone_number": "phone",
  "telephone": "phone", "tel": "phone",
  // Email
  "email address": "email", "email_address": "email",
  "e-mail": "email", "e_mail": "email",
  "personal email": "contact_email", "personal_email": "contact_email",
  "work email": "email", "work_email": "email",
  "company email": "email", "company_email": "email",
  // Web
  "linkedin": "contact_linkedin", "linkedin url": "contact_linkedin",
  "linkedin_url": "contact_linkedin", "li url": "contact_linkedin",
  "linkedin profile": "contact_linkedin", "linkedin_profile": "contact_linkedin",
  "website": "website", "company website": "website",
  "company_website": "website", "url": "website", "site": "website",
  "homepage": "website", "web": "website",
  // Pipeline
  "source": "lead_source", "lead source": "lead_source",
  "origin": "lead_source", "campaign": "lead_source",
  "stage": "stage", "pipeline stage": "stage", "pipeline_stage": "stage",
  "deal value": "deal_value", "value": "deal_value",
  "amount": "deal_value", "revenue": "deal_value",
  "close probability": "close_probability", "probability": "close_probability",
  // Sub-market / market / industry → segment
  "sub_market": "segment", "sub market": "segment", "submarket": "segment",
  "market": "segment", "industry": "segment", "sector": "segment",
  "vertical": "segment", "niche": "segment", "category": "segment",
}

const SKIP_VALUE = "__skip__"
const AUTO_CUSTOM_PREFIX = "__auto_custom__:"

// ─── Helpers ──────────────────────────────────────────────────────

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, " ")
}

function normalizeKey(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
}

function isContactField(key: string): boolean {
  return key.startsWith("contact_") || BUILT_IN_CONTACT_FIELDS.some(f => f.key === key)
}

// ─── Types ────────────────────────────────────────────────────────

interface LeadImportProps {
  fieldDefinitions: FieldDefinition[]
  onImported: (leads: Lead[]) => void
}

type Step = "upload" | "map" | "preview" | "done"

type MappingStatus = "matched" | "new_field" | "skip"

interface SavedAlias {
  alias: string
  target_key: string
  target_entity: string
}

// ─── Main Component ───────────────────────────────────────────────

export function LeadImport({ fieldDefinitions, onImported }: LeadImportProps) {
  const { toast } = useToast()
  const projectId = useProjectId()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("upload")
  const [csv, setCSV] = useState<ParsedCSV | null>(null)
  const [mapping, setMapping] = useState<Record<number, string>>({})
  const [autoMap, setAutoMap] = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState({ imported: 0, contacts: 0, skipped: 0 })
  const [savedAliases, setSavedAliases] = useState<SavedAlias[]>([])

  // Build unified field list
  const allFields = useMemo((): MappableField[] => {
    const fields: MappableField[] = [
      ...BUILT_IN_LEAD_FIELDS,
      ...BUILT_IN_CONTACT_FIELDS,
    ]
    // Add existing custom fields from field_definitions
    for (const fd of fieldDefinitions) {
      // Skip if it already matches a built-in key
      const alreadyExists = fields.some(f => f.key === fd.fieldKey || f.dbColumn === fd.fieldKey)
      if (!alreadyExists) {
        fields.push({
          key: fd.fieldKey,
          label: fd.fieldLabel,
          group: "custom",
          entity: "lead",
          dbColumn: fd.fieldKey,
          fieldType: fd.fieldType,
        })
      }
    }
    return fields
  }, [fieldDefinitions])

  // Field lookup map
  const fieldByKey = useMemo(() => {
    const map = new Map<string, MappableField>()
    allFields.forEach(f => map.set(f.key, f))
    return map
  }, [allFields])

  // Load saved aliases on mount
  useEffect(() => {
    if (!projectId) return
    const load = async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from("field_aliases")
        .select("alias, target_key, target_entity")
        .eq("project_id", projectId)
      if (data) setSavedAliases(data as SavedAlias[])
    }
    load().catch(() => {
      // Table might not exist yet — that's OK
    })
  }, [projectId])

  const reset = () => {
    setStep("upload")
    setCSV(null)
    setMapping({})
    setAutoMap({})
    setImporting(false)
    setResult({ imported: 0, contacts: 0, skipped: 0 })
  }

  // ─── Auto-Mapping Engine ──────────────────────────────────────

  const performAutoMap = useCallback((parsed: ParsedCSV) => {
    const map: Record<number, string> = {}

    parsed.headers.forEach((header, i) => {
      const h = normalizeHeader(header)
      const hKey = normalizeKey(header)

      // Priority 1: Saved aliases (user-confirmed from previous imports)
      const savedAlias = savedAliases.find(a => a.alias === h)
      if (savedAlias) {
        map[i] = savedAlias.target_key
        return
      }

      // Priority 2: Exact match on built-in field key or label
      for (const field of allFields) {
        if (hKey === field.key || hKey === field.dbColumn ||
            h === field.label.toLowerCase() ||
            hKey === normalizeKey(field.label)) {
          map[i] = field.key
          return
        }
      }

      // Priority 3: Built-in aliases
      if (BUILT_IN_ALIASES[h]) {
        map[i] = BUILT_IN_ALIASES[h]
        return
      }
      // Also check with underscores
      if (BUILT_IN_ALIASES[hKey]) {
        map[i] = BUILT_IN_ALIASES[hKey]
        return
      }

      // Priority 4: Fuzzy match against existing custom field_definitions
      for (const fd of fieldDefinitions) {
        const fdLabel = fd.fieldLabel.toLowerCase()
        const fdKey = fd.fieldKey.toLowerCase()
        if (h === fdLabel || hKey === fdKey || hKey === normalizeKey(fd.fieldLabel)) {
          map[i] = fd.fieldKey
          return
        }
      }

      // Priority 5: Default to auto-create as custom field
      map[i] = AUTO_CUSTOM_PREFIX + hKey
    })

    return map
  }, [allFields, fieldDefinitions, savedAliases])

  // ─── File Handler ─────────────────────────────────────────────

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) return
      const parsed = parseCSV(text)
      setCSV(parsed)

      const auto = performAutoMap(parsed)
      setMapping(auto)
      setAutoMap(auto)
      setStep("map")
    }
    reader.readAsText(file)
  }, [performAutoMap])

  // ─── Mapping Status ───────────────────────────────────────────

  const getMappingStatus = useCallback((value: string): MappingStatus => {
    if (value === SKIP_VALUE) return "skip"
    if (value.startsWith(AUTO_CUSTOM_PREFIX)) return "new_field"
    if (fieldByKey.has(value)) return "matched"
    // Check if it's a known custom field key
    if (fieldDefinitions.some(fd => fd.fieldKey === value)) return "matched"
    return "new_field"
  }, [fieldByKey, fieldDefinitions])

  // ─── Import Engine ────────────────────────────────────────────

  const handleImport = async () => {
    if (!csv || !projectId) return
    setImporting(true)
    setStep("preview")

    const supabase = getSupabase()
    let importedLeads = 0
    let importedContacts = 0
    let skipped = 0

    // Resolve mappings: figure out what goes where
    const leadFieldMappings: { colIdx: number; field: MappableField }[] = []
    const contactFieldMappings: { colIdx: number; field: MappableField }[] = []
    const customFieldMappings: { colIdx: number; fieldKey: string; fieldLabel: string }[] = []

    for (const [colStr, value] of Object.entries(mapping)) {
      const colIdx = Number(colStr)
      if (value === SKIP_VALUE) continue

      if (value.startsWith(AUTO_CUSTOM_PREFIX)) {
        const key = value.replace(AUTO_CUSTOM_PREFIX, "")
        const label = csv.headers[colIdx]
        customFieldMappings.push({ colIdx, fieldKey: key, fieldLabel: label })
        continue
      }

      const field = fieldByKey.get(value)
      if (field) {
        if (field.entity === "contact") {
          contactFieldMappings.push({ colIdx, field })
        } else if (field.group === "custom") {
          // Custom fields go into custom_fields JSONB, not as top-level columns
          customFieldMappings.push({ colIdx, fieldKey: field.key, fieldLabel: field.label })
        } else {
          leadFieldMappings.push({ colIdx, field })
        }
      } else {
        // Existing custom field from field_definitions
        const fd = fieldDefinitions.find(f => f.fieldKey === value)
        if (fd) {
          customFieldMappings.push({ colIdx, fieldKey: fd.fieldKey, fieldLabel: fd.fieldLabel })
        }
      }
    }

    // Auto-create field_definitions for new custom fields
    const existingKeys = new Set(fieldDefinitions.map(f => f.fieldKey))
    const newCustomFields = customFieldMappings.filter(m => !existingKeys.has(m.fieldKey))
    if (newCustomFields.length > 0) {
      const toCreate = newCustomFields.map((m, idx) => ({
        entity_type: "lead",
        field_key: m.fieldKey,
        field_label: m.fieldLabel,
        field_type: "text",
        position: fieldDefinitions.length + idx,
        project_id: projectId,
      }))
      try {
        await supabase.from("field_definitions").insert(toCreate)
      } catch {
        // Non-critical — values still go into custom_fields JSONB
      }
    }

    // Determine if we should deduplicate by company
    const companyMapping = leadFieldMappings.find(m => m.field.key === "company")
    const hasContactFields = contactFieldMappings.length > 0

    if (companyMapping) {
      // ── DEDUP MODE: Group rows by company name ──
      const groups = new Map<string, number[]>() // normalized company → row indices
      for (let rowIdx = 0; rowIdx < csv.rows.length; rowIdx++) {
        const row = csv.rows[rowIdx]
        const companyRaw = row[companyMapping.colIdx]?.trim() || ""
        if (!companyRaw) {
          skipped++
          continue
        }
        const companyKey = companyRaw.toLowerCase()
        if (!groups.has(companyKey)) groups.set(companyKey, [])
        groups.get(companyKey)!.push(rowIdx)
      }

      // Process each company group
      const chunkSize = 50
      const leadBatch: Record<string, unknown>[] = []
      const leadGroupMap: { leadRecord: Record<string, unknown>; rowIndices: number[] }[] = []

      for (const [, rowIndices] of groups) {
        // Build lead record from first non-empty value across all rows in group
        const record: Record<string, unknown> = { project_id: projectId }
        const customFields: Record<string, unknown> = {}

        for (const m of leadFieldMappings) {
          for (const rowIdx of rowIndices) {
            const val = csv.rows[rowIdx][m.colIdx]?.trim()
            if (val && record[m.field.dbColumn] === undefined) {
              if (m.field.key === "deal_value" || m.field.key === "close_probability") {
                const num = parseFloat(val)
                if (!isNaN(num)) record[m.field.dbColumn] = num
              } else {
                record[m.field.dbColumn] = val
              }
              break
            }
          }
        }

        // Custom fields: first non-empty from group
        for (const m of customFieldMappings) {
          for (const rowIdx of rowIndices) {
            const val = csv.rows[rowIdx][m.colIdx]?.trim()
            if (val && customFields[m.fieldKey] === undefined) {
              customFields[m.fieldKey] = val
              break
            }
          }
        }

        // Mirror mapped contact fields backwards to the Lead's custom fields or phone
        // This ensures the custom fields (like "Full Name", "Job Title") in the LeadDrawer are populated
        if (contactFieldMappings.length > 0) {
          const firstRow = csv.rows[rowIndices[0]]
          for (const m of contactFieldMappings) {
            const val = firstRow[m.colIdx]?.trim()
            if (!val) continue
            
            if (m.field.key === "contact_mobile" || m.field.key === "contact_work_phone") {
              const digits = (val.match(/\d/g) || []).length
              if (digits >= 5 && record.phone === undefined) record.phone = val
            }
            
            // Generate a likely custom field key (e.g. "contact_full_name" -> "full_name")
            const baseKey = m.field.key.replace("contact_", "")
            
            // Check if there is an existing fieldDefinition to match against
            const fd = fieldDefinitions.find(f => 
              f.fieldKey === baseKey || 
              f.fieldKey === m.field.label.toLowerCase().replace(/\s+/g, '_') ||
              (baseKey === "mobile" && f.fieldKey === "mobile_number")
            )
            
            const targetKey = fd ? fd.fieldKey : (baseKey === "mobile" ? "mobile_number" : baseKey)
            if (customFields[targetKey] === undefined) {
              customFields[targetKey] = val
            }
          }
        }

        if (Object.keys(customFields).length > 0) {
          record.custom_fields = customFields
        }

        leadBatch.push(record)
        leadGroupMap.push({ leadRecord: record, rowIndices })
      }

      // Batch-insert leads
      const insertedLeads: Lead[] = []
      for (let i = 0; i < leadBatch.length; i += chunkSize) {
        const chunk = leadBatch.slice(i, i + chunkSize)
        const groupSlice = leadGroupMap.slice(i, i + chunkSize)
        const { data, error } = await supabase.from("leads").insert(chunk).select()

        if (error) {
          toast({ variant: "destructive", title: "Import error", description: error.message })
          skipped += chunk.length
          continue
        }

        if (data) {
          importedLeads += data.length

          // Create contacts for each lead
          if (hasContactFields) {
            for (let j = 0; j < data.length; j++) {
              const leadId = data[j].id
              const { rowIndices } = groupSlice[j]

              const contactMergeMap = new Map<string, Record<string, unknown>>()

              for (const rowIdx of rowIndices) {
                const row = csv.rows[rowIdx]
                const contact: Record<string, unknown> = {
                  role: "Other"
                }

                // Map contact fields
                let firstName = ""
                let lastName = ""
                let fullName = ""

                for (const m of contactFieldMappings) {
                  const val = row[m.colIdx]?.trim()
                  if (!val) continue
                  
                  // Validation: if it's mapped to a phone field, it must have at least 5 digits to reject alphabetical data shifts (e.g. "Llc")
                  if (m.field.dbColumn.includes('phone') || m.field.key.includes('phone')) {
                      const digits = (val.match(/\d/g) || []).length
                      if (digits < 5) continue
                  }
                  
                  contact[m.field.dbColumn] = val

                  if (m.field.key === "contact_first_name") firstName = val
                  if (m.field.key === "contact_last_name") lastName = val
                  if (m.field.key === "contact_full_name") fullName = val
                }

                // Compute display name
                if (firstName || lastName) {
                  contact.name = [firstName, lastName].filter(Boolean).join(" ")
                } else if (fullName) {
                  contact.name = fullName
                  // Attempt to split into first/last
                  const parts = fullName.split(/\s+/)
                  if (parts.length >= 2) {
                    contact.first_name = contact.first_name || parts[0]
                    contact.last_name = contact.last_name || parts.slice(1).join(" ")
                  }
                } else {
                  contact.name = String(data[j].company || "Contact")
                }

                // Intelligent routing of phone numbers so contacts have both direct and company lines
                if (!contact.phone) {
                  contact.phone = contact.mobile_phone || contact.work_phone || data[j].phone || null
                }
                
                // Inherit company phone as work_phone if the contact doesn't have one and it differs from their mobile/direct line
                if (!contact.work_phone && data[j].phone) {
                  const companyPhoneRaw = String(data[j].phone).replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
                  const mobileRaw = String(contact.mobile_phone || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
                  const directRaw = String(contact.phone || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
                  
                  if (companyPhoneRaw !== mobileRaw && companyPhoneRaw !== directRaw) {
                    contact.work_phone = data[j].phone
                  }
                }

                // Only process if we have at least some meaningful data beyond just the name
                const hasData = contactFieldMappings.some(m => row[m.colIdx]?.trim())
                if (!hasData) continue

                // DEDUPLICATION: cluster by phone, email, or name
                const getPhoneKey = (p?: unknown) => String(p || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
                
                let phoneKey = getPhoneKey(contact.phone) || getPhoneKey(contact.mobile_phone) || getPhoneKey(contact.work_phone) || getPhoneKey(data[j].phone)
                let emailKey = String(contact.email || "").toLowerCase().trim()
                
                // If the only info we have is the company placeholder, its dedupe key is the company name.
                const dedupeKey = phoneKey || emailKey || String(contact.name).toLowerCase().trim()
                
                if (contactMergeMap.has(dedupeKey)) {
                  const existing = contactMergeMap.get(dedupeKey)!
                  // Merge over missing fields
                  for (const [k, v] of Object.entries(contact)) {
                    if (v && existing[k] === undefined) {
                      existing[k] = v
                    }
                  }
                  // Pick the best name (prefer longer, non-placeholder names)
                  const p1 = String(contact.name);
                  const p2 = String(existing.name);
                  const isPlaceholder1 = p1.toLowerCase() === String(data[j].company || "").toLowerCase()
                  const isPlaceholder2 = p2.toLowerCase() === String(data[j].company || "").toLowerCase()
                  
                  if (!isPlaceholder1 && isPlaceholder2) {
                    existing.name = contact.name // Override placeholder with real name
                  } else if (!isPlaceholder1 && !isPlaceholder2 && p1.length > p2.length) {
                    existing.name = contact.name
                  }
                  
                  if (contact.first_name && !existing.first_name) existing.first_name = contact.first_name
                  if (contact.last_name && !existing.last_name) existing.last_name = contact.last_name
                } else {
                  contactMergeMap.set(dedupeKey, contact)
                }
              }

              let contactInserts = Array.from(contactMergeMap.values()).map(c => ({
                ...c,
                lead_id: leadId
              }))
              
              // Second pass filter: If we generated a generic placeholder contact (named after company) 
              // BUT we successfully extracted real human contacts for this lead, discard the placeholder entirely!
              const hasRealContacts = contactInserts.some(c => String(c.name).toLowerCase() !== String(data[j].company || "").toLowerCase())
              if (hasRealContacts) {
                 contactInserts = contactInserts.filter(c => String(c.name).toLowerCase() !== String(data[j].company || "").toLowerCase())
              }

              if (contactInserts.length > 0) {
                const { error: contactErr } = await supabase.from("contacts").insert(contactInserts)
                if (!contactErr) {
                  importedContacts += contactInserts.length
                }
              }
            }
          }

          // Build Lead objects for callback
          for (const row of data) {
            insertedLeads.push({
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

      if (insertedLeads.length > 0) onImported(insertedLeads)
    } else {
      // ── FLAT MODE: 1 row = 1 lead (no company column mapped) ──
      const insertRows: Record<string, unknown>[] = []

      for (let rowIdx = 0; rowIdx < csv.rows.length; rowIdx++) {
        const row = csv.rows[rowIdx]

        // Find a company name from whatever is available
        let companyName = ""
        for (const m of leadFieldMappings) {
          const val = row[m.colIdx]?.trim()
          if (val) { companyName = val; break }
        }
        if (!companyName) companyName = `Imported Lead #${rowIdx + 1}`

        const record: Record<string, unknown> = { company: companyName, project_id: projectId }
        const customFields: Record<string, unknown> = {}

        for (const m of leadFieldMappings) {
          const val = row[m.colIdx]?.trim()
          if (!val) continue
          if (m.field.key === "deal_value" || m.field.key === "close_probability") {
            const num = parseFloat(val)
            if (!isNaN(num)) record[m.field.dbColumn] = num
          } else {
            record[m.field.dbColumn] = val
          }
        }

        for (const m of customFieldMappings) {
          const val = row[m.colIdx]?.trim()
          if (val) customFields[m.fieldKey] = val
        }

        // Mirror mapped contact fields backwards to the Lead's custom fields or phone
        if (contactFieldMappings.length > 0) {
          for (const m of contactFieldMappings) {
            const val = row[m.colIdx]?.trim()
            if (!val) continue
            
            if (m.field.key === "contact_mobile" || m.field.key === "contact_work_phone") {
              if (record.phone === undefined) record.phone = val
            }
            
            const baseKey = m.field.key.replace("contact_", "")
            const fd = fieldDefinitions.find(f => 
              f.fieldKey === baseKey || 
              f.fieldKey === m.field.label.toLowerCase().replace(/\s+/g, '_') ||
              (baseKey === "mobile" && f.fieldKey === "mobile_number")
            )
            
            const targetKey = fd ? fd.fieldKey : (baseKey === "mobile" ? "mobile_number" : baseKey)
            if (customFields[targetKey] === undefined) {
              customFields[targetKey] = val
            }
          }
        }

        if (Object.keys(customFields).length > 0) {
          record.custom_fields = customFields
        }

        insertRows.push(record)
      }

      // Batch insert
      const chunkSize = 50
      const insertedLeads: Lead[] = []
      for (let i = 0; i < insertRows.length; i += chunkSize) {
        const chunk = insertRows.slice(i, i + chunkSize)
        const { data, error } = await supabase.from("leads").insert(chunk).select()
        if (error) {
          toast({ variant: "destructive", title: "Import error", description: error.message })
          skipped += chunk.length
        } else if (data) {
          importedLeads += data.length

          // Create contacts if contact fields were mapped
          if (hasContactFields) {
            for (let j = 0; j < data.length; j++) {
              const leadId = data[j].id
              const globalRowIdx = i + j
              const row = csv.rows[globalRowIdx]
              const contact: Record<string, unknown> = { lead_id: leadId, role: "Other" }

              let firstName = ""
              let lastName = ""
              let fullName = ""

              for (const m of contactFieldMappings) {
                const val = row[m.colIdx]?.trim()
                if (!val) continue
                
                if (m.field.dbColumn.includes('phone') || m.field.key.includes('phone')) {
                    const digits = (val.match(/\d/g) || []).length
                    if (digits < 5) continue
                }
                
                contact[m.field.dbColumn] = val
                if (m.field.key === "contact_first_name") firstName = val
                if (m.field.key === "contact_last_name") lastName = val
                if (m.field.key === "contact_full_name") fullName = val
              }

              if (firstName || lastName) {
                contact.name = [firstName, lastName].filter(Boolean).join(" ")
              } else if (fullName) {
                contact.name = fullName
              } else {
                contact.name = data[j].company || "Contact"
              }

              // Intelligent routing of phone numbers so contacts have both direct and company lines
              if (!contact.phone) {
                contact.phone = contact.mobile_phone || contact.work_phone || data[j].phone || null
              }
              
              // Inherit company phone as work_phone if the contact doesn't have one and it differs from their mobile/direct line
              if (!contact.work_phone && data[j].phone) {
                const companyPhoneRaw = String(data[j].phone).replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
                const mobileRaw = String(contact.mobile_phone || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
                const directRaw = String(contact.phone || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
                
                if (companyPhoneRaw !== mobileRaw && companyPhoneRaw !== directRaw) {
                  contact.work_phone = data[j].phone
                }
              }
              const hasData = contactFieldMappings.some(m => row[m.colIdx]?.trim())
              if (hasData) {
                await supabase.from("contacts").insert([contact])
                importedContacts++
              }
            }
          }

          // Auto-create contacts from phone (for leads without contact fields)
          if (!hasContactFields) {
            const contactInserts = data
              .filter((row: Record<string, unknown>) => row.phone && String(row.phone).trim())
              .map((row: Record<string, unknown>) => ({
                lead_id: row.id,
                name: String(row.company ?? "Main"),
                role: "dm",
                phone: String(row.phone),
              }))
            if (contactInserts.length > 0) {
              await supabase.from("contacts").insert(contactInserts)
            }
          }

          for (const row of data) {
            insertedLeads.push({
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
      if (insertedLeads.length > 0) onImported(insertedLeads)
    }

    // ── Save aliases for user-changed mappings ──
    try {
      const aliasInserts: { project_id: string; alias: string; target_key: string; target_entity: string }[] = []
      for (const [colStr, value] of Object.entries(mapping)) {
        if (value === SKIP_VALUE) continue
        const colIdx = Number(colStr)
        const header = normalizeHeader(csv.headers[colIdx])
        const originalAuto = autoMap[colIdx]

        // Save if user changed the mapping or confirmed a non-obvious auto-map
        if (value !== originalAuto || !BUILT_IN_ALIASES[header]) {
          const resolvedKey = value.startsWith(AUTO_CUSTOM_PREFIX)
            ? value.replace(AUTO_CUSTOM_PREFIX, "")
            : value
          aliasInserts.push({
            project_id: projectId,
            alias: header,
            target_key: resolvedKey,
            target_entity: isContactField(resolvedKey) ? "contact" : "lead",
          })
        }
      }
      if (aliasInserts.length > 0) {
        await supabase.from("field_aliases").upsert(aliasInserts, { onConflict: "project_id,alias" })
      }
    } catch {
      // Non-critical — aliases are a convenience feature
    }

    setResult({ imported: importedLeads, contacts: importedContacts, skipped })
    setImporting(false)
    setStep("done")
  }

  // ─── Derived Stats ────────────────────────────────────────────

  const mappedCount = Object.values(mapping).filter(v => v !== SKIP_VALUE).length
  const newFieldCount = Object.values(mapping).filter(v => v.startsWith(AUTO_CUSTOM_PREFIX)).length
  const matchedCount = mappedCount - newFieldCount
  const totalCols = csv?.headers.length ?? 0

  const hasCompanyMapping = Object.values(mapping).includes("company")
  const hasContactMapping = Object.values(mapping).some(v => {
    const field = fieldByKey.get(v)
    return field?.entity === "contact"
  })

  // Estimate unique companies
  const estimatedCompanies = useMemo(() => {
    if (!csv || !hasCompanyMapping) return null
    const companyColIdx = Number(Object.entries(mapping).find(([, v]) => v === "company")?.[0])
    if (isNaN(companyColIdx)) return null
    const companies = new Set<string>()
    for (const row of csv.rows) {
      const val = row[companyColIdx]?.trim().toLowerCase()
      if (val) companies.add(val)
    }
    return companies.size
  }, [csv, mapping, hasCompanyMapping])

  // ─── Group icon helper ────────────────────────────────────────

  const groupIcon = (group: string) => {
    switch (group) {
      case "company": return <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
      case "contact": return <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
      case "pipeline": return <BarChart3 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
      case "custom": return <Wrench className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
      default: return null
    }
  }

  // ─── Render ───────────────────────────────────────────────────

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
              {step === "map" && (
                <>
                  {csv?.rowCount ?? 0} rows found.{" "}
                  <span className="text-green-600">{matchedCount} matched</span>
                  {newFieldCount > 0 && <>, <span className="text-amber-600">{newFieldCount} new fields</span></>}
                  {" · "}
                  {mappedCount}/{totalCols} columns mapped.
                  {estimatedCompanies !== null && (
                    <span className="block mt-1 text-xs">
                      ≈ {estimatedCompanies} unique companies from {csv?.rowCount} rows
                      {hasContactMapping && " (contacts will be grouped by company)"}
                    </span>
                  )}
                </>
              )}
              {step === "preview" && "Writing leads to database..."}
              {step === "done" && `${result.imported} leads, ${result.contacts} contacts imported. ${result.skipped} skipped.`}
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
                  const value = mapping[i] ?? SKIP_VALUE
                  const status = getMappingStatus(value)
                  const sample = csv.rows[0]?.[i] ?? "—"

                  // Determine display label for current mapping
                  let mappedLabel = ""
                  if (status === "matched") {
                    const field = fieldByKey.get(value)
                    if (field) mappedLabel = field.label
                    else {
                      const fd = fieldDefinitions.find(f => f.fieldKey === value)
                      if (fd) mappedLabel = fd.fieldLabel
                      else mappedLabel = value
                    }
                  } else if (status === "new_field") {
                    const key = value.replace(AUTO_CUSTOM_PREFIX, "")
                    mappedLabel = `+ ${key}`
                  }

                  return (
                    <div key={i} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{header}</p>
                          <p className="text-xs text-muted-foreground truncate">e.g. {sample}</p>
                        </div>
                        {status !== "skip" && mappedLabel && (
                          <Badge
                            variant={status === "new_field" ? "outline" : "secondary"}
                            className={`shrink-0 text-xs ${
                              status === "matched" ? "bg-green-50 text-green-700 border-green-200" :
                              status === "new_field" ? "bg-amber-50 text-amber-700 border-amber-200" : ""
                            }`}
                          >
                            {mappedLabel}
                          </Badge>
                        )}
                      </div>
                      <Select
                        value={value}
                        onValueChange={(v) => setMapping(prev => ({ ...prev, [i]: v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="-- Skip this column --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SKIP_VALUE}>⏭ Skip this column</SelectItem>

                          <SelectGroup>
                            <SelectLabel className="flex items-center"><Building2 className="h-3 w-3 mr-1" /> Company Info</SelectLabel>
                            {allFields.filter(f => f.group === "company").map(f => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label}{f.required ? " *" : ""}
                              </SelectItem>
                            ))}
                          </SelectGroup>

                          <SelectGroup>
                            <SelectLabel className="flex items-center"><Users className="h-3 w-3 mr-1" /> Contact Info</SelectLabel>
                            {allFields.filter(f => f.group === "contact").map(f => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>

                          <SelectGroup>
                            <SelectLabel className="flex items-center"><BarChart3 className="h-3 w-3 mr-1" /> Pipeline</SelectLabel>
                            {allFields.filter(f => f.group === "pipeline").map(f => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>

                          {allFields.filter(f => f.group === "custom").length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="flex items-center"><Wrench className="h-3 w-3 mr-1" /> Custom Fields</SelectLabel>
                              {allFields.filter(f => f.group === "custom").map(f => (
                                <SelectItem key={f.key} value={f.key}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}

                          <SelectGroup>
                            <SelectLabel>Auto-create</SelectLabel>
                            <SelectItem value={AUTO_CUSTOM_PREFIX + normalizeKey(header)}>
                              + Save as &quot;{normalizeKey(header)}&quot;
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>

              {/* Summary bar */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {hasCompanyMapping && estimatedCompanies !== null && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {estimatedCompanies} companies
                  </span>
                )}
                {hasContactMapping && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Contacts will be created
                  </span>
                )}
                {!hasCompanyMapping && (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    No company column mapped — each row will be a separate lead
                  </span>
                )}
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Importing {csv?.rowCount ?? 0} rows
                {estimatedCompanies !== null && ` → ${estimatedCompanies} companies`}
                ...
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <div className="text-center space-y-1">
                <p className="text-lg font-medium">{result.imported} leads imported</p>
                {result.contacts > 0 && (
                  <p className="text-sm text-muted-foreground">{result.contacts} contacts created</p>
                )}
                {result.skipped > 0 && (
                  <p className="text-sm text-muted-foreground">{result.skipped} rows skipped</p>
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
                <Button onClick={handleImport} disabled={mappedCount === 0}>
                  Import {csv?.rowCount ?? 0} Rows
                  {estimatedCompanies !== null && ` → ${estimatedCompanies} Leads`}
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

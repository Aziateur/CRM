"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ExternalLink } from "lucide-react"
import type { FieldDefinition } from "@/lib/store"

interface DynamicFieldRendererProps {
  field: FieldDefinition
  value: unknown
  onChange: (value: unknown) => void
  readOnly?: boolean
}

export function DynamicFieldRenderer({ field, value, onChange, readOnly }: DynamicFieldRendererProps) {
  if (readOnly) {
    return (
      <div>
        <Label className="text-xs text-muted-foreground">{field.fieldLabel}</Label>
        <div className="mt-1">
          {renderReadOnlyValue(field, value)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Label className="text-xs text-muted-foreground">
        {field.fieldLabel}
        {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <div className="mt-1">
        {renderEditableField(field, value, onChange)}
      </div>
    </div>
  )
}

function renderReadOnlyValue(field: FieldDefinition, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-sm text-muted-foreground">-</span>
  }

  switch (field.fieldType) {
    case "boolean":
      return <span className="text-sm">{value ? "Yes" : "No"}</span>

    case "url":
      return (
        <a
          href={value as string}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          {value as string}
          <ExternalLink className="h-3 w-3" />
        </a>
      )

    case "email":
      return (
        <a href={`mailto:${value}`} className="text-sm text-primary hover:underline">
          {value as string}
        </a>
      )

    case "multi_select":
      return (
        <div className="flex flex-wrap gap-1">
          {(value as string[]).map((v) => (
            <Badge key={v} variant="secondary">{v}</Badge>
          ))}
        </div>
      )

    case "date":
      return <span className="text-sm">{new Date(value as string).toLocaleDateString()}</span>

    case "number":
      return <span className="text-sm">{(value as number).toLocaleString()}</span>

    default:
      return <span className="text-sm">{String(value)}</span>
  }
}

function renderEditableField(
  field: FieldDefinition,
  value: unknown,
  onChange: (value: unknown) => void
) {
  switch (field.fieldType) {
    case "text":
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.fieldLabel}
        />
      )

    case "number":
      return (
        <Input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder={field.fieldLabel}
        />
      )

    case "url":
      return (
        <Input
          type="url"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
      )

    case "email":
      return (
        <Input
          type="email"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="name@example.com"
        />
      )

    case "date":
      return (
        <Input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case "boolean":
      return (
        <Switch
          checked={(value as boolean) ?? false}
          onCheckedChange={(checked) => onChange(checked)}
        />
      )

    case "select":
      return (
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${field.fieldLabel}`} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "multi_select": {
      const selected = (value as string[]) ?? []
      return (
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => (
            <Badge
              key={opt}
              variant={selected.includes(opt) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                if (selected.includes(opt)) {
                  onChange(selected.filter((v) => v !== opt))
                } else {
                  onChange([...selected, opt])
                }
              }}
            >
              {opt}
            </Badge>
          ))}
        </div>
      )
    }

    default:
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

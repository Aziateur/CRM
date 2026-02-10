"use client"

import { useState, useEffect } from "react"
import { useTemplates } from "@/hooks/use-templates"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText } from "lucide-react"

interface DialScriptPanelProps {
  visible: boolean
}

export function DialScriptPanel({ visible }: DialScriptPanelProps) {
  const { templates, loading } = useTemplates("call")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Auto-select default template on load
  useEffect(() => {
    if (templates.length > 0 && !selectedId) {
      const defaultTemplate = templates.find((t) => t.isDefault)
      setSelectedId(defaultTemplate?.id || templates[0].id)
    }
  }, [templates, selectedId])

  if (!visible) return null
  if (loading || templates.length === 0) return null

  const selected = templates.find((t) => t.id === selectedId) || templates[0]

  // Render body with [variable] placeholders highlighted
  const renderBody = (body: string) => {
    const parts = body.split(/(\[\w+\])/)
    return parts.map((part, i) => {
      if (part.match(/^\[\w+\]$/)) {
        return (
          <span key={i} className="inline-block bg-primary/15 text-primary px-1 rounded text-xs font-mono">
            {part}
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase">Script</span>
          </div>
          {templates.length > 1 && (
            <Select value={selectedId || ""} onValueChange={setSelectedId}>
              <SelectTrigger className="h-7 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.isDefault ? "(default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="text-sm leading-relaxed">
          {renderBody(selected.body)}
        </div>
      </CardContent>
    </Card>
  )
}

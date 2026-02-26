"use client"

import { useState, useEffect, useMemo } from "react"
import { useScripts, useScriptSections } from "@/hooks/use-scripts"
import { useCategories } from "@/hooks/use-categories"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { FileText, ChevronDown, ChevronRight, Loader2, Star, List } from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"
import type { Lead } from "@/lib/store"

interface DialScriptPanelProps {
  visible: boolean
  lead?: Lead | null
}

// ─── Section display for a single script ───

function ScriptSections({ scriptId }: { scriptId: string }) {
  const { sections, isLoading } = useScriptSections(scriptId)
  const { activeCategories: sectionTypes } = useCategories("script_section_type")

  const typeMap = useMemo(
    () => new Map(sectionTypes.map((t) => [t.id, { name: t.name, icon: t.icon }])),
    [sectionTypes]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (sections.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-2">No structured sections</p>
  }

  return (
    <div className="space-y-1.5 mt-2">
      {sections.map((section) => {
        const type = typeMap.get(section.sectionTypeId)
        return (
          <ScriptSectionItem
            key={section.id}
            icon={type?.icon ?? "file-text"}
            name={type?.name ?? "Section"}
            content={section.content}
          />
        )
      })}
    </div>
  )
}

function ScriptSectionItem({ icon, name, content }: { icon: string; name: string; content: string }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!content) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/40 rounded px-1.5 py-1 transition-colors group">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <span className="inline-flex items-center"><CategoryIcon icon={icon} className="h-3.5 w-3.5" /></span>
          <span className="text-xs font-medium">{name}</span>
          {!isOpen && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
              — {content.slice(0, 40)}...
            </span>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-6 pr-2 py-1">
          <DialFormattedContent content={content} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ─── Lightweight formatted content for dialer ───

function DialFormattedContent({ content }: { content: string }) {
  if (!content) return null
  const lines = content.split("\n")
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-1.5" />
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return <p key={i} className="font-semibold text-foreground mt-2 first:mt-0 text-[13px]">{trimmed.replace(/\*\*/g, "")}</p>
        }
        if (trimmed === "---") return <hr key={i} className="my-2 border-border/40" />
        if (trimmed.startsWith("💡")) {
          return (
            <div key={i} className="bg-amber-500/5 border-l-2 border-amber-500/40 pl-2 py-1 my-1 rounded-r text-[11px] text-muted-foreground italic">
              {trimmed.replace(/^💡\s*/, "").replace(/^\*/, "").replace(/\*$/, "")}
            </div>
          )
        }
        if (/^[🔹🟢🟡🔵🔴⚪]/.test(trimmed)) {
          return <div key={i} className="pl-1 py-0.5 text-[13px]">{trimmed}</div>
        }
        if (trimmed.startsWith("→")) {
          return <p key={i} className="pl-4 text-[13px] text-primary/80">{trimmed}</p>
        }
        // Inline bold
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g)
        return (
          <p key={i} className="text-[13px] text-foreground/90">
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={j}>{part.slice(2, -2)}</strong>
              }
              const italicParts = part.split(/(\*[^*]+\*)/g)
              return italicParts.map((ip, k) => {
                if (ip.startsWith("*") && ip.endsWith("*") && !ip.startsWith("**")) {
                  return <em key={`${j}-${k}`} className="text-muted-foreground">{ip.slice(1, -1)}</em>
                }
                return <span key={`${j}-${k}`}>{ip}</span>
              })
            })}
          </p>
        )
      })}
    </div>
  )
}

// ─── Main Panel ───

export function DialScriptPanel({ visible, lead }: DialScriptPanelProps) {
  const { scripts, isLoading } = useScripts()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // lead.segment is now a UUID — use directly for script matching
  const leadSegmentId = lead?.segment ?? null

  // Filter to active scripts, prefer pinned and matching segment
  const relevantScripts = useMemo(() => {
    const active = scripts.filter((s) => s.isActive)

    // Sort: exact segment UUID match first, then pinned, then alphabetical
    return [...active].sort((a, b) => {
      const aMatch = leadSegmentId && a.segmentId === leadSegmentId ? 1 : 0
      const bMatch = leadSegmentId && b.segmentId === leadSegmentId ? 1 : 0
      if (aMatch !== bMatch) return bMatch - aMatch
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return a.title.localeCompare(b.title)
    })
  }, [scripts, leadSegmentId])

  // Auto-select best match. Reset when lead changes so new lead gets correct script.
  useEffect(() => {
    if (relevantScripts.length > 0) {
      setSelectedId(relevantScripts[0].id)
    }
  }, [lead?.id, relevantScripts[0]?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null
  if (isLoading || relevantScripts.length === 0) return null

  const selected = relevantScripts.find((s) => s.id === selectedId) || relevantScripts[0]

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase">Script</span>
            {selected.isPinned && (
              <Badge variant="secondary" className="text-[10px] h-4">
                Pinned
              </Badge>
            )}
          </div>
          {relevantScripts.length > 1 && (
            <Select value={selectedId || ""} onValueChange={setSelectedId}>
              <SelectTrigger className="h-7 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {relevantScripts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} {s.isPinned ? <Star className="h-3 w-3 inline text-amber-500 fill-amber-500" /> : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {selected.description && (
          <p className="text-sm text-muted-foreground mb-3">{selected.description}</p>
        )}
        {/* Summary bullets — always visible */}
        {selected.summary && (
          <div className="bg-background/60 border border-primary/20 rounded-lg px-4 py-3 mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <List className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase">Summary</span>
            </div>
            <div className="space-y-1">
              {selected.summary.split("\n").filter((l: string) => l.trim()).map((line: string, i: number) => (
                <p key={i} className="text-sm text-foreground/85 flex items-start gap-2 leading-relaxed">
                  {(line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*")) ? (
                    <>{line.trim()}</>
                  ) : (
                    <><span className="text-primary/50">•</span> {line.trim()}</>
                  )}
                </p>
              ))}
            </div>
          </div>
        )}
        {/* Sections — collapsed by default, scrollable for long scripts */}
        <div className="max-h-[50vh] overflow-y-auto">
          <ScriptSections scriptId={selected.id} />
        </div>
      </CardContent>
    </Card>
  )
}

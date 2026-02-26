"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookOpen, ArrowUp, ArrowDown } from "lucide-react"
import type { RankedCall } from "@/queries/ranked-calls"
import type { ReviewField } from "@/queries/templates"
import type { SetBucketInput } from "@/queries/review-commands"
import { useSegmentMap, resolveSegmentName } from "@/hooks/segment-helpers"

interface ReviewedCallsTableProps {
  allRanked: RankedCall[]
  topCalls: RankedCall[]
  bottomCalls: RankedCall[]
  bucketCounts: { top: number; bottom: number }
  fieldDefs: ReviewField[]
  setReviewBucket: { mutate: (input: SetBucketInput) => void }
  onDeepDive: (attemptIds: Set<string>, label: string) => void
}

export function ReviewedCallsTable({
  allRanked,
  topCalls,
  bottomCalls,
  bucketCounts,
  fieldDefs,
  setReviewBucket,
  onDeepDive,
}: ReviewedCallsTableProps) {
  const { segmentMap } = useSegmentMap()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bucketFilter, setBucketFilter] = useState<"all" | "top" | "bottom" | "unranked">("all")

  const toggleSelected = (attemptId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(attemptId)) next.delete(attemptId)
      else next.add(attemptId)
      return next
    })
  }

  if (allRanked.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Reviewed Calls</CardTitle>
            <CardDescription>
              Last {allRanked.length} reviewed calls — mark Top/Bottom, then select to deep dive
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <>
                <Badge variant="secondary" className="tabular-nums">
                  {selectedIds.size} selected
                </Badge>
                <Button
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={() => {
                    onDeepDive(new Set(selectedIds), `${selectedIds.size} selected`)
                  }}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Deep Dive {selectedIds.size}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </>
            )}
            {/* Quick-action deep dive buttons */}
            {selectedIds.size === 0 && (topCalls.length > 0 || bottomCalls.length > 0) && (
              <div className="flex gap-1">
                {topCalls.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
                    onClick={() => {
                      onDeepDive(new Set(topCalls.map(c => c.attemptId)), `Top ${topCalls.length}`)
                    }}
                  >
                    <BookOpen className="h-3 w-3" />
                    Deep Dive Top {topCalls.length}
                  </Button>
                )}
                {bottomCalls.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50"
                    onClick={() => {
                      onDeepDive(new Set(bottomCalls.map(c => c.attemptId)), `Bottom ${bottomCalls.length}`)
                    }}
                  >
                    <BookOpen className="h-3 w-3" />
                    Deep Dive Bottom {bottomCalls.length}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Bucket filter tabs */}
        <div className="flex items-center gap-1 mt-2">
          {(["all", "top", "bottom", "unranked"] as const).map(filter => {
            const count = filter === "all" ? allRanked.length
              : filter === "top" ? bucketCounts.top
                : filter === "bottom" ? bucketCounts.bottom
                  : allRanked.filter(c => !c.callBucket).length
            return (
              <Button
                key={filter}
                variant={bucketFilter === filter ? "default" : "ghost"}
                size="sm"
                className="h-6 text-xs px-2 gap-1"
                onClick={() => setBucketFilter(filter)}
              >
                {filter === "all" ? "All" : filter === "top" ? <><ArrowUp className="h-3 w-3 inline" /> Top</> : filter === "bottom" ? <><ArrowDown className="h-3 w-3 inline" /> Bottom</> : "Unranked"}
                <span className="text-[10px] opacity-70">
                  {filter === "top" || filter === "bottom" ? `${count}/10` : count}
                </span>
              </Button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="border rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-muted/80 backdrop-blur">
                <th className="p-2 text-center w-10">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedIds.size === allRanked.length && allRanked.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(allRanked.map(c => c.attemptId)))
                      else setSelectedIds(new Set())
                    }}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground w-10">#</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground">Company</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground">Outcome</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground">Stage</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground">Segment</th>
                <th className="p-2 text-right text-xs font-medium text-muted-foreground w-16">Score</th>
                <th className="p-2 text-center text-xs font-medium text-muted-foreground w-20">Bucket</th>
                {fieldDefs.filter(f => f.fieldType !== "evidence_quote").map(f => (
                  <th key={f.key} className="p-2 text-center text-xs font-medium text-muted-foreground">
                    {f.label}
                  </th>
                ))}
                <th className="p-2 text-right text-xs font-medium text-muted-foreground w-20">Date</th>
              </tr>
            </thead>
            <tbody>
              {allRanked
                .filter(call => {
                  if (bucketFilter === "all") return true
                  if (bucketFilter === "top") return call.callBucket === "top"
                  if (bucketFilter === "bottom") return call.callBucket === "bottom"
                  return !call.callBucket
                })
                .map((call, idx) => {
                  const isSelected = selectedIds.has(call.attemptId)
                  return (
                    <tr
                      key={call.attemptId}
                      className={`border-b last:border-0 cursor-pointer transition-colors ${isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" :
                        call.callBucket === "top" ? "bg-green-50/60 dark:bg-green-950/15" :
                          call.callBucket === "bottom" ? "bg-red-50/60 dark:bg-red-950/15" :
                            "hover:bg-muted/30"
                        }`}
                      onClick={() => toggleSelected(call.attemptId)}
                    >
                      <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={isSelected}
                          onChange={() => toggleSelected(call.attemptId)}
                        />
                      </td>
                      <td className="p-2 text-xs text-muted-foreground tabular-nums">
                        {idx + 1}
                        {call.callBucket === "top" && <span className="ml-0.5 text-green-600">▲</span>}
                        {call.callBucket === "bottom" && <span className="ml-0.5 text-red-500">▼</span>}
                      </td>
                      <td className="p-2 font-medium whitespace-nowrap">{call.companyName || "Unknown"}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px] h-5 whitespace-nowrap">
                          {call.outcome || "—"}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{call.stage || "—"}</td>
                      <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{resolveSegmentName(call.segment, segmentMap) || "—"}</td>
                      <td className="p-2 text-right tabular-nums font-semibold">{call.quickScore}</td>
                      <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            className={`p-0.5 rounded transition-colors ${call.callBucket === "top"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                              : "text-muted-foreground/40 hover:text-green-600 hover:bg-green-50"
                              }`}
                            title="Mark as Top"
                            onClick={() => {
                              if (call.callBucket !== "top" && bucketCounts.top >= 10) {
                                alert("You already have 10 top picks — remove one first to make room.")
                                return
                              }
                              setReviewBucket.mutate({ reviewId: call.reviewId, bucket: call.callBucket === "top" ? null : "top" })
                            }}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className={`p-0.5 rounded transition-colors ${call.callBucket === "bottom"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                              : "text-muted-foreground/40 hover:text-red-600 hover:bg-red-50"
                              }`}
                            title="Mark as Bottom"
                            onClick={() => {
                              if (call.callBucket !== "bottom" && bucketCounts.bottom >= 10) {
                                alert("You already have 10 bottom picks — remove one first to make room.")
                                return
                              }
                              setReviewBucket.mutate({ reviewId: call.reviewId, bucket: call.callBucket === "bottom" ? null : "bottom" })
                            }}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      {fieldDefs.filter(f => f.fieldType !== "evidence_quote").map(f => {
                        const val = call.responses?.[f.key]
                        let display = "—"
                        if (f.fieldType === "score" && typeof val === "number") display = String(val)
                        else if (f.fieldType === "multi_select" && Array.isArray(val)) {
                          const labels = (f.config.options ?? []) as { value: string; label: string }[]
                          display = val.map((v: string) => labels.find(o => o.value === v)?.label ?? v).join(", ") || "—"
                        }
                        else if (f.fieldType === "checkbox") display = val === true ? "✓" : "—"
                        else if (f.fieldType === "text" && typeof val === "string" && val) display = val.length > 20 ? val.slice(0, 20) + "…" : val
                        return (
                          <td key={f.key} className="p-2 text-center text-xs text-muted-foreground whitespace-nowrap">
                            {display}
                          </td>
                        )
                      })}
                      <td className="p-2 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {new Date(call.reviewedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

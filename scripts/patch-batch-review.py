"""Patch batch-review/page.tsx cleanly"""
import re

with open("app/batch-review/page.tsx", "r") as f:
    content = f.read()

# 1. Replace state declarations (two-bucket → simple selectedIds)
old_state = """  // Two-bucket selection for ranked calls
  const [topPickIds, setTopPickIds] = useState<Set<string>>(new Set())
  const [bottomPickIds, setBottomPickIds] = useState<Set<string>>(new Set())

  const togglePick = (attemptId: string, bucket: "top" | "bottom") => {
    if (bucket === "top") {
      setTopPickIds(prev => {
        const next = new Set(prev)
        if (next.has(attemptId)) next.delete(attemptId)
        else next.add(attemptId)
        return next
      })
      // Remove from other bucket
      setBottomPickIds(prev => {
        const next = new Set(prev)
        next.delete(attemptId)
        return next
      })
    } else {
      setBottomPickIds(prev => {
        const next = new Set(prev)
        if (next.has(attemptId)) next.delete(attemptId)
        else next.add(attemptId)
        return next
      })
      setTopPickIds(prev => {
        const next = new Set(prev)
        next.delete(attemptId)
        return next
      })
    }
  }"""

new_state = """  // Selection for ranked calls → deep dive
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelected = (attemptId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(attemptId)) next.delete(attemptId)
      else next.add(attemptId)
      return next
    })
  }"""

content = content.replace(old_state, new_state)

# 1b. Update destructure to include fieldDefs
content = content.replace(
    "const { topCalls, bottomCalls, allRanked, stats: rankedStats } = useRankedCalls()",
    "const { topCalls, bottomCalls, allRanked, fieldDefs, stats: rankedStats } = useRankedCalls()"
)

# 2. Replace entire "All Caught Up" block (lines 611-781)
# Find the exact block from ") : (" to the end of the deep dive CTAs
old_all_caught_up_start = """            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center mb-6">
                    <Check className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">All Caught Up!</h3>
                    <p className="text-sm text-muted-foreground">Pick your best &amp; worst calls to deep dive.</p>
                  </div>"""

# Find where this block ends - it goes all the way to the closing )}\n before Quick Batch Tab
# I need to find the exact end marker
end_marker = """            {/* ─── Quick Batch Tab ─── */}"""

start_idx = content.find(old_all_caught_up_start)
end_idx = content.find(end_marker)

if start_idx == -1:
    print("ERROR: Could not find All Caught Up block start")
    exit(1)
if end_idx == -1:
    print("ERROR: Could not find Quick Batch Tab marker")
    exit(1)

new_all_caught_up = """            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <Check className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">All Caught Up!</h3>
                    <p className="text-sm text-muted-foreground">
                      {allRanked.length > 0 ? "Select calls from the table below to deep dive." : "No calls reviewed yet."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

"""

content = content[:start_idx] + new_all_caught_up + content[end_idx:]

# 3. Replace old Batch History with new rich spreadsheet
old_batch_history_start = """              {/* ─── Batch History ─── */}"""
old_batch_history_end = """            </TabsContent>

            {/* ─── Deep Dive Tab"""

bh_start = content.find(old_batch_history_start)
bh_end = content.find(old_batch_history_end)

if bh_start == -1:
    print("ERROR: Could not find Batch History start")
    exit(1)
if bh_end == -1:
    print("ERROR: Could not find Batch History end marker")
    exit(1)

new_batch_history = """              {/* ─── Batch History — Rich Spreadsheet ─── */}
              {allRanked.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">Reviewed Calls</CardTitle>
                        <CardDescription>
                          Last {allRanked.length} reviewed calls — select calls to deep dive
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
                                setDeepDiveAttemptIds(new Set(selectedIds))
                                setDeepDiveLabel(`${selectedIds.size} selected`)
                                setCurrentIndex(0)
                                setActiveTab("deep")
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
                      </div>
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
                            {fieldDefs.filter(f => f.fieldType !== "evidence_quote").map(f => (
                              <th key={f.key} className="p-2 text-center text-xs font-medium text-muted-foreground">
                                {f.label}
                              </th>
                            ))}
                            <th className="p-2 text-right text-xs font-medium text-muted-foreground w-20">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allRanked.map((call, idx) => {
                            const isSelected = selectedIds.has(call.attemptId)
                            const isTop10 = idx < 10
                            const isBottom10 = allRanked.length > 20 && idx >= allRanked.length - 10
                            return (
                              <tr
                                key={call.attemptId}
                                className={`border-b last:border-0 cursor-pointer transition-colors ${
                                  isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" :
                                  isTop10 ? "bg-green-50/50 dark:bg-green-950/10" :
                                  isBottom10 ? "bg-red-50/50 dark:bg-red-950/10" :
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
                                  {isTop10 && <span className="ml-0.5 text-green-600">▲</span>}
                                  {isBottom10 && <span className="ml-0.5 text-red-500">▼</span>}
                                </td>
                                <td className="p-2 font-medium whitespace-nowrap">{call.companyName || "Unknown"}</td>
                                <td className="p-2">
                                  <Badge variant="outline" className="text-[10px] h-5 whitespace-nowrap">
                                    {call.outcome || "—"}
                                  </Badge>
                                </td>
                                <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{call.stage || "—"}</td>
                                <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{call.segment || "—"}</td>
                                <td className="p-2 text-right tabular-nums font-semibold">{call.quickScore}</td>
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
              )}
"""

content = content[:bh_start] + new_batch_history + content[bh_end:]

with open("app/batch-review/page.tsx", "w") as f:
    f.write(content)

print("Done! File patched successfully.")

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Search as SearchIcon, Pin } from "lucide-react"
import { useInvestigations } from "@/hooks/use-investigations"
import {
    INVESTIGATION_STATUSES,
    PRIORITY_CONFIG,
    investigationAge,
    type Priority,
} from "@/lib/investigations"

interface IncubatePopoverProps {
    /** Called when a signal should be pinned to an investigation */
    onIncubate: (investigationId: string) => void
    disabled?: boolean
}

/**
 * Popover that lets the manager pick an existing open investigation
 * or create a new one — then triggers the incubation callback.
 */
export function IncubatePopover({ onIncubate, disabled }: IncubatePopoverProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [creating, setCreating] = useState(false)
    const [newTitle, setNewTitle] = useState("")

    const { investigations, createInvestigation } = useInvestigations(
        INVESTIGATION_STATUSES.OPEN,
    )

    const filtered = investigations.filter(i =>
        i.title.toLowerCase().includes(search.toLowerCase()),
    )

    const handleSelect = (id: string) => {
        onIncubate(id)
        setOpen(false)
        setSearch("")
    }

    const handleCreate = async () => {
        if (!newTitle.trim()) return
        setCreating(true)
        try {
            const inv = await createInvestigation.mutateAsync({
                title: newTitle.trim(),
            })
            onIncubate(inv.id)
            setOpen(false)
            setNewTitle("")
        } finally {
            setCreating(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
                    disabled={disabled}
                    title="Pin to an Investigation for deep analysis"
                >
                    <Pin className="h-3.5 w-3.5" />
                    Incubate
                </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-80 p-0">
                <div className="p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Pin to Investigation
                    </p>

                    {/* Search existing */}
                    <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            className="h-8 text-xs pl-8"
                            placeholder="Search investigations..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* List of open investigations */}
                    <div className="max-h-48 overflow-y-auto space-y-1">
                        {filtered.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-3">
                                {investigations.length === 0
                                    ? "No open investigations. Create one below."
                                    : "No matches."}
                            </p>
                        )}
                        {filtered.map(inv => {
                            const pc = PRIORITY_CONFIG[inv.priority as Priority]
                            return (
                                <button
                                    key={inv.id}
                                    onClick={() => handleSelect(inv.id)}
                                    className="w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left hover:bg-muted/60 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">
                                            {inv.title}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {investigationAge(inv.createdAt)} ·{" "}
                                            {inv.signalCount ?? 0} signals
                                        </p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={`text-[9px] h-4 px-1.5 ${pc.color} ${pc.border}`}
                                    >
                                        {pc.label}
                                    </Badge>
                                </button>
                            )
                        })}
                    </div>

                    {/* Create new */}
                    <div className="border-t pt-2 space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                            Or create new
                        </p>
                        <div className="flex gap-1.5">
                            <Input
                                className="h-7 text-xs flex-1"
                                placeholder='e.g. "Why does the opener fail?"'
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") handleCreate()
                                }}
                            />
                            <Button
                                size="sm"
                                className="h-7 text-xs gap-1 px-2"
                                disabled={!newTitle.trim() || creating}
                                onClick={handleCreate}
                            >
                                {creating ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Plus className="h-3 w-3" />
                                )}
                                Create
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

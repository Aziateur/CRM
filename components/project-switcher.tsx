"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Check, ChevronsUpDown, FolderPlus, Loader2 } from "lucide-react"

export function ProjectSwitcher() {
    const { projects, currentProjectId, switchProject, createProject } = useAuth()
    const [showNew, setShowNew] = useState(false)
    const [newName, setNewName] = useState("")
    const [newDesc, setNewDesc] = useState("")
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const current = projects.find((p) => p.id === currentProjectId)

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) return
        setCreating(true)
        setError(null)

        const result = await createProject(newName.trim(), newDesc.trim() || undefined)
        if (result.success) {
            setShowNew(false)
            setNewName("")
            setNewDesc("")
        } else {
            setError(result.error || "Failed to create project")
        }
        setCreating(false)
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="w-full justify-between gap-2 px-2 h-9 text-sm font-medium"
                    >
                        <span className="truncate">{current?.name || "Select project"}</span>
                        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                    {projects.map((p) => (
                        <DropdownMenuItem
                            key={p.id}
                            onClick={() => switchProject(p.id)}
                            className="flex items-center gap-2"
                        >
                            <span className="flex-1 truncate">{p.name}</span>
                            {p.id === currentProjectId && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowNew(true)} className="gap-2">
                        <FolderPlus className="h-4 w-4" />
                        New Project
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showNew} onOpenChange={setShowNew}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                            Each project has its own leads, pipeline, and settings — completely isolated.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate}>
                        <div className="space-y-4 py-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="new-project-name">Project Name</Label>
                                <Input
                                    id="new-project-name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Commercial Trucking"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-project-desc">Description (optional)</Label>
                                <Input
                                    id="new-project-desc"
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="Short description"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowNew(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={creating || !newName.trim()}>
                                {creating ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating…
                                    </span>
                                ) : (
                                    "Create Project"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}

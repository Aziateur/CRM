"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Settings2,
    Eye,
    EyeOff,
    ArrowUpCircle,
    ArrowDownCircle,
    Trash2,
    MoreVertical,
} from "lucide-react"
import type { FieldDefinition, FieldSection } from "@/lib/store"

interface ConfigureFieldsPanelProps {
    fields: FieldDefinition[]
    section: FieldSection
    onToggleMask: (fieldId: string, masked: boolean) => void
    onPromote: (fieldId: string) => void
    onDemote: (fieldId: string) => void
    onDelete: (fieldId: string) => void
}

export function ConfigureFieldsPanel({
    fields,
    section,
    onToggleMask,
    onPromote,
    onDemote,
    onDelete,
}: ConfigureFieldsPanelProps) {
    const [deleteTarget, setDeleteTarget] = useState<FieldDefinition | null>(null)
    const sectionFields = fields.filter((f) => f.section === section)
    const hiddenCount = sectionFields.filter((f) => f.isMasked).length

    return (
        <>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                        <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-0">
                    <div className="p-3 border-b">
                        <p className="text-sm font-medium">Configure Fields</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Toggle visibility, promote, or remove fields
                        </p>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y">
                        {sectionFields.map((field) => (
                            <div
                                key={field.id}
                                className={`flex items-center justify-between px-3 py-2 ${field.isMasked ? "opacity-50" : ""
                                    }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <button
                                        onClick={() => {
                                            if (field.source === "native") return
                                            onToggleMask(field.id, !field.isMasked)
                                        }}
                                        className={`shrink-0 ${field.source === "native" ? "cursor-not-allowed" : "cursor-pointer hover:text-foreground"}`}
                                        disabled={field.source === "native"}
                                        title={field.source === "native" ? "Native fields are always visible" : field.isMasked ? "Show field" : "Hide field"}
                                    >
                                        {field.isMasked ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-emerald-500" />
                                        )}
                                    </button>
                                    <span className="text-sm truncate">{field.fieldLabel}</span>
                                    {field.source === "native" && (
                                        <Badge variant="secondary" className="text-[9px] shrink-0 px-1">Native</Badge>
                                    )}
                                    {field.isPromoted && (
                                        <Badge variant="default" className="text-[9px] shrink-0 px-1 bg-emerald-600">Column</Badge>
                                    )}
                                    {field.source === "custom" && !field.isPromoted && (
                                        <Badge variant="outline" className="text-[9px] shrink-0 px-1">Custom</Badge>
                                    )}
                                </div>

                                {field.source !== "native" && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0">
                                                <MoreVertical className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            {!field.isPromoted && (
                                                <DropdownMenuItem onClick={() => onPromote(field.id)}>
                                                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                                                    Promote to Native
                                                </DropdownMenuItem>
                                            )}
                                            {field.isPromoted && (
                                                <DropdownMenuItem onClick={() => onDemote(field.id)}>
                                                    <ArrowDownCircle className="h-4 w-4 mr-2" />
                                                    Demote to Custom
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                                onClick={() => setDeleteTarget(field)}
                                                className="text-red-600 focus:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Field
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        ))}
                        {sectionFields.length === 0 && (
                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                No fields in this section
                            </div>
                        )}
                    </div>
                    {hiddenCount > 0 && (
                        <div className="p-2 border-t bg-muted/50">
                            <p className="text-xs text-muted-foreground text-center">
                                {hiddenCount} field{hiddenCount > 1 ? "s" : ""} hidden
                            </p>
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &ldquo;{deleteTarget?.fieldLabel}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the field definition. Existing data in leads won&apos;t be deleted but will no longer display.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                if (deleteTarget) {
                                    onDelete(deleteTarget.id)
                                    setDeleteTarget(null)
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

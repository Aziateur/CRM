"use client"

import { useState, useEffect } from "react"
import { useScripts, useScriptSections } from "@/hooks/use-scripts"
import { useScriptInbox } from "@/hooks/use-playbook-engine"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { FlaskConical, Loader2, Send, ShieldCheck } from "lucide-react"

// ─── Props ───

interface SendToInboxDialogProps {
    open: boolean
    onOpenChange: (v: boolean) => void
    /** Pre-filled raw content from the call (transcript + rep note) */
    defaultContent?: string
    /** Source attempt ID for traceability */
    sourceAttemptId?: string
}

// ─── Component ───

export function AppendToScriptDialog({
    open,
    onOpenChange,
    defaultContent = "",
    sourceAttemptId,
}: SendToInboxDialogProps) {
    const { toast } = useToast()
    const { addToInbox } = useScriptInbox("pending")

    // Optional targeting — manager can pre-select where this insight should land
    const { scripts } = useScripts()
    const [scriptId, setScriptId] = useState("")
    const [sectionId, setSectionId] = useState("")
    const { sections } = useScriptSections(scriptId || null)

    // Raw content from the call
    const [content, setContent] = useState(defaultContent)

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setContent(defaultContent)
            setScriptId("")
            setSectionId("")
        }
    }, [open, defaultContent])

    const handleSend = () => {
        if (!content.trim()) return

        addToInbox.mutate(
            {
                rawTranscript: content.trim(),
                sourceAttemptId: sourceAttemptId,
                targetScriptId: scriptId || undefined,
                targetSectionId: sectionId || undefined,
            },
            {
                onSuccess: () => {
                    toast({
                        title: "Sent to Insight Lab 🧪",
                        description: "A manager will review and synthesize this before it goes live.",
                    })
                    onOpenChange(false)
                },
                onError: (err) => {
                    toast({
                        variant: "destructive",
                        title: "Failed to send",
                        description: err.message,
                    })
                },
            }
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-purple-500" />
                        Send to Insight Lab
                    </DialogTitle>
                    <DialogDescription className="flex items-start gap-2 pt-1">
                        <ShieldCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>
                            This will <strong>not</strong> touch the live Playbook script.
                            It lands in the Insight Lab queue for a manager to review, refine, and approve before going live.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 mt-2">

                    {/* Raw content from call */}
                    <div>
                        <Label className="text-xs">Raw Signal from Call</Label>
                        <Textarea
                            className="mt-1 min-h-[130px] font-mono text-xs"
                            placeholder="Paste the transcript or rep note here..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                            This raw text will be visible to the manager in the Insight Lab — they will synthesize it before it goes live.
                        </p>
                    </div>

                    {/* Optional target — helps manager know where to merge */}
                    <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 space-y-3">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">Optional</Badge>
                            <p className="text-xs text-muted-foreground">Pre-select where this insight should land</p>
                        </div>

                        <div>
                            <Label className="text-xs">Target Script</Label>
                            <Select
                                value={scriptId}
                                onValueChange={(val) => { setScriptId(val); setSectionId("") }}
                            >
                                <SelectTrigger className="h-9 mt-1">
                                    <SelectValue placeholder="Select a Playbook Script..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {scripts.length === 0 && (
                                        <SelectItem value="__none__" disabled>No scripts found</SelectItem>
                                    )}
                                    {scripts.map((script) => (
                                        <SelectItem key={script.id} value={script.id}>
                                            {script.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {scriptId && (
                            <div>
                                <Label className="text-xs">Target Section</Label>
                                <Select value={sectionId} onValueChange={setSectionId}>
                                    <SelectTrigger className="h-9 mt-1">
                                        <SelectValue placeholder="Select a Section..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sections.length === 0 && (
                                            <SelectItem value="__none__" disabled>No sections in this script</SelectItem>
                                        )}
                                        {sections.map((sec) => (
                                            <SelectItem key={sec.id} value={sec.id}>
                                                {sec.title || `Section ${sec.sortOrder + 1}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={!content.trim() || addToInbox.isPending}
                        className="gap-2"
                    >
                        {addToInbox.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        Send to Insight Lab
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

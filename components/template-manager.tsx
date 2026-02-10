"use client"

import { useState } from "react"
import { useTemplates } from "@/hooks/use-templates"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Edit3, FileText, Copy } from "lucide-react"
import type { Template, TemplateCategory } from "@/lib/store"

const categoryLabels: Record<TemplateCategory, string> = {
  call: "Call Script",
  email: "Email",
  sms: "SMS",
  note: "Note",
}

// Quick-pick popover for dial session
export function TemplateQuickPick({ onSelect }: { onSelect: (template: Template) => void }) {
  const { templates } = useTemplates()
  const [open, setOpen] = useState(false)

  const callTemplates = templates.filter((t) => t.category === "call")
  const emailTemplates = templates.filter((t) => t.category === "email")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 bg-transparent">
          <FileText className="h-4 w-4" />
          Scripts
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-50" align="start">
        <Tabs defaultValue="call">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="call" className="flex-1">Call ({callTemplates.length})</TabsTrigger>
            <TabsTrigger value="email" className="flex-1">Email ({emailTemplates.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="call" className="p-2 space-y-1 max-h-64 overflow-y-auto">
            {callTemplates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No call scripts yet</p>
            )}
            {callTemplates.map((t) => (
              <button
                key={t.id}
                className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                onClick={() => { onSelect(t); setOpen(false) }}
              >
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.body}</p>
                {t.variables.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {t.variables.map((v) => (
                      <Badge key={v} variant="outline" className="text-xs px-1 py-0">[{v}]</Badge>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </TabsContent>
          <TabsContent value="email" className="p-2 space-y-1 max-h-64 overflow-y-auto">
            {emailTemplates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No email templates yet</p>
            )}
            {emailTemplates.map((t) => (
              <button
                key={t.id}
                className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                onClick={() => { onSelect(t); setOpen(false) }}
              >
                <p className="text-sm font-medium">{t.name}</p>
                {t.subject && <p className="text-xs text-muted-foreground mt-0.5">Subject: {t.subject}</p>}
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.body}</p>
              </button>
            ))}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

// Full template editor for settings page
export function TemplateManager() {
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useTemplates()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [form, setForm] = useState({ name: "", category: "call" as TemplateCategory, subject: "", body: "" })

  const handleCreate = async () => {
    const result = await createTemplate(form)
    if (result) {
      setForm({ name: "", category: "call", subject: "", body: "" })
      setIsCreateOpen(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingTemplate) return
    const ok = await updateTemplate(editingTemplate.id, {
      name: form.name,
      category: form.category,
      subject: form.subject,
      body: form.body,
    })
    if (ok) {
      setEditingTemplate(null)
    }
  }

  const openEdit = (t: Template) => {
    setForm({ name: t.name, category: t.category, subject: t.subject || "", body: t.body })
    setEditingTemplate(t)
  }

  const callTemplates = templates.filter((t) => t.category === "call")
  const emailTemplates = templates.filter((t) => t.category === "email")
  const otherTemplates = templates.filter((t) => t.category !== "call" && t.category !== "email")

  const renderGroup = (label: string, items: Template[]) => {
    if (items.length === 0) return null
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
        {items.map((t) => (
          <Card key={t.id} className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{t.name}</p>
                    {t.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.body}</p>
                  {t.variables.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {t.variables.map((v) => (
                        <Badge key={v} variant="secondary" className="text-xs px-1 py-0">[{v}]</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => deleteTemplate(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Templates</h3>
        <Button size="sm" onClick={() => { setForm({ name: "", category: "call", subject: "", body: "" }); setIsCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> New Template
        </Button>
      </div>

      <div className="space-y-4">
        {renderGroup("Call Scripts", callTemplates)}
        {renderGroup("Email Templates", emailTemplates)}
        {renderGroup("Other", otherTemplates)}
        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No templates yet. Create one to get started.</p>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingTemplate} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditingTemplate(null) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Cold Call Opener" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex gap-2">
                {(["call", "email", "sms", "note"] as TemplateCategory[]).map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    size="sm"
                    variant={form.category === cat ? "default" : "outline"}
                    className={form.category === cat ? "" : "bg-transparent"}
                    onClick={() => setForm((f) => ({ ...f, category: cat }))}
                  >
                    {categoryLabels[cat]}
                  </Button>
                ))}
              </div>
            </div>
            {form.category === "email" && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Following up on our call" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Hi [name], this is [rep_name]..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">Use [variable_name] for placeholders. They&apos;ll be extracted automatically.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => { setIsCreateOpen(false); setEditingTemplate(null) }}>Cancel</Button>
            <Button onClick={editingTemplate ? handleUpdate : handleCreate} disabled={!form.name.trim() || !form.body.trim()}>
              {editingTemplate ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

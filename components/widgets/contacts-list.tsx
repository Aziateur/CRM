"use client"

import { useState } from "react"
import { Lead, contactRoleOptions, ContactRole } from "@/lib/store"
import { getSupabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, Plus, Trash2 } from "lucide-react"

// For dialog we can use a simpler approach or just render it inline. 
// Since the dialog takes up the screen, we'll keep it simple here.
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ContactsListProps {
    lead: Lead
    updateLead: (id: string, updates: Partial<Lead>) => void
}

export function ContactsListWidget({ lead, updateLead }: ContactsListProps) {
    const [isAddContactOpen, setIsAddContactOpen] = useState(false)
    const [newContact, setNewContact] = useState({ name: "", phone: "", role: "Other" as ContactRole })

    const handleAddContact = async () => {
        if (!newContact.name) return
        const contact = { ...newContact, lead_id: lead.id }

        // Opt update for instant UI response
        const tempId = Math.random().toString()
        updateLead(lead.id, { contacts: [...lead.contacts, { ...newContact, id: tempId }] })

        const supabase = getSupabase()
        const { data } = await supabase.from("contacts").insert([contact]).select().single()
        if (data) {
            // Replace temp with real
            const updatedContacts = [...lead.contacts, {
                id: data.id,
                name: data.name,
                phone: data.phone,
                role: data.role as ContactRole
            }]
            updateLead(lead.id, { contacts: updatedContacts })
        }

        setNewContact({ name: "", phone: "", role: "Other" })
        setIsAddContactOpen(false)
    }

    const handleDeleteContact = async (contactId: string) => {
        const updatedContacts = lead.contacts.filter(c => c.id !== contactId)
        updateLead(lead.id, { contacts: updatedContacts })

        // Also delete from DB
        const supabase = getSupabase()
        await supabase.from("contacts").delete().eq("id", contactId)
    }

    const handleSetPrimaryContact = async (contactId: string) => {
        const contacts = [...lead.contacts]
        const index = contacts.findIndex(c => c.id === contactId)
        if (index > 0) {
            const [contact] = contacts.splice(index, 1)
            contacts.unshift(contact)
            updateLead(lead.id, { contacts })
        }
    }

    return (
        <>
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Contacts</CardTitle>
                        <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setIsAddContactOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {lead.contacts.length > 0 ? (
                        <div className="space-y-2">
                            {lead.contacts.map((contact, i) => (
                                <div key={contact.id} className="flex items-center justify-between p-2 rounded border">
                                    <div className="flex items-center gap-3">
                                        <Button size="icon" variant="ghost" className={i === 0 ? "text-amber-500" : "text-muted-foreground"} onClick={() => handleSetPrimaryContact(contact.id)}>
                                            <Star className={`h-4 w-4 ${i === 0 ? "fill-current" : ""}`} />
                                        </Button>
                                        <div>
                                            <p className="text-sm font-medium">{contact.name}</p>
                                            {contact.phone && <a href={`tel:${contact.phone}`} className="text-xs text-primary hover:underline">{contact.phone}</a>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            {contactRoleOptions.map((role) => (
                                                <Button key={role} size="sm" variant={contact.role === role ? "default" : "outline"} className={contact.role === role ? "" : "bg-transparent"} onClick={async () => {
                                                    const nc = [...lead.contacts]; nc[i] = { ...contact, role }; updateLead(lead.id, { contacts: nc })
                                                    const supabase = getSupabase()
                                                    await supabase.from("contacts").update({ role }).eq("id", contact.id)
                                                }}>{role}</Button>
                                            ))}
                                        </div>
                                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-red-600" onClick={() => handleDeleteContact(contact.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">No contacts yet</p>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Contact</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="Contact name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="+1 555-0100" />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <div className="flex gap-2">
                                {contactRoleOptions.map((role) => (
                                    <Button key={role} type="button" variant={newContact.role === role ? "default" : "outline"} className={newContact.role === role ? "" : "bg-transparent"} size="sm" onClick={() => setNewContact({ ...newContact, role })}>{role}</Button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="bg-transparent" onClick={() => setIsAddContactOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddContact} disabled={!newContact.name}>Add Contact</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

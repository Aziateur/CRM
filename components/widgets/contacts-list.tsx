"use client"

import { useState } from "react"
import { Lead, contactRoleOptions, ContactRole } from "@/lib/store"
import { getSupabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Plus, Trash2, Phone, Smartphone, Mail, ExternalLink, Briefcase } from "lucide-react"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ContactsListProps {
    lead: Lead
    updateLead: (id: string, updates: Partial<Lead>) => void
}

export function ContactsListWidget({ lead, updateLead }: ContactsListProps) {
    const [isAddContactOpen, setIsAddContactOpen] = useState(false)
    const [newContact, setNewContact] = useState({
        firstName: "",
        lastName: "",
        jobTitle: "",
        role: "Other" as ContactRole,
        mobilePhone: "",
        workPhone: "",
        email: "",
        linkedin: "",
    })

    const handleAddContact = async () => {
        const name = [newContact.firstName, newContact.lastName].filter(Boolean).join(" ") || "Contact"
        const phone = newContact.mobilePhone || newContact.workPhone || ""

        const contact = {
            lead_id: lead.id,
            name,
            first_name: newContact.firstName || null,
            last_name: newContact.lastName || null,
            job_title: newContact.jobTitle || null,
            role: newContact.role,
            phone: phone || null,
            mobile_phone: newContact.mobilePhone || null,
            work_phone: newContact.workPhone || null,
            email: newContact.email || null,
            linkedin: newContact.linkedin || null,
        }

        // Optimistic update
        const tempId = Math.random().toString()
        updateLead(lead.id, {
            contacts: [...lead.contacts, {
                id: tempId,
                name,
                firstName: newContact.firstName,
                lastName: newContact.lastName,
                jobTitle: newContact.jobTitle,
                role: newContact.role,
                phone: phone || undefined,
                mobilePhone: newContact.mobilePhone || undefined,
                workPhone: newContact.workPhone || undefined,
                email: newContact.email || undefined,
                linkedin: newContact.linkedin || undefined,
            }],
        })

        const supabase = getSupabase()
        const { data } = await supabase.from("contacts").insert([contact]).select().single()
        if (data) {
            const updatedContacts = lead.contacts.filter(c => c.id !== tempId)
            updatedContacts.push({
                id: data.id,
                name: data.name,
                firstName: data.first_name,
                lastName: data.last_name,
                jobTitle: data.job_title,
                role: data.role as ContactRole,
                phone: data.phone,
                mobilePhone: data.mobile_phone,
                workPhone: data.work_phone,
                email: data.email,
                linkedin: data.linkedin,
            })
            updateLead(lead.id, { contacts: updatedContacts })
        }

        setNewContact({
            firstName: "", lastName: "", jobTitle: "",
            role: "Other", mobilePhone: "", workPhone: "",
            email: "", linkedin: "",
        })
        setIsAddContactOpen(false)
    }

    const handleDeleteContact = async (contactId: string) => {
        const updatedContacts = lead.contacts.filter(c => c.id !== contactId)
        updateLead(lead.id, { contacts: updatedContacts })
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

    const handleRoleChange = async (contactId: string, newRole: ContactRole, contactIndex: number) => {
        const nc = [...lead.contacts]
        nc[contactIndex] = { ...nc[contactIndex], role: newRole }
        updateLead(lead.id, { contacts: nc })
        const supabase = getSupabase()
        await supabase.from("contacts").update({ role: newRole }).eq("id", contactId)
    }

    return (
        <>
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                            Contacts
                            {lead.contacts.length > 0 && (
                                <Badge variant="secondary" className="ml-2 text-[10px]">{lead.contacts.length}</Badge>
                            )}
                        </CardTitle>
                        <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setIsAddContactOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {lead.contacts.length > 0 ? (
                        <div className="space-y-2">
                            {lead.contacts.map((contact, i) => (
                                <div key={contact.id} className="p-3 rounded-lg border space-y-2">
                                    {/* Row 1: Star + Name + Title + Actions */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 min-w-0">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className={`h-7 w-7 shrink-0 ${i === 0 ? "text-amber-500" : "text-muted-foreground"}`}
                                                onClick={() => handleSetPrimaryContact(contact.id)}
                                            >
                                                <Star className={`h-3.5 w-3.5 ${i === 0 ? "fill-current" : ""}`} />
                                            </Button>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {contact.name}
                                                    {contact.seniorityLevel && (
                                                        <Badge variant="outline" className="ml-1.5 text-[9px] align-middle">{contact.seniorityLevel}</Badge>
                                                    )}
                                                </p>
                                                {contact.jobTitle && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <Briefcase className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">{contact.jobTitle}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {/* Role toggle */}
                                            <div className="flex gap-0.5">
                                                {contactRoleOptions.map((role) => (
                                                    <Button
                                                        key={role}
                                                        size="sm"
                                                        variant={contact.role === role ? "default" : "outline"}
                                                        className={`h-6 text-[10px] px-1.5 ${contact.role === role ? "" : "bg-transparent"}`}
                                                        onClick={() => handleRoleChange(contact.id, role, i)}
                                                    >
                                                        {role}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                                onClick={() => handleDeleteContact(contact.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Row 2: Phone numbers + Email + LinkedIn */}
                                    {(contact.phone || contact.mobilePhone || contact.workPhone || contact.email || contact.linkedin) && (
                                        <div className="flex flex-wrap items-center gap-1.5 pl-9">
                                            {/* Mobile phone */}
                                            {(contact.mobilePhone || (!contact.workPhone && contact.phone)) && (
                                                <a
                                                    href={`tel:${contact.mobilePhone || contact.phone}`}
                                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-0.5 rounded-full"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Smartphone className="h-3 w-3" />
                                                    {contact.mobilePhone || contact.phone}
                                                </a>
                                            )}
                                            {/* Work phone */}
                                            {contact.workPhone && (
                                                <a
                                                    href={`tel:${contact.workPhone}`}
                                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline bg-muted/50 px-2 py-0.5 rounded-full"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Phone className="h-3 w-3" />
                                                    {contact.workPhone}
                                                </a>
                                            )}
                                            {/* If we have both mobile and the generic phone is different, show it */}
                                            {contact.mobilePhone && contact.phone && contact.phone !== contact.mobilePhone && contact.phone !== contact.workPhone && (
                                                <a
                                                    href={`tel:${contact.phone}`}
                                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline bg-muted/50 px-2 py-0.5 rounded-full"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Phone className="h-3 w-3" />
                                                    {contact.phone}
                                                </a>
                                            )}
                                            {/* Email */}
                                            {contact.email && (
                                                <a
                                                    href={`mailto:${contact.email}`}
                                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline bg-muted/50 px-2 py-0.5 rounded-full"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Mail className="h-3 w-3" />
                                                    <span className="truncate max-w-[120px]">{contact.email}</span>
                                                </a>
                                            )}
                                            {/* LinkedIn */}
                                            {contact.linkedin && (
                                                <a
                                                    href={contact.linkedin}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded-full"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    LinkedIn
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">No contacts yet</p>
                    )}
                </CardContent>
            </Card>

            {/* Add Contact Dialog — enriched */}
            <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Contact</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>First Name *</Label>
                                <Input
                                    value={newContact.firstName}
                                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                                    placeholder="Taylor"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name</Label>
                                <Input
                                    value={newContact.lastName}
                                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                                    placeholder="Oatman"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Job Title</Label>
                            <Input
                                value={newContact.jobTitle}
                                onChange={(e) => setNewContact({ ...newContact, jobTitle: e.target.value })}
                                placeholder="Owner"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Mobile Phone</Label>
                                <Input
                                    value={newContact.mobilePhone}
                                    onChange={(e) => setNewContact({ ...newContact, mobilePhone: e.target.value })}
                                    placeholder="+1 555-0100"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Work Phone</Label>
                                <Input
                                    value={newContact.workPhone}
                                    onChange={(e) => setNewContact({ ...newContact, workPhone: e.target.value })}
                                    placeholder="+1 555-0200"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={newContact.email}
                                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                placeholder="taylor@company.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>LinkedIn</Label>
                            <Input
                                type="url"
                                value={newContact.linkedin}
                                onChange={(e) => setNewContact({ ...newContact, linkedin: e.target.value })}
                                placeholder="https://linkedin.com/in/..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <div className="flex gap-2">
                                {contactRoleOptions.map((role) => (
                                    <Button
                                        key={role}
                                        type="button"
                                        variant={newContact.role === role ? "default" : "outline"}
                                        className={newContact.role === role ? "" : "bg-transparent"}
                                        size="sm"
                                        onClick={() => setNewContact({ ...newContact, role })}
                                    >
                                        {role}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="bg-transparent" onClick={() => setIsAddContactOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddContact} disabled={!newContact.firstName}>Add Contact</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

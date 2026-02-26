"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getSupabase } from "@/lib/supabase"
import { Topbar } from "@/components/topbar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import {
  Shield,
  ShieldAlert,
  Loader2,
  Users,
  UserPlus,
  Trash2,
  Crown,
  UserX,
  UserCheck,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react"

// ─── Types ───
interface ProjectMember {
  id: string
  email: string
  name: string
  avatar_url: string | null
  role: string
  joined_at: string
}

interface SystemUser {
  id: string
  email: string
  name: string
  system_role: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

interface CreatedUserInfo {
  name: string
  email: string
  password: string
  projectRole: string
}

type Tab = "team" | "system"

// ─── Password Generator ───
function generatePassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghjkmnpqrstuvwxyz"
  const digits = "23456789"
  const symbols = "!@#$%&*"
  const all = upper + lower + digits + symbols

  // Guarantee at least one of each type
  let pw = ""
  pw += upper[Math.floor(Math.random() * upper.length)]
  pw += lower[Math.floor(Math.random() * lower.length)]
  pw += digits[Math.floor(Math.random() * digits.length)]
  pw += symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = pw.length; i < length; i++) {
    pw += all[Math.floor(Math.random() * all.length)]
  }

  // Shuffle
  return pw.split("").sort(() => Math.random() - 0.5).join("")
}

export default function AdminPage() {
  const {
    user,
    loading: authLoading,
    currentProjectId,
    canManage,
    isProjectOwner,
    isSuperAdmin,
    removeUser,
    changeUserRole,
  } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<Tab>("team")
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Create user form
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState(() => generatePassword())
  const [newRole, setNewRole] = useState<"manager" | "rep">("rep")
  const [showPassword, setShowPassword] = useState(false)
  const [creating, setCreating] = useState(false)

  // Created user modal
  const [createdUser, setCreatedUser] = useState<CreatedUserInfo | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Protection: must be manager+ or superadmin
  useEffect(() => {
    if (!authLoading && user && !canManage && !isSuperAdmin) {
      router.push("/dashboard")
    }
  }, [user, authLoading, canManage, isSuperAdmin, router])

  // ─── Fetchers ───
  const fetchMembers = useCallback(async () => {
    if (!currentProjectId) return
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("user_projects")
      .select("role, joined_at, users(id, email, name, avatar_url)")
      .eq("project_id", currentProjectId)

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
      return
    }

    const mapped: ProjectMember[] = (data || []).map((row: Record<string, unknown>) => {
      const u = row.users as Record<string, unknown>
      return {
        id: u.id as string,
        email: u.email as string,
        name: u.name as string,
        avatar_url: (u.avatar_url as string) || null,
        role: row.role as string,
        joined_at: row.joined_at as string,
      }
    })
    setMembers(mapped)
  }, [currentProjectId, toast])

  const fetchSystemUsers = useCallback(async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, system_role, avatar_url, is_active, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
      return
    }
    // Service users (Dev Tool, etc.) are only visible to superadmins
    const filtered = (data || []).filter((u: SystemUser) =>
      u.system_role !== 'service' || user?.system_role === 'superadmin'
    )
    setSystemUsers(filtered)
  }, [toast, user?.system_role])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      fetchMembers(),
      ...(isSuperAdmin ? [fetchSystemUsers()] : []),
    ]).finally(() => setLoading(false))
  }, [user, currentProjectId, fetchMembers, fetchSystemUsers, isSuperAdmin])

  // ─── Create User ───
  const handleCreateUser = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" })
      return
    }
    if (!user || !currentProjectId) return

    setCreating(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc("create_user_for_project", {
        p_creator_id: user.id,
        p_project_id: currentProjectId,
        p_name: newName.trim(),
        p_email: newEmail.trim(),
        p_password: newPassword,
        p_project_role: newRole,
        p_system_role: "user",
      })

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" })
        setCreating(false)
        return
      }

      const result = data as { success: boolean; error?: string; action?: string }

      if (!result.success) {
        toast({ title: "Error", description: result.error || "Failed to create user", variant: "destructive" })
        setCreating(false)
        return
      }

      // Show credentials modal
      setCreatedUser({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        projectRole: newRole,
      })

      toast({
        title: result.action === "enrolled_existing" ? "User Added" : "User Created",
        description: result.action === "enrolled_existing"
          ? `${newName.trim()} was already registered and has been added to the project.`
          : `${newName.trim()} has been created and added to the project.`,
      })

      // Reset form
      setNewName("")
      setNewEmail("")
      setNewPassword(generatePassword())
      setNewRole("rep")
      setShowPassword(false)
      fetchMembers()
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to create user", variant: "destructive" })
    }
    setCreating(false)
  }

  // ─── Copy to clipboard ───
  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCopyAllCredentials = async () => {
    if (!createdUser) return
    const text = `Dalio CRM Login Credentials\n───────────────────────\nName: ${createdUser.name}\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}\nRole: ${createdUser.projectRole}\n───────────────────────\nLogin at: ${typeof window !== 'undefined' ? window.location.origin : ''}`
    await navigator.clipboard.writeText(text)
    setCopied("all")
    setTimeout(() => setCopied(null), 2000)
  }

  // ─── Actions ───
  const handleRemove = async (userId: string, name: string) => {
    setActionLoading(userId)
    const result = await removeUser(userId)
    if (result.success) {
      toast({ title: "Removed", description: `${name} has been removed from the project.` })
      fetchMembers()
    } else {
      toast({ title: "Error", description: result.error || "Failed to remove", variant: "destructive" })
    }
    setActionLoading(null)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId)
    const result = await changeUserRole(userId, newRole)
    if (result.success) {
      toast({ title: "Updated", description: `Role changed to ${newRole}.` })
      fetchMembers()
    } else {
      toast({ title: "Error", description: result.error || "Failed to change role", variant: "destructive" })
    }
    setActionLoading(null)
  }

  const handleSystemRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId)
    const supabase = getSupabase()
    const { error } = await supabase.from("users").update({ system_role: newRole }).eq("id", userId)
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Updated", description: `System role changed to ${newRole}.` })
      fetchSystemUsers()
    }
    setActionLoading(null)
  }

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${name}? This cannot be undone.`)) return
    setActionLoading(userId)
    const supabase = getSupabase()
    const { error } = await supabase.from("users").delete().eq("id", userId)
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Deleted", description: `${name} has been permanently deleted.` })
      fetchSystemUsers()
    }
    setActionLoading(null)
  }

  const handleToggleActive = async (userId: string, name: string, currentlyActive: boolean) => {
    setActionLoading(userId)
    const supabase = getSupabase()
    const { error } = await supabase.from("users").update({ is_active: !currentlyActive }).eq("id", userId)
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } else {
      toast({
        title: currentlyActive ? "Deactivated" : "Activated",
        description: `${name} has been ${currentlyActive ? "deactivated" : "activated"}.`,
      })
      fetchSystemUsers()
    }
    setActionLoading(null)
  }

  // ─── Helpers ───
  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

  const roleIcon = (role: string) => {
    if (role === "owner") return <Crown className="h-3.5 w-3.5 text-amber-500" />
    if (role === "manager") return <Shield className="h-3.5 w-3.5 text-blue-500" />
    return <Users className="h-3.5 w-3.5 text-muted-foreground" />
  }

  const roleBadgeColor = (role: string) => {
    if (role === "owner") return "bg-amber-100 text-amber-700 border-amber-300"
    if (role === "manager") return "bg-blue-100 text-blue-700 border-blue-300"
    return "bg-gray-100 text-gray-700 border-gray-300"
  }

  // ─── Unauthorized ───
  if (!authLoading && (!user || (!canManage && !isSuperAdmin))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              <CardTitle>Unauthorized</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You need Manager or Owner access to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Tabs ───
  const tabs: { key: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: "team", label: "Team", icon: <Users className="h-4 w-4" />, show: canManage },
    { key: "system", label: "System Users", icon: <Shield className="h-4 w-4" />, show: isSuperAdmin },
  ]

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Admin" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Tab bar */}
        <div className="flex gap-1 border-b">
          {tabs.filter(t => t.show).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ─── Team Tab ─── */}
            {activeTab === "team" && (
              <div className="space-y-6">
                {/* Create User form */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Create User
                    </CardTitle>
                    <CardDescription>
                      Create a new user account and add them to this project. Share the credentials with them directly.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Full Name</Label>
                        <Input
                          placeholder="John Doe"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          placeholder="john@company.com"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Password</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              className="pr-10 font-mono text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setNewPassword(generatePassword())}
                            title="Generate new password"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Project Role</Label>
                        <Select
                          value={newRole}
                          onValueChange={(v: "manager" | "rep") => setNewRole(v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {isProjectOwner && <SelectItem value="manager">Manager</SelectItem>}
                            <SelectItem value="rep">Rep</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={handleCreateUser}
                        disabled={!newName.trim() || !newEmail.trim() || !newPassword.trim() || creating}
                        className="gap-1.5"
                      >
                        {creating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        Create User
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Credentials modal */}
                {createdUser && (
                  <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                          <UserCheck className="h-4 w-4" />
                          User Created — Share These Credentials
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setCreatedUser(null)}
                        >
                          Dismiss
                        </Button>
                      </div>
                      <CardDescription>
                        Copy and share these login details with the new user. The password won&apos;t be shown again.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 bg-white dark:bg-gray-900 rounded-lg p-4 border">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-muted-foreground">Name</span>
                            <p className="text-sm font-medium">{createdUser.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleCopy(createdUser.name, "name")}
                          >
                            {copied === "name" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-muted-foreground">Email</span>
                            <p className="text-sm font-medium font-mono">{createdUser.email}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleCopy(createdUser.email, "email")}
                          >
                            {copied === "email" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-muted-foreground">Password</span>
                            <p className="text-sm font-medium font-mono">{createdUser.password}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleCopy(createdUser.password, "password")}
                          >
                            {copied === "password" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Role</span>
                          <p className="text-sm">
                            <Badge variant="outline" className={`text-xs gap-1 ${roleBadgeColor(createdUser.projectRole)}`}>
                              {roleIcon(createdUser.projectRole)}
                              {createdUser.projectRole}
                            </Badge>
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={handleCopyAllCredentials}
                        >
                          {copied === "all" ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copied === "all" ? "Copied!" : "Copy All"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Members table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Project Members ({members.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No members found.</p>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Joined</TableHead>
                              {isProjectOwner && <TableHead className="w-16"></TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {members.map(m => (
                              <TableRow key={m.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={m.avatar_url || undefined} />
                                      <AvatarFallback className="text-xs">{getInitials(m.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <span className="font-medium text-sm">{m.name}</span>
                                      {m.id === user?.id && (
                                        <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">{m.email}</TableCell>
                                <TableCell>
                                  {isProjectOwner && m.id !== user?.id && m.role !== "owner" ? (
                                    <Select
                                      value={m.role}
                                      onValueChange={(v) => handleRoleChange(m.id, v)}
                                      disabled={actionLoading === m.id}
                                    >
                                      <SelectTrigger className="w-28 h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="rep">Rep</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge variant="outline" className={`text-xs gap-1 ${roleBadgeColor(m.role)}`}>
                                      {roleIcon(m.role)}
                                      {m.role}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                  {formatDate(m.joined_at)}
                                </TableCell>
                                {isProjectOwner && (
                                  <TableCell>
                                    {m.id !== user?.id && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                        disabled={actionLoading === m.id}
                                        onClick={() => handleRemove(m.id, m.name)}
                                      >
                                        {actionLoading === m.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ─── System Users Tab ─── */}
            {activeTab === "system" && isSuperAdmin && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <CardTitle className="text-sm">All System Users ({systemUsers.length})</CardTitle>
                  </div>
                  <CardDescription>
                    Platform-wide user management. Only visible to super admins.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {systemUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>System Role</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {systemUsers.map(u => (
                            <TableRow key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={u.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">{getInitials(u.name)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{u.name}</span>
                                    {u.id === user?.id && (
                                      <Badge variant="outline" className="text-[10px]">You</Badge>
                                    )}
                                    {!u.is_active && (
                                      <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700 border-red-300">
                                        <UserX className="h-3 w-3 mr-1" />Inactive
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                              <TableCell>
                                <Select
                                  value={u.system_role}
                                  onValueChange={(v) => handleSystemRoleChange(u.id, v)}
                                  disabled={actionLoading === u.id || u.id === user?.id}
                                >
                                  <SelectTrigger className="w-32 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="superadmin">Super Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {u.id !== user?.id ? (
                                  <Switch
                                    checked={u.is_active}
                                    onCheckedChange={() => handleToggleActive(u.id, u.name, u.is_active)}
                                    disabled={actionLoading === u.id}
                                  />
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                                    <UserCheck className="h-3 w-3 mr-1" />Active
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {formatDate(u.created_at)}
                              </TableCell>
                              <TableCell>
                                {u.id !== user?.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                    disabled={actionLoading === u.id}
                                    onClick={() => handleDeleteUser(u.id, u.name)}
                                  >
                                    {actionLoading === u.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

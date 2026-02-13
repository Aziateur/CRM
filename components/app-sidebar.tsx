"use client"

import { Users, BookOpen, Settings, BarChart3, LayoutDashboard, Phone, ClipboardList, LogOut } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ProjectSwitcher } from "@/components/project-switcher"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  {
    title: "Leads",
    url: "/",
    icon: Users,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Dial Session",
    url: "/dial-session",
    icon: Phone,
  },
  {
    title: "Batch Review",
    url: "/batch-review",
    icon: ClipboardList,
  },
  {
    title: "Playbook",
    url: "/playbook",
    icon: BookOpen,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const initials = user
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "??"

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold">Dalio CRM</span>
        </div>
        {/* Project Switcher */}
        <ProjectSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{user?.name || "User"}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email || ""}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

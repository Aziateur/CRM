"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
    id: string
    email: string
    name: string
}

export interface UserProject {
    id: string
    name: string
    description?: string
    role: string
    createdAt: string
}

interface AuthState {
    user: AuthUser | null
    projects: UserProject[]
    currentProjectId: string | null
    loading: boolean
}

interface AuthContextValue extends AuthState {
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
    register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
    logout: () => void
    switchProject: (projectId: string) => void
    createProject: (name: string, description?: string) => Promise<{ success: boolean; error?: string; projectId?: string }>
    isAuthenticated: boolean
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_USER = "dalio_crm_user"
const STORAGE_KEY_PROJECTS = "dalio_crm_projects"
const STORAGE_KEY_PROJECT_ID = "dalio_crm_current_project"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used within AuthProvider")
    return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        projects: [],
        currentProjectId: null,
        loading: true,
    })

    // Hydrate from localStorage on mount
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem(STORAGE_KEY_USER)
            const storedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS)
            const storedProjectId = localStorage.getItem(STORAGE_KEY_PROJECT_ID)

            if (storedUser) {
                const user = JSON.parse(storedUser) as AuthUser
                const projects = storedProjects ? (JSON.parse(storedProjects) as UserProject[]) : []
                const currentProjectId = storedProjectId || (projects.length > 0 ? projects[0].id : null)

                setState({ user, projects, currentProjectId, loading: false })
            } else {
                setState((prev) => ({ ...prev, loading: false }))
            }
        } catch {
            setState((prev) => ({ ...prev, loading: false }))
        }
    }, [])

    // Persist to localStorage whenever auth state changes
    const persist = useCallback((user: AuthUser, projects: UserProject[], projectId: string | null) => {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects))
        if (projectId) {
            localStorage.setItem(STORAGE_KEY_PROJECT_ID, projectId)
        }
    }, [])

    // ---------------------------------------------------------------------------
    // Login
    // ---------------------------------------------------------------------------
    const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase.rpc("authenticate", {
                p_email: email,
                p_password: password,
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { success: boolean; error?: string; user?: AuthUser; projects?: UserProject[] }
            if (!result.success) {
                return { success: false, error: result.error || "Invalid credentials" }
            }

            const user = result.user!
            const projects = result.projects || []
            const currentProjectId = projects.length > 0 ? projects[0].id : null

            persist(user, projects, currentProjectId)
            setState({ user, projects, currentProjectId, loading: false })

            return { success: true }
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : "Login failed" }
        }
    }, [persist])

    // ---------------------------------------------------------------------------
    // Register
    // ---------------------------------------------------------------------------
    const register = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase.rpc("register_user", {
                p_email: email,
                p_password: password,
                p_name: name,
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { success: boolean; error?: string; user?: AuthUser; project?: { id: string; name: string } }
            if (!result.success) {
                return { success: false, error: result.error || "Registration failed" }
            }

            const user = result.user!
            const project: UserProject = {
                id: result.project!.id,
                name: result.project!.name,
                role: "owner",
                createdAt: new Date().toISOString(),
            }

            persist(user, [project], project.id)
            setState({ user, projects: [project], currentProjectId: project.id, loading: false })

            return { success: true }
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : "Registration failed" }
        }
    }, [persist])

    // ---------------------------------------------------------------------------
    // Logout
    // ---------------------------------------------------------------------------
    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY_USER)
        localStorage.removeItem(STORAGE_KEY_PROJECTS)
        localStorage.removeItem(STORAGE_KEY_PROJECT_ID)
        setState({ user: null, projects: [], currentProjectId: null, loading: false })
    }, [])

    // ---------------------------------------------------------------------------
    // Switch Project
    // ---------------------------------------------------------------------------
    const switchProject = useCallback((projectId: string) => {
        localStorage.setItem(STORAGE_KEY_PROJECT_ID, projectId)
        setState((prev) => ({ ...prev, currentProjectId: projectId }))
    }, [])

    // ---------------------------------------------------------------------------
    // Create Project
    // ---------------------------------------------------------------------------
    const createProject = useCallback(async (name: string, description?: string): Promise<{ success: boolean; error?: string; projectId?: string }> => {
        if (!state.user) return { success: false, error: "Not authenticated" }

        try {
            const supabase = getSupabase()
            const { data, error } = await supabase.rpc("create_project", {
                p_user_id: state.user.id,
                p_name: name,
                p_description: description || null,
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { success: boolean; error?: string; project?: { id: string; name: string } }
            if (!result.success) {
                return { success: false, error: result.error || "Failed to create project" }
            }

            const newProject: UserProject = {
                id: result.project!.id,
                name: result.project!.name,
                description,
                role: "owner",
                createdAt: new Date().toISOString(),
            }

            const updatedProjects = [...state.projects, newProject]
            persist(state.user, updatedProjects, newProject.id)
            setState((prev) => ({
                ...prev,
                projects: updatedProjects,
                currentProjectId: newProject.id,
            }))

            return { success: true, projectId: newProject.id }
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : "Failed to create project" }
        }
    }, [state.user, state.projects, persist])

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    const value: AuthContextValue = {
        ...state,
        login,
        register,
        logout,
        switchProject,
        createProject,
        isAuthenticated: !!state.user,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

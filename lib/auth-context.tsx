"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { getSupabase, resetSupabaseClient } from "@/lib/supabase"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
    id: string
    email: string
    name: string
    system_role: 'admin' | 'user'
    avatar_url: string | null
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
    deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>
    updateUser: (updates: { name?: string; avatar_url?: string }) => Promise<{ success: boolean; error?: string }>
    isAuthenticated: boolean
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_USER = "dalio_crm_user"
const STORAGE_KEY_PROJECTS = "dalio_crm_projects"
const STORAGE_KEY_PROJECT_ID = "dalio_crm_current_project"
const STORAGE_KEY_TOKEN = "dalio_session_token"

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

    // Hydrate from localStorage on mount, then validate the session token
    useEffect(() => {
        const hydrate = async () => {
            try {
                const storedUser = localStorage.getItem(STORAGE_KEY_USER)
                const storedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS)
                const storedProjectId = localStorage.getItem(STORAGE_KEY_PROJECT_ID)
                const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN)

                if (storedUser && storedToken) {
                    const user = JSON.parse(storedUser) as AuthUser
                    const projects = storedProjects ? (JSON.parse(storedProjects) as UserProject[]) : []
                    const currentProjectId = storedProjectId || (projects.length > 0 ? projects[0].id : null)

                    // Optimistically set state so the UI doesn't flash the login screen
                    setState({ user, projects, currentProjectId, loading: true })

                    // Validate the session token against the database
                    try {
                        const supabase = getSupabase()
                        const { data, error } = await supabase.rpc("validate_session", {
                            p_token: storedToken,
                        })

                        if (error || !data?.valid) {
                            // Token expired or invalid — force logout
                            console.warn("[Auth] Session expired or invalid, logging out.")
                            localStorage.removeItem(STORAGE_KEY_USER)
                            localStorage.removeItem(STORAGE_KEY_PROJECTS)
                            localStorage.removeItem(STORAGE_KEY_PROJECT_ID)
                            localStorage.removeItem(STORAGE_KEY_TOKEN)
                            resetSupabaseClient()
                            setState({ user: null, projects: [], currentProjectId: null, loading: false })
                            return
                        }

                        // Session is valid — update user data from server (in case role/name changed)
                        if (data.user) {
                            const freshUser: AuthUser = {
                                id: data.user.id,
                                email: data.user.email,
                                name: data.user.name,
                                system_role: data.user.system_role,
                                avatar_url: data.user.avatar_url,
                            }
                            persist(freshUser, projects, currentProjectId)
                            setState({ user: freshUser, projects, currentProjectId, loading: false })
                        } else {
                            setState({ user, projects, currentProjectId, loading: false })
                        }
                    } catch (validationError) {
                        // Network error during validation — trust localStorage for offline resilience
                        console.warn("[Auth] Could not validate session, using cached credentials.")
                        setState({ user, projects, currentProjectId, loading: false })
                    }
                } else {
                    setState((prev) => ({ ...prev, loading: false }))
                }
            } catch {
                setState((prev) => ({ ...prev, loading: false }))
            }
        }

        hydrate()
    }, [])

    // Persist to localStorage whenever auth state changes
    const persist = useCallback((user: AuthUser, projects: UserProject[], projectId: string | null, token?: string) => {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects))
        if (projectId) {
            localStorage.setItem(STORAGE_KEY_PROJECT_ID, projectId)
        }
        if (token) {
            localStorage.setItem(STORAGE_KEY_TOKEN, token)
            resetSupabaseClient()
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

            const result = data as {
                success: boolean
                error?: string
                token?: string
                user?: {
                    id: string
                    email: string
                    name: string
                    system_role: 'admin' | 'user'
                    avatar_url: string | null
                }
                projects?: UserProject[]
            }

            if (!result.success) {
                return { success: false, error: result.error || "Invalid credentials" }
            }

            const user: AuthUser = {
                id: result.user!.id,
                email: result.user!.email,
                name: result.user!.name,
                system_role: result.user!.system_role,
                avatar_url: result.user!.avatar_url,
            }
            const projects = result.projects || []
            const currentProjectId = projects.length > 0 ? projects[0].id : null
            const token = result.token

            if (token) {
                persist(user, projects, currentProjectId, token)
            } else {
                persist(user, projects, currentProjectId)
            }

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

            const result = data as {
                success: boolean
                error?: string
                token?: string
                user?: {
                    id: string
                    email: string
                    name: string
                    system_role: 'admin' | 'user'
                    avatar_url: string | null
                }
                project?: { id: string; name: string }
            }

            if (!result.success) {
                return { success: false, error: result.error || "Registration failed" }
            }

            const user: AuthUser = {
                id: result.user!.id,
                email: result.user!.email,
                name: result.user!.name,
                system_role: result.user!.system_role,
                avatar_url: result.user!.avatar_url,
            }
            const project: UserProject = {
                id: result.project!.id,
                name: result.project!.name,
                role: "owner",
                createdAt: new Date().toISOString(),
            }
            const token = result.token

            if (token) {
                persist(user, [project], project.id, token)
            } else {
                persist(user, [project], project.id)
            }

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
        localStorage.removeItem(STORAGE_KEY_TOKEN)
        resetSupabaseClient()
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
            // We don't change token on create project
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
    // Delete Project
    // ---------------------------------------------------------------------------
    const deleteProject = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
        if (!state.user) return { success: false, error: "Not authenticated" }

        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("projects")
                .delete()
                .eq("id", id)

            if (error) {
                return { success: false, error: error.message }
            }

            // Remove project from local state
            const updatedProjects = state.projects.filter((p) => p.id !== id)

            // If the deleted project was the current one, switch to another project or null
            let newCurrentProjectId = state.currentProjectId
            if (state.currentProjectId === id) {
                newCurrentProjectId = updatedProjects.length > 0 ? updatedProjects[0].id : null
            }

            persist(state.user, updatedProjects, newCurrentProjectId)
            setState((prev) => ({
                ...prev,
                projects: updatedProjects,
                currentProjectId: newCurrentProjectId,
            }))

            return { success: true }
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : "Failed to delete project" }
        }
    }, [state.user, state.projects, state.currentProjectId, persist])

    // ---------------------------------------------------------------------------
    // Update User
    // ---------------------------------------------------------------------------
    const updateUser = useCallback(async (updates: { name?: string; avatar_url?: string }): Promise<{ success: boolean; error?: string }> => {
        if (!state.user) return { success: false, error: "Not authenticated" }

        try {
            const supabase = getSupabase()

            // Update the user in the database
            const { error } = await supabase
                .from("users")
                .update({
                    ...(updates.name !== undefined && { name: updates.name }),
                    ...(updates.avatar_url !== undefined && { avatar_url: updates.avatar_url }),
                })
                .eq("id", state.user.id)

            if (error) {
                return { success: false, error: error.message }
            }

            // Update local state
            const updatedUser: AuthUser = {
                ...state.user,
                ...(updates.name !== undefined && { name: updates.name }),
                ...(updates.avatar_url !== undefined && { avatar_url: updates.avatar_url }),
            }

            persist(updatedUser, state.projects, state.currentProjectId)
            setState((prev) => ({
                ...prev,
                user: updatedUser,
            }))

            return { success: true }
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : "Failed to update user" }
        }
    }, [state.user, state.projects, state.currentProjectId, persist])

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
        deleteProject,
        updateUser,
        isAuthenticated: !!state.user,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

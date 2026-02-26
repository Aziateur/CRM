"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BarChart3, Eye, EyeOff, Loader2 } from "lucide-react"

export function LoginPage() {
    const { login, register } = useAuth()
    const [mode, setMode] = useState<"login" | "register">("login")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [name, setName] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            if (mode === "login") {
                const result = await login(email, password)
                if (!result.success) {
                    setError(result.error || "Login failed")
                }
            } else {
                if (!name.trim()) {
                    setError("Name is required")
                    setLoading(false)
                    return
                }
                if (password.length < 6) {
                    setError("Password must be at least 6 characters")
                    setLoading(false)
                    return
                }
                const result = await register(email, password, name)
                if (!result.success) {
                    setError(result.error || "Registration failed")
                }
            }
        } catch {
            setError("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
            {/* Subtle grid pattern overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMCAwaDFWMUgweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvZz48L3N2Zz4=')] opacity-50" />

            <div className="relative w-full max-w-md">
                {/* Glow effect behind card */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 rounded-2xl blur-xl" />

                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4 shadow-lg shadow-blue-500/25">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Dalio CRM
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            {mode === "login" ? "Sign in to your account" : "Create your account"}
                        </p>
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {mode === "register" && (
                            <div className="space-y-2">
                                <Label htmlFor="auth-name" className="text-slate-300 text-sm font-medium">
                                    Full Name
                                </Label>
                                <Input
                                    id="auth-name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="auth-email" className="text-slate-300 text-sm font-medium">
                                Email
                            </Label>
                            <Input
                                id="auth-email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="auth-password" className="text-slate-300 text-sm font-medium">
                                Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="auth-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 h-11 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {mode === "login" ? "Signing in…" : "Creating account…"}
                                </span>
                            ) : (
                                mode === "login" ? "Sign In" : "Create Account"
                            )}
                        </Button>
                    </form>

                    {/* Toggle mode */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-400">
                            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                            <button
                                type="button"
                                onClick={() => {
                                    setMode(mode === "login" ? "register" : "login")
                                    setError(null)
                                }}
                                className="ml-1 text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                {mode === "login" ? "Sign up" : "Sign in"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

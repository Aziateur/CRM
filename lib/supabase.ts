import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (supabase) return supabase

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not set')
  }

  const headers: Record<string, string> = {}
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('dalio_session_token')
    if (token) {
      headers['x-session-token'] = token
    }
  }

  console.log("[Supabase] Initializing client with headers:", Object.keys(headers))
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers }
  })
  return supabase
}

export function resetSupabaseClient() {
  supabase = null
}

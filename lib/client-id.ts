// Stable client identifier for session persistence without auth.
// Generated once, stored in localStorage, returned on every call.

const STORAGE_KEY = "crm_client_id"

export function getClientId(): string {
  if (typeof window === "undefined") return "server"
  const existing = window.localStorage.getItem(STORAGE_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  window.localStorage.setItem(STORAGE_KEY, id)
  return id
}

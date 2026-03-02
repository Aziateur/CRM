import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const taskTypeLabels: Record<string, string> = {
  call_back: "Call",
  follow_up: "Follow up",
  meeting: "Meeting",
  email: "Email",
  custom: "Task",
}

export function timeSince(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  if (diffHours < 1) return "Just now"
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "1 day ago"
  return `${diffDays} days ago`
}

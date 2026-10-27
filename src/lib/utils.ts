import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWeight(weight: number): string {
  return `${weight.toFixed(1)}kg`
}

// Days remaining until a deadline, rounded up (partial days count as full days).
export function calculateDaysRemaining(deadline: Date | string): number {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// Convert a date-input string (yyyy-mm-dd) to an ISO instant at 23:59:59 LOCAL
// time, encoded as UTC. Storing the raw date string would land at midnight UTC,
// which shifts the countdown depending on the viewer's timezone.
export function endOfDayIso(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59`).toISOString()
}

// Day key "YYYY-MM-DD" in the viewer's LOCAL timezone. toISOString() buckets
// days by UTC, so between local midnight and 08:00 (UTC+8) it still reports
// "yesterday" — wrong for streaks, weekly windows and chart x-axes.
export function localDayIso(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
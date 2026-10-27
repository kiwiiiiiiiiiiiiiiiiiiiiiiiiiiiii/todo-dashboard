"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { localDayIso } from "@/lib/utils"

interface HealthLogFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: { date: string; weightKg?: number; workoutType?: string; minutes?: number }) => Promise<string | null>
  defaultDate?: string
}

// Compact form to log today's weight and/or workout.
// Returns an error string (shown inline) or null on success.
export function HealthLogForm({ open, onClose, onSubmit, defaultDate }: HealthLogFormProps) {
  const [date, setDate] = React.useState(defaultDate || localDayIso())
  const [weight, setWeight] = React.useState("")
  const [workoutType, setWorkoutType] = React.useState("lifting")
  const [minutes, setMinutes] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setErr(null)
      setDate(defaultDate || localDayIso())
    }
  }, [open, defaultDate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const hasWeight = weight.trim() !== ""
      const hasWorkout = minutes !== "" && Number(minutes) > 0
      if (!hasWeight && !hasWorkout) {
        setErr("Enter a weight or a workout duration.")
        return
      }
      const message = await onSubmit({
        date,
        weightKg: hasWeight ? Number(weight) : undefined,
        workoutType: hasWorkout ? workoutType : undefined,
        minutes: hasWorkout ? Number(minutes) : undefined,
      })
      if (message) {
        setErr(message)
        return
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-card border border-border rounded-sm p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[13px] font-medium uppercase tracking-wide mb-3">Log Health Entry</div>
        <form onSubmit={submit} className="space-y-2.5">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 w-full rounded-sm border border-border bg-background text-sm px-2 font-mono-tabular outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Weight (kg)</span>
            <input
              type="number"
              step="0.1"
              min="30"
              max="200"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-8 w-full rounded-sm border border-border bg-background text-sm px-2 font-mono-tabular outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="e.g. 72.5"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Workout</span>
              <select
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                className="h-8 w-full rounded-sm border border-border bg-background text-sm px-1.5 outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="lifting">Lifting</option>
                <option value="cardio">Cardio</option>
                <option value="mobility">Mobility</option>
                <option value="sport">Sport</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Minutes</span>
              <input
                type="number"
                min="0"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="h-8 w-full rounded-sm border border-border bg-background text-sm px-2 font-mono-tabular outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="45"
              />
            </label>
          </div>
          {err && <p className="text-[11px] text-destructive">{err}</p>}
          <div className="flex items-center justify-between pt-1">
            <Button type="button" onClick={onClose} className="h-7 px-2.5 text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="h-7 text-xs">
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

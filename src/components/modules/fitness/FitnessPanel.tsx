"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Dumbbell, AlertCircle, Plus, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getBrowserClient } from "@/lib/supabase/client"
import { localDayIso } from "@/lib/utils"
import { WeightChart } from "./WeightChart"
import { ConsistencyChart } from "./ConsistencyChart"
import { HealthLogForm } from "./HealthLogForm"

interface WeightEntry {
  date: string
  weight_kg: number
}

interface WorkoutEntry {
  id: string
  date: string
  type: string
  duration_minutes: number
}

export function FitnessPanel() {
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [reloading, setReloading] = useState(false)
  const hasLoadedRef = useRef(false)

  const isConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const fetchData = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    const supabase = getBrowserClient()
    // Only block the UI on the very first load; focus refetches keep old
    // content visible so the panel never flashes an empty state.
    if (!hasLoadedRef.current) setLoading(true)
    else setReloading(true)
    try {
      const [weightsResult, workoutsResult] = await Promise.all([
        supabase
          .from("weight_logs")
          .select("date, weight_kg")
          .order("date", { ascending: true })
          .limit(90),
        supabase
          .from("workouts")
          .select("id, date, type, duration_minutes")
          .order("date", { ascending: false })
          .limit(60),
      ])
      if (weightsResult.error) throw weightsResult.error
      if (workoutsResult.error) throw workoutsResult.error
      setWeights(weightsResult.data || [])
      setWorkouts(workoutsResult.data || [])
      setError(null)
      hasLoadedRef.current = true
    } catch (err: any) {
      setError(err?.message || "Failed to load health data")
    } finally {
      setLoading(false)
      setReloading(false)
    }
  }, [isConfigured])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Sync with external changes: refetch when the tab regains focus or comes
  // back from a hidden state (e.g. after editing data in the Supabase dashboard).
  useEffect(() => {
    const refill = () => {
      if (document.visibilityState === "visible") fetchData()
    }
    window.addEventListener("focus", refill)
    document.addEventListener("visibilitychange", refill)
    return () => {
      window.removeEventListener("focus", refill)
      document.removeEventListener("visibilitychange", refill)
    }
  }, [fetchData])

  const handleLog = async (values: {
    date: string
    weightKg?: number
    workoutType?: string
    minutes?: number
  }): Promise<string | null> => {
    if (!isConfigured) return "Supabase is not configured."
    const supabase = getBrowserClient()

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      return "Sign in to log entries — use the form in the Cyber-Skill Matrix panel."
    }

    const today = localDayIso()
    if (values.date > today) return "Date cannot be in the future."

    // Sanity check: weight shouldn't jump more than 5kg vs the last entry
    if (values.weightKg !== undefined && weights.length > 0) {
      const last = weights[weights.length - 1].weight_kg
      if (Math.abs(values.weightKg - last) > 5) {
        return `Weight jumped ${Math.abs(values.weightKg - last).toFixed(1)}kg from your last entry (${last}kg). Check the value.`
      }
    }

    try {
      if (values.weightKg !== undefined) {
        const { error: wErr } = await supabase.from("weight_logs").upsert(
          {
            user_id: userData.user.id,
            date: values.date,
            weight_kg: values.weightKg,
          },
          { onConflict: "user_id,date" }
        )
        if (wErr) throw wErr
      }
      if (values.minutes !== undefined && values.minutes > 0) {
        const { error: woErr } = await supabase.from("workouts").insert({
          user_id: userData.user.id,
          date: values.date,
          type: values.workoutType || "lifting",
          duration_minutes: Math.round(values.minutes),
        })
        if (woErr) throw woErr
      }
      await fetchData()
      return null
    } catch (err: any) {
      return err?.message || "Failed to save entry"
    }
  }

  // Recent workout rows: date + type + minutes + delete control
  const handleDeleteWorkout = async (id: string) => {
    if (!isConfigured) return
    const supabase = getBrowserClient()
    try {
      const { error: delError } = await supabase.from("workouts").delete().eq("id", id)
      if (delError) throw delError
      setError(null)
    } catch (err: any) {
      setError(err?.message || "Failed to delete workout")
    }
    await fetchData()
  }

  // Derived stats
  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight_kg : null
  const weekMinutes = workouts
    .filter((w) => w.date >= localDayIso(new Date(Date.now() - 7 * 86400000)))
    .reduce((sum, w) => sum + w.duration_minutes, 0)

  // Streak: consecutive active days ending today (or yesterday, so rest days don't break it)
  const activeDays = new Set(
    workouts
      .filter((w) => w.duration_minutes > 0)
      .map((w) => localDayIso(new Date(w.date)))
  )
  let streak = 0
  {
    const start = new Date()
    if (!activeDays.has(localDayIso(start))) start.setTime(Date.now() - 86400000)
    for (;;) {
      const key = localDayIso(start)
      if (activeDays.has(key)) {
        streak++
        start.setTime(start.getTime() - 86400000)
      } else {
        break
      }
    }
  }

  return (
    <div className="relative bg-card border border-border rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-[13px] font-medium uppercase tracking-wide">Fitness & Weight</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fetchData()}
            className={`text-muted-foreground/60 hover:text-foreground transition-colors ${
              reloading ? "animate-spin" : ""
            }`}
            title="Reload from database"
            aria-label="Reload from database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Button
            onClick={() => setFormOpen(true)}
            disabled={!isConfigured}
            className="h-7 px-2.5 text-xs"
            title={isConfigured ? "Log weight / workout" : "Configure Supabase first"}
          >
            <Plus className="w-3 h-3" /> Log
          </Button>
        </div>
      </div>

      {!isConfigured ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="w-5 h-5 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Supabase not configured</p>
          <p className="text-[11px] text-muted-foreground max-w-xs">
            Copy <code className="font-mono-tabular">.env.example</code> to <code className="font-mono-tabular">.env</code> to enable logging.
          </p>
        </div>
      ) : loading ? (
        <div className="h-40 flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-mono-tabular">Loading…</span>
        </div>
      ) : error ? (
        <div className="p-3 rounded-sm bg-muted/30 border border-border/50">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <WeightChart entries={weights} />
          <ConsistencyChart
            entries={workouts.map((w) => ({ date: w.date, duration_minutes: w.duration_minutes }))}
            days={14}
          />
          {workouts.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Recent workouts
              </div>
              {workouts.slice(0, 5).map((w) => (
                <div key={w.id} className="group flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 font-mono-tabular text-muted-foreground">
                    {new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="capitalize flex-1 truncate">{w.type}</span>
                  <span className="font-mono-tabular text-muted-foreground">{`${w.duration_minutes} min`}</span>
                  <button
                    onClick={() => handleDeleteWorkout(w.id)}
                    className="text-muted-foreground/50 hover:text-destructive transition-colors"
                    title="Delete workout"
                    aria-label="Delete workout"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div>
              <div className="text-xs font-mono-tabular">{`${streak} ${streak === 1 ? "day" : "days"}`}</div>
              <div className="text-[10px] text-muted-foreground">streak</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono-tabular">{`${weekMinutes} min`}</div>
              <div className="text-[10px] text-muted-foreground">this week</div>
            </div>
          </div>
        </div>
      )}

      <HealthLogForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleLog} />
    </div>
  )
}

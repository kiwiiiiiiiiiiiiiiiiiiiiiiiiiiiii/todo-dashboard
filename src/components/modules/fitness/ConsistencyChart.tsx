"use client"

import { useMemo } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { localDayIso } from "@/lib/utils"

// Workout consistency: sessions per day over the last N days.
// White bars on transparent, subtle #333 grid — Linear-style.
export function ConsistencyChart({
  entries,
  days = 14,
}: {
  entries: { date: string; duration_minutes: number }[]
  days?: number
}) {
  const data = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const e of entries) {
      const key = localDayIso(new Date(e.date))
      byDate.set(key, (byDate.get(key) || 0) + Number(e.duration_minutes))
    }
    // last N days ending today
    const result: { label: string; day: string; minutes: number }[] = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const key = localDayIso(d)
      result.push({
        day: key,
        label: d.toLocaleDateString("en-US", { day: "numeric" }),
        minutes: byDate.get(key) || 0,
      })
    }
    return result
  }, [entries, days])

  const activeDays = data.filter((d) => d.minutes > 0).length

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Consistency
        </span>
        <span className="text-[11px] font-mono-tabular text-muted-foreground">
          {activeDayCountLabel(activeDays, days)}
        </span>
      </div>
      <div className="h-16 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 2, right: 8, bottom: 0, left: 8 }}>
            <XAxis hide dataKey="day" />
            <YAxis hide domain={[0, "dataMax + 10"]} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "var(--card, #0a0a0a)",
                border: "1px solid #333",
                borderRadius: 4,
                fontSize: 11,
                padding: "6px 10px",
              }}
              labelStyle={{ color: "#8B8B8B", fontSize: 10 }}
              itemStyle={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
              formatter={(value) => [`${value} min`, undefined]}
            />
            <Bar dataKey="minutes" fill="#FFFFFF" radius={[1, 1, 0, 0]} maxBarSize={6} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function activeDayCountLabel(active: number, days: number) {
  return `${active}/${days} active`
}

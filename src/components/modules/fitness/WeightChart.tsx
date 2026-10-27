"use client"

import { useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { formatWeight } from "@/lib/utils"

// Minimalist Linear-style weight trend.
// Thin 1.5px line, no dots except hover, subtle #333 grid, monospaced numbers.
export function WeightChart({ entries }: { entries: { date: string; weight_kg: number }[] }) {
  const data = useMemo(
    () =>
      entries
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((e) => ({
          date: e.date,
          label: new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          weight: Number(e.weight_kg),
        })),
    [entries]
  )

  if (data.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center">
        <span className="text-[11px] text-muted-foreground">No weight logged yet</span>
      </div>
    )
  }

  const first = data[0].weight
  const last = data[data.length - 1].weight
  const delta = Math.round((last - first) * 10) / 10
  const deltaLabel = `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toFixed(1)}kg`

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-mono-tabular font-medium">{formatWeight(last)}</span>
          <span
            className={`text-[11px] font-mono-tabular ${
              delta < 0 ? "text-emerald-400" : delta > 0 ? "text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            {deltaLabel} total
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono-tabular">
          {data.length}d
        </span>
      </div>
      <div className="h-28 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={32}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v: number) => `${Number(v).toFixed(1)}`}
            />
            <Tooltip
              cursor={{ stroke: "#333", strokeDasharray: "3 3" }}
              contentStyle={{
                background: "var(--card, #0a0a0a)",
                border: "1px solid #333",
                borderRadius: 4,
                fontSize: 11,
                padding: "6px 10px",
              }}
              labelStyle={{ color: "#8B8B8B", fontSize: 10, marginBottom: 2 }}
              itemStyle={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
              formatter={(value) => [`${Number(value).toFixed(1)}kg`, undefined]}
            />
            <Line
              type="linear"
              dataKey="weight"
              stroke="#FFFFFF"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 2.5, fill: "#FFFFFF" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

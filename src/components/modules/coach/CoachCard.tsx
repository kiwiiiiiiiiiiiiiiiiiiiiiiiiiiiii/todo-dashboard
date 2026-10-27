"use client"

import { Command } from "lucide-react"
import { Button } from "@/components/ui/button"

// Bento cell for the AI coach — teases the palette and opens it.
export function CoachCard() {
  const open = () => {
    window.dispatchEvent(new CustomEvent("open-coach"))
  }

  return (
    <div className="flex h-full flex-col bg-card border border-border rounded-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Command className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-[13px] font-medium uppercase tracking-wide">
          AI Accountability Coach
        </h2>
        <span className="ml-auto text-[11px] font-mono-tabular text-emerald-400">⌘K</span>
      </div>

      <div className="flex-1 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          The coach reads your live data — active project, deadline pressure, weight trend,
          workout consistency, skill progression — and holds you to it.
        </p>
        <div className="space-y-1.5">
          {["Deadline pressure audit", "Today's plan from live WIP", "Weight trend read"].map((t) => (
            <div
              key={t}
              className="flex items-center gap-2 text-[11px] text-muted-foreground"
            >
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              {t}
            </div>
          ))}
        </div>
      </div>

      <Button onClick={open} className="mt-4 h-8 w-full text-xs">
        Open coach <span className="ml-1 font-mono-tabular">⌘K</span>
      </Button>
    </div>
  )
}

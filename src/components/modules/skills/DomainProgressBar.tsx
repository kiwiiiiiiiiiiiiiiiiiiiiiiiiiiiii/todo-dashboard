"use client"

import { motion } from "framer-motion"

// Linear-style progression bar: 1px-track, white fill, 250ms ease-out.
export function DomainProgressBar({
  name,
  progress,
  max,
}: {
  name: string
  progress: number
  max: number
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((progress / max) * 100))) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{name}</span>
        <span className="text-[11px] font-mono-tabular text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1 bg-muted rounded-sm overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="h-full bg-white rounded-sm"
        />
      </div>
    </div>
  )
}

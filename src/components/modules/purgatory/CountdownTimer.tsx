"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

// Gamified deadline tracker for the active WIP task.
// Ticks every second and turns urgent as the deadline approaches.
export function CountdownTimer({ deadline }: { deadline: string | Date }) {
  const [time, setTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const end = new Date(deadline)
      const diff = end.getTime() - now.getTime()
      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
        return
      }
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      })
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  const nearDeadline = !time.expired && time.days === 0 && time.hours < 24

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "font-mono-tabular text-xs font-medium",
          time.expired
            ? "text-destructive"
            : nearDeadline
            ? "text-accent-foreground"
            : "text-foreground"
        )}
      >
        {time.expired ? "EXPIRED" : `${time.days}d ${time.hours}h ${time.minutes}m`}
      </span>
    </div>
  )
}

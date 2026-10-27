"use client"

import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { localDayIso } from "@/lib/utils"

interface ProjectDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: {
    title: string
    description: string
    deadline: string
    skillDomainId: string
  }) => Promise<unknown> | void
  domains: { id: string; name: string; category: string }[]
}

// Quick-pick offsets in days for the deadline dropdown (custom date still allowed).
const DEADLINE_PRESETS: { label: string; days: number }[] = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
]
const MAX_DEADLINE_DAYS = 90

export function ProjectDialog({ open, onClose, onSubmit, domains }: ProjectDialogProps) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [deadline, setDeadline] = React.useState("")
  const [skillDomainId, setSkillDomainId] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setSkillDomainId("")
      setErr(null)
    }
  }, [open])

  const validateDeadline = (value: string): string | null => {
    if (!value) return null // keep "required" handling in the input
    const today = localDayIso()
    if (value < today) return "Deadline can't be in the past."
    const days = Math.round((new Date(value).getTime() - new Date(today).getTime()) / 86400000)
    if (days > MAX_DEADLINE_DAYS) return `Deadline max is ${MAX_DEADLINE_DAYS} days out.`
    return null
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content className="bg-card border border-border rounded-sm p-5 w-full max-w-sm">
        <Dialog.Title className="text-[13px] font-medium uppercase tracking-wide mb-3">
          Add Project to Purgatory
        </Dialog.Title>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (busy || err || !deadline) return
            const deadlineErr = validateDeadline(deadline)
            if (deadlineErr) {
              setErr(deadlineErr)
              return
            }
            setBusy(true)
            try {
              await onSubmit({ title, description, deadline, skillDomainId })
            } finally {
              setBusy(false)
            }
          }}
          className="space-y-3"
        >
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Title
            </label>
            <input
              className="flex h-8 w-full rounded-sm border border-border bg-background text-sm px-3 outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Launch portfolio site"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-24 w-full rounded-sm border border-border bg-background text-sm px-3 py-2 outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Deadline
            </label>
            <select
              value=""
              onChange={(e) => {
                const days = Number(e.target.value)
                setDeadline(localDayIso(new Date(Date.now() + days * 86400000)))
                setErr(null)
              }}
              className="h-8 w-full rounded-sm border border-border bg-background text-sm px-1.5 outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Quick pick… (or use date field)</option>
              {DEADLINE_PRESETS.map((p) => (
                <option key={p.days} value={p.days}>
                  {p.label} → {localDayIso(new Date(Date.now() + p.days * 86400000))}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={deadline}
              min={localDayIso()}
              max={localDayIso(new Date(Date.now() + MAX_DEADLINE_DAYS * 86400000))}
              onChange={(e) => {
                setDeadline(e.target.value)
                setErr(validateDeadline(e.target.value))
              }}
              className="h-8 w-full rounded-sm border border-border bg-background text-sm px-3 outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {err && <p className="text-[11px] text-destructive">{err}</p>}
          </div>
          {domains.length > 0 && (
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Skill domain
              </label>
              <select
                value={skillDomainId}
                onChange={(e) => setSkillDomainId(e.target.value)}
                className="h-8 w-full rounded-sm border border-border bg-background text-sm px-1.5 outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">None — general project</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <Dialog.Close asChild>
              <Button type="button" className="h-8">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={!title || !deadline || busy} className="h-8">
              {busy ? "Adding…" : "Add Project"}
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}

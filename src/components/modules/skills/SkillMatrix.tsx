"use client"

import { useCallback, useEffect, useState } from "react"
import { Brain, AlertCircle } from "lucide-react"
import { getBrowserClient } from "@/lib/supabase/client"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { AuthPrompt } from "@/components/modules/auth/AuthPrompt"
import { DomainProgressBar } from "./DomainProgressBar"

interface SkillDomain {
  id: string
  category: string
  name: string
  current_progress: number
  max_progress: number
}

const CATEGORY_LABELS: Record<string, string> = {
  cyber: "Cybersecurity",
  ai: "AI Development",
}

export function SkillMatrix() {
  const isConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const { user, ready } = useSupabaseUser()
  const [domains, setDomains] = useState<SkillDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    const supabase = getBrowserClient()
    setLoading(true)
    try {
      let { data, error } = await supabase.from("skill_domains").select("*").order("name")
      if (error) throw error

      // Auto-seed on first run for an authenticated user with no domains yet
      if (user && (!data || data.length === 0)) {
        const { error: seedError } = await supabase.rpc("seed_my_skill_domains")
        if (!seedError) {
          const again = await supabase.from("skill_domains").select("*").order("name")
          if (again.error) throw again.error
          data = again.data
        }
      }

      // Cybersecurity first, AI second; alphabetical within each
      const sorted = (data || []).sort((a, b) =>
        a.category === b.category
          ? a.name.localeCompare(b.name)
          : a.category === "cyber"
          ? -1
          : 1
      )
      setDomains(sorted)
      setError(null)
    } catch (err: any) {
      setError(err?.message || "Failed to load skill domains")
    } finally {
      setLoading(false)
    }
  }, [isConfigured, user])

  useEffect(() => {
    if (ready) fetchData()
  }, [fetchData, ready])

  return (
    <div className="bg-card border border-border rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-[13px] font-medium uppercase tracking-wide">Cyber-Skill Matrix</h2>
        </div>
        {domains.length > 0 && (
          <span className="text-[11px] font-mono-tabular text-muted-foreground">
            {domains.length} domains
          </span>
        )}
      </div>

      {!isConfigured ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="w-5 h-5 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Supabase not configured</p>
          <p className="text-[11px] text-muted-foreground max-w-xs">
            Copy <code className="font-mono-tabular">.env.example</code> to{" "}
            <code className="font-mono-tabular">.env</code> and run the SQL in{" "}
            <code className="font-mono-tabular">supabase/</code>.
          </p>
        </div>
      ) : loading || !ready ? (
        <div className="h-32 flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-mono-tabular">Loading…</span>
        </div>
      ) : error ? (
        <div className="p-3 rounded-sm bg-muted/30 border border-border/50">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      ) : !user ? (
        <AuthPrompt />
      ) : domains.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-xs text-muted-foreground">No skill domains yet</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(["cyber", "ai"] as const).map((category) => {
            const list = domains.filter((d) => d.category === category)
            if (list.length === 0) return null
            return (
              <div key={category} className="space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                  {CATEGORY_LABELS[category] || category}
                </div>
                {list.map((d) => (
                  <DomainProgressBar
                    key={d.id}
                    name={d.name}
                    progress={d.current_progress}
                    max={d.max_progress}
                  />
                ))}
              </div>
            )
          })}
          <p className="pt-1 text-[10px] text-muted-foreground">
            Progress grows +5 when you complete a project linked to a domain.
          </p>
        </div>
      )}
    </div>
  )
}

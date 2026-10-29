"use client"

import { useCallback, useEffect, useState } from "react"
import { Lightbulb, AlertCircle, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getBrowserClient } from "@/lib/supabase/client"

interface Idea {
  id: string
  content: string
  created_at: string | null
}

// Quick idea capture: one input, newest-first list, delete button.
// Same shape as the other panels: only works when signed in (RLS-scoped).
export function IdeaPanel() {
  const isConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const [ideas, setIdeas] = useState<Idea[]>([])
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
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
      const { data, error: selError } = await supabase
        .from("ideas")
        .select("id, content, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
      if (selError) throw selError
      setIdeas(data || [])
      setError(null)
    } catch (err: any) {
      setError(err?.message || "Failed to load ideas")
    } finally {
      setLoading(false)
    }
  }, [isConfigured])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = text.trim()
    if (!content || busy) return
    const supabase = getBrowserClient()
    setBusy(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        setError("Sign in first — use the sign-in form in the Cyber-Skill Matrix panel.")
        return
      }
      const { error: insError } = await supabase.from("ideas").insert({
        user_id: userData.user.id,
        content,
      })
      if (insError) throw insError
      setText("")
      await fetchData()
    } catch (err: any) {
      setError(err?.message || "Failed to save idea")
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = getBrowserClient()
    try {
      const { error: delError } = await supabase.from("ideas").delete().eq("id", id)
      if (delError) throw delError
      setIdeas((prev) => prev.filter((i) => i.id !== id))
    } catch (err: any) {
      setError(err?.message || "Failed to delete idea")
    }
  }

  return (
    <div className="bg-card border border-border rounded-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-[13px] font-medium uppercase tracking-wide">Idea Inbox</h2>
        <span className="ml-auto text-[11px] font-mono-tabular text-muted-foreground">
          {ideas.length} saved
        </span>
      </div>

      {!isConfigured ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="w-5 h-5 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Supabase not configured</p>
        </div>
      ) : (
        <>
          <form onSubmit={handleAdd} className="mb-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleAdd(e)
                }
              }}
              rows={3}
              placeholder="An idea popped in your head…"
              className="min-h-[72px] w-full resize-none rounded-sm border border-border bg-background text-xs px-2.5 py-2 outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex justify-end mt-2">
              <Button type="submit" disabled={!text.trim() || busy} className="h-8 px-2.5 text-xs">
                <Plus className="w-3 h-3" /> Capture
              </Button>
            </div>
          </form>

          {loading ? (
            <div className="h-16 flex items-center justify-center">
              <span className="text-xs text-muted-foreground font-mono-tabular">Loading…</span>
            </div>
          ) : error ? (
            <div className="p-3 rounded-sm bg-muted/30 border border-border/50">
              <p className="text-[11px] text-destructive">{error}</p>
            </div>
          ) : ideas.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-4">
              Nothing captured yet — type a thought above and hit Enter.
            </p>
          ) : (
            <ul className="space-y-1 max-h-56 overflow-y-auto">
              {ideas.map((idea) => (
                <li key={idea.id} className="group flex items-start gap-2 text-xs">
                  <span className="w-14 shrink-0 font-mono-tabular text-[10px] text-muted-foreground pt-0.5">
                    {idea.created_at
                      ? new Date(idea.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </span>
                  <span className="flex-1 break-words">{idea.content}</span>
                  <button
                    onClick={() => handleDelete(idea.id)}
                    className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors"
                    title="Delete idea"
                    aria-label="Delete idea"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

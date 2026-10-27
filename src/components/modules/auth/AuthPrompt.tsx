"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { getBrowserClient } from "@/lib/supabase/client"

// Minimal magic-link sign-in. RLS policies scope every row of the schema to
// auth.uid(), so a session is required before any data can be read or written.
export function AuthPrompt() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const supabase = getBrowserClient()
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      })
      if (err) throw err
      setSent(true)
    } catch (err: any) {
      setError(err?.message || "Failed to send magic link")
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="py-6 text-center">
        <p className="text-xs text-foreground">Magic link sent</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Check your inbox: {email}</p>
      </div>
    )
  }

  return (
    <form onSubmit={signIn} className="space-y-2 py-2">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Sign in to sync your data — every row is scoped to your account via RLS.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-8 flex-1 rounded-sm border border-border bg-background text-sm px-2.5 outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button type="submit" disabled={busy} className="h-8 px-2.5 text-xs">
          {busy ? "…" : "Sign in"}
        </Button>
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </form>
  )
}

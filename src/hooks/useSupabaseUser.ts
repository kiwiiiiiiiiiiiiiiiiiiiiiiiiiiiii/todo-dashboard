"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { getBrowserClient } from "@/lib/supabase/client"

// Resolves the current Supabase user on mount and keeps it in sync
// with auth state changes (e.g. magic-link sign-in completing).
export function useSupabaseUser(): { user: User | null; ready: boolean } {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const configured =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    if (!configured) {
      setReady(true)
      return
    }
    const supabase = getBrowserClient()
    let active = true

    supabase.auth
      .getUser()
      .then(({ data }) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setReady(true))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setReady(true)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { user, ready }
}

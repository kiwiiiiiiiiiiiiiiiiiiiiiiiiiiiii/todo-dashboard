import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// ---------------------------------------------------------------------------
// Browser client (client components)
// Uses the Supabase anon key - all database access must respect RLS policies
// ---------------------------------------------------------------------------
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// Singleton instance for client components
let browserClient: ReturnType<typeof createClient> | null = null

export function getBrowserClient() {
  if (!browserClient) {
    browserClient = createClient()
  }
  return browserClient
}

import { type NextRequest, NextResponse } from "next/server"
import type { CookieOptions } from "@supabase/ssr"
import { createServerClient } from "@supabase/ssr"

// Middleware refreshes the Supabase auth session on every request so that
// signed-in state persists across server renders and client navigations.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  // Refresh the session (reads/writes the session cookie as needed)
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.*.*$).*)"],
}

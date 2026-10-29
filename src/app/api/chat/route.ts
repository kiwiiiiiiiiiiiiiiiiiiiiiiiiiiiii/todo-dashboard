import { streamText, type CoreMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"
import { resolveModelConfig } from "@/lib/ai/model"
import type { Database } from "@/lib/supabase/types"
import { chatRequestSchema, MAX_CHAT_TURNS } from "@/lib/chat/schema"

// System persona for the accountability coach
const SYSTEM_PROMPT = `You are the accountability coach embedded in the user's personal dashboard.
Rules:
- Be concise and direct. Default to 120 words or fewer unless asked to go deeper.
- Ground every claim in the live snapshot provided; never invent numbers.
- If data is missing, say so plainly.
- You are a technical sounding board too: implementation decisions, architecture, and learning plans are in scope.
- For medical or safety topics give a one-line practical caution, not a lecture.
`

// Free-tier friendly budget: enough for a burst of coaching, cheap to enforce.
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_SECONDS = 600

export const runtime = "nodejs"

async function gatherContext(supabase: SupabaseClient<Database>): Promise<string> {
  const lines: string[] = []
  const now = Date.now()
  const daysAgoIso = (days: number) =>
    new Date(now - days * 86400000).toISOString().slice(0, 10)

  const [projRes, wipRes, workoutsRes, weightRes, skillsRes] = await Promise.all([
    supabase.from("projects").select("title, status, is_blocking, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("works_in_progress").select("title, status, deadline, skill_domain_id").neq("status", "completed").order("deadline", { ascending: true }).limit(5),
    supabase.from("workouts").select("date, type, duration_minutes").gte("date", daysAgoIso(7)).order("date", { ascending: false }),
    supabase.from("weight_logs").select("date, weight_kg").order("date", { ascending: false }).limit(14),
    supabase.from("skill_domains").select("category, name, current_progress, max_progress").order("current_progress", { ascending: false }),
  ])

  const projects = projRes.data ?? []
  const activeTasks = wipRes.data ?? []
  const workouts = workoutsRes.data ?? []
  const weights = weightRes.data ?? []
  const skills = skillsRes.data ?? []

  lines.push("ACTIVE PROJECTS / WIP:")
  if (activeTasks.length === 0) {
    lines.push("- No open tasks.")
  }
  for (const t of activeTasks) {
    const daysLeft = t.deadline
      ? Math.max(0, Math.ceil((new Date(t.deadline).getTime() - now) / 86400000))
      : null
    lines.push(`- ${t.title} [${t.status}]${daysLeft !== null ? ` — ${daysLeft}d to deadline` : ""}`)
  }
  const done = projects.filter((p) => p.status === "done").length
  lines.push(`- Projects completed so far: ${done}`)

  const weekMinutes = workouts.reduce((s, w) => s + Number(w.duration_minutes ?? 0), 0)
  lines.push("FITNESS (last 7 days):")
  lines.push(`- Workouts: ${workouts.length} sessions, ${weekMinutes} minutes total`)
  if (weights.length > 0) {
    const latest = weights[0]
    const oldest = weights[weights.length - 1]
    const delta = Math.round((Number(latest.weight_kg) - Number(oldest.weight_kg)) * 10) / 10
    lines.push(`- Weight: latest ${latest.weight_kg}kg on ${latest.date}; ${delta >= 0 ? "+" : ""}${delta}kg over ${weights.length} entries`)
  } else {
    lines.push("- No weight logs yet.")
  }

  if (skills.length > 0) {
    lines.push("SKILL PROGRESS:")
    for (const s of skills) {
      const pct = s.max_progress > 0 ? Math.round((s.current_progress / s.max_progress) * 100) : 0
      lines.push(`- ${s.name} (${s.category}): ${s.current_progress}/${s.max_progress} (${pct}%)`)
    }
  }

  return lines.join("\n")
}

function errorResponse(status: number, error: string, headers?: HeadersInit) {
  return Response.json({ error }, { status, headers })
}

export async function POST(req: Request) {
  try {
    const { apiKey, baseURL, modelId } = resolveModelConfig()
    // A missing key is a server fault, not an auth challenge.
    if (!apiKey) {
      return errorResponse(500, "Server misconfigured: AI_API_KEY (or OPENAI_API_KEY) is not set.")
    }

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return errorResponse(400, "Request body must be valid JSON.")
    }

    // Validate before touching auth or the database: cheap, and rejects
    // oversized payloads, empty messages and client-supplied system roles.
    const parsed = chatRequestSchema.safeParse(raw)
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data: userData, error: authError } = await supabase.auth.getUser()
    if (authError || !userData?.user) {
      return errorResponse(401, "Sign in first — use the magic-link form in the Cyber-Skill Matrix panel.")
    }

    // Per-user budget, enforced in one atomic statement before the expensive
    // snapshot queries and the model call.
    const { data: limitRows, error: limitError } = await supabase.rpc("check_chat_rate_limit", {
      p_limit: RATE_LIMIT_MAX,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    })
    if (limitError) {
      console.error("rate limit check failed:", limitError.message)
      return errorResponse(503, "Rate limiter unavailable. Try again shortly.")
    }
    const limit = limitRows?.[0]
    if (limit && !limit.allowed) {
      return Response.json(
        {
          error: `Rate limit reached (${RATE_LIMIT_MAX} messages per ${RATE_LIMIT_WINDOW_SECONDS / 60} minutes). Try again later.`,
        },
        { status: 429, headers: { "Retry-After": String(limit.retry_after_seconds) } }
      )
    }

    const messages = parsed.data.messages.slice(-MAX_CHAT_TURNS)
    const timezone = parsed.data.timezone

    const context = await gatherContext(supabase)
    const system = [
      SYSTEM_PROMPT,
      `Today is ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: timezone })}.`,
      "Live database snapshot:",
      context,
    ].join("\n\n")

    try {
      const client = createOpenAI({ apiKey, baseURL })
      const result = await streamText({
        model: client(modelId),
        system,
        messages: messages as CoreMessage[],
        // Transient provider overload (503) is retried with backoff by the SDK.
        maxRetries: 4,
      })
      return result.toDataStreamResponse()
    } catch (err) {
      console.error("coach stream failed:", err instanceof Error ? err.message : err)
      // Upstream provider failure is a bad gateway, not our bug.
      return errorResponse(502, "The AI provider failed to respond. Try again.")
    }
  } catch (err) {
    console.error("chat route failed:", err instanceof Error ? err.message : err)
    return errorResponse(500, "Unexpected server error.")
  }
}

import { streamText, type CoreMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createServerClient } from "@/lib/supabase/server"
import { resolveModelConfig } from "@/lib/ai/model"

// System persona for the accountability coach
const SYSTEM_PROMPT = `You are the accountability coach embedded in the user's personal dashboard.
Rules:
- Be concise and direct. Default to 120 words or fewer unless asked to go deeper.
- Ground every claim in the live snapshot provided; never invent numbers.
- If data is missing, say so plainly.
- You are a technical sounding board too: implementation decisions, architecture, and learning plans are in scope.
- For medical or safety topics give a one-line practical caution, not a lecture.
`

export const runtime = "nodejs"

interface ChatMessage {
  role: string
  content: string
}

async function gatherContext(supabase: any, userId: string): Promise<string> {
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
  const done = projects.filter((p: any) => p.status === "done").length
  lines.push(`- Projects completed so far: ${done}`)

  const weekMinutes = workouts.reduce((s: number, w: any) => s + Number(w.duration_minutes || 0), 0)
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

export async function POST(req: Request) {
  const { apiKey, baseURL, modelId } = resolveModelConfig()
  if (!apiKey) {
    return Response.json(
      { error: "AI_API_KEY (or OPENAI_API_KEY) is not set. Add it to .env and restart the dev server." },
      { status: 401 }
    )
  }

  const body = await req.json()
  const messages = (body?.messages ?? []) as ChatMessage[]
  // Trim history: only the most recent turns go to the model. Unbounded
  // history inflates token cost and eventually trips free-tier rate limits.
  // Also drop any client-supplied "system" roles (firewall our own prompt).
  const recentMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-12)
  const timezone = typeof body?.timezone === "string" ? body.timezone : undefined

  const supabase = createServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) {
    return Response.json(
      { error: "Sign in first — use the magic-link form in the Cyber-Skill Matrix panel." },
      { status: 401 }
    )
  }

  const context = await gatherContext(supabase, userData.user.id)
  const system = [
    SYSTEM_PROMPT,
    `Today is ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: timezone })}.`,
    "Live database snapshot:",
    context,
  ].join("\n\n")

  try {
    const client = createOpenAI({ apiKey, baseURL: baseURL as string | undefined })
    const result = await streamText({
      model: client(modelId),
      system,
      messages: recentMessages as unknown as CoreMessage[],
      // Transient provider overload (503) is retried with backoff by the SDK.
      maxRetries: 4,
    })
    return result.toDataStreamResponse()
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Coach streaming failed" },
      { status: 500 }
    )
  }
}

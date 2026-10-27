# Handoff: Linear Accountability Dashboard

## 1. Project Overview & Philosophy
A high-performance personal accountability dashboard built with a **Linear-style** aesthetic:
- **Design Language:** Dark-mode default, 1px solid #333 borders, monospaced numbers for metrics, high-contrast typography, and minimal spacing.
- **Port Requirement:** Must run on **port 3005** (default port occupied).
- **Architecture:** Next.js (App Router), Tailwind CSS, Framer Motion, Supabase (Auth/DB/RLS), Vercel AI SDK.

## 2. Technical Progress
- [x] **Foundation:** Next.js 14 project initialized with TypeScript.
- [x] **Design System:** `globals.css` configured with Linear color palette and custom utility classes (`linear-card`, `font-mono-tabular`).
- [x] **Layout:** Bento-grid shell implemented in `src/app/page.tsx`.
- [x] **Configuration:** `tailwind.config.js`, `postcss.config.js`, and `tsconfig.json` stabilized after encoding issues.
- [x] **Database Client:** Supabase SSR client initialized in `src/lib/supabase/client.ts`.
- [x] **Utilities:** Date formatting, countdown logic, and weight formatting helpers in `src/lib/utils.ts`.
- [x] **Phases 1–2 verified:** shell boots on port 3005 (`GET /` → 200); Project Purgatory live (WIP limit, countdown, dialog, complete loop).
- [x] **Health Module (Phase 3):** `FitnessPanel` + Recharts `WeightChart` / `ConsistencyChart` + `HealthLogForm` (weight upsert on `unique(user_id,date)`, anti-jump guard, future-date guard).
- [x] **Skill Matrix (Phase 4):** `SkillMatrix` + `DomainProgressBar`; auto-seed (`auth.users` trigger + `seed_my_skill_domains` RPC); completions bump linked domain +5 (capped) via `bump_skill_progress` trigger; tasks link to a domain at creation in `ProjectDialog`; "Mark done" in Purgatory completes the loop.
- [x] **Auth:** `useSupabaseUser` hook + `AuthPrompt` (magic-link sign-in); Purgatory and Fitness inserts now carry `user_id` and gate on a signed-in user (RLS is zero-trust).
- [x] **AI Coach (Phase 5):** `/api/chat` streams via `ai@3.4.33 streamText` (+ `@ai-sdk/openai@0.0.70` — versions aligned); injects live DB snapshot (WIP + deadlines, 7d workouts, 14d weight logs, skill progress) into the system prompt; `CoachPalette` slide-out opens via ⌘/Ctrl+K or the "open-coach" window event; `useChat` with timezone passed per request; graceful guards for missing key / signed-out users. `CoachCard` bento cell opens the palette.
- [x] **Data fixes:** deadline stored as local end-of-day UTC (`endOfDayIso`); delete flows for active project (cascade) and workouts (recent list).

## 3. Current File Structure
```text
/
├── src/
│   ├── app/
│   │   ├── globals.css      # Core design system
│   │   ├── layout.tsx       # Inter & JetBrains Mono fonts
│   │   └── page.tsx         # Bento Grid dashboard shell
│   ├── components/ui/       # Shadcn-lite primitives (Button, Card)
│   ├── lib/
│   │   ├── supabase/        # Browser/Server Supabase clients
│   │   └── utils.ts         # Formatting & logic helpers
├── SPEC.md                  # Full technical specification & DB schema
├── package.json             # Configured for port 3005
├── tailwind.config.js       # Linear design tokens
└── next-env.d.ts            # Critical for JSX resolution
```

## 4. Core Features to Implement (Ref: SPEC.md)
1. **Project Purgatory:** Kanban view with strict WIP limit (prevents adding new projects until active ones are finished).
2. **Fitness Engine:** Daily weight and workout logging with minimalist Recharts line charts.
3. **Cyber-Skill Matrix:** Progress bars mapping technical learning to implementation tasks.
4. **AI Coach:** Persistent slide-out command palette (`⌘K`) with database context for accountability.

## 5. Critical Maintenance Notes
- **Encoding Issues:** PowerShell file creation previously caused "Unexpected token" errors due to BOM/UTF-16 encoding. Always ensure files are saved as **UTF-8 without BOM**.
- **Port:** The `dev` script in `package.json` is set to `next dev -p 3005`. Do not use port 3000.
- **RLS:** All Supabase tables must have Row Level Security enabled, tied to `auth.uid()`.

## 6. Immediate Next Steps
1. Supabase is configured (`.env` filled + schema applied). Model routing is in: point `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` at any OpenAI-compatible vendor (presets commented in `.env.example`) — or keep official OpenAI as-is. Restart `npm run dev` after edits.
2. Possible bug: the coach model is hard-rotatable only via env; a per-chat model picker is a natural next UI addition.
3. Backlog: project/deadline editing UI, weight-log delete, Kanban drag-and-drop (Phase 2 stretch), Supabase realtime sync.
4. All SPEC.md phases (1–5) implemented. The WIP_ENFORCED loop: add project (linked domain) → countdown → "Mark done" (+10 XP, domain +5) → slot frees.
5. Later tweaks applied: `AI_MODEL=gemini-3.8-flash` (2.5 retired for new accounts to new users); MAX_WIP raised to 2; FitnessPanel refetches on window focus (data edited directly in the Supabase dashboard now syncs when the tab refocuses) + manual refresh button; CoachPalette shows a "working…" indicator until the first streamed token arrives.
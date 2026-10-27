# Linear-Dashboard: Product Specification

## 1. Introduction & Philosophy
The "Linear Dashboard" is an enterprise-grade, dark-mode-first web application designed to enforce strict personal accountability. It integrates productivity, physical health, and technical skill tracking into a single, state-machine-driven interface. 

**Design Language:**
*   **Aesthetic:** Strictly Linear-style. Dark mode default. High-contrast text (Text-primary: #FFFFFF, Text-secondary: #8B8B8B).
*   **Borders:** 1px solid #333333. No heavy shadows. Minimalist spacing.
*   **Typography:** Sans-serif (Inter/SF Pro). Monospace (Roboto Mono/Geist Mono) exclusively for metrics, weights, and time.
*   **Motion:** Framer Motion. Highly controlled transitions (150ms-250ms, ease-out).

## 2. Tech Stack
*   **Framework:** Next.js 14+ (App Router), React, TypeScript.
*   **Styling:** Tailwind CSS, Shadcn UI.
*   **State/Animation:** Framer Motion, React Context/Zustand.
*   **Charts:** Recharts.
*   **Backend/Database:** Supabase (PostgreSQL with Row Level Security configured to `auth.uid() = user_id`).
*   **AI:** Vercel AI SDK (OpenAI provider).
*   **Port Configuration:** `3005` (due to system constraints).

## 3. Database Schema (Supabase/PostgreSQL)

### Configuration
```sql
-- Ensure RLS is enabled on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE works_in_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_domains ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
-- ... (Create corresponding policies for all tables)
```

### SQL Schema

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'purgatory', -- 'purgatory', 'active', 'done'
    is_blocking BOOLEAN DEFAULT TRUE, -- If true, must be done to add new projects
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE works_in_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    points_awarded INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL, -- E.g., 'lifting', 'cardio', 'mobility'
    duration_minutes INT NOT NULL,
    calories_burned INT
);

CREATE TABLE weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg DECIMAL(5, 2) NOT NULL,
    unique(user_id, date)
);

CREATE TABLE skill_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    category TEXT NOT NULL, -- 'cyber', 'ai'
    name TEXT NOT NULL, -- E.g., 'Secure Architecture'
    current_progress INT DEFAULT 0, -- 0-100
    max_progress INT DEFAULT 100,
    linked_project_id UUID REFERENCES projects(id)
);
```

## 4. Component Tree & Architecture

*   `app/`
    *   `layout.tsx`: Global layout, Tailwind import, Shadcn Theme provider, Supabase session provider.
    *   `page.tsx`: Dashboard Home (Bento Grid layout of modules).
    *   `login/page.tsx`: Supabase Auth (if applicable).
*   `components/`
    *   `ui/`: Shadcn UI primitives (buttons, cards, inputs, etc.).
    *   `layout/`: 
        *   `Sidebar.tsx`
        *   `CommandPalette.tsx` / `AICoach.tsx` (Persistent slide-out command palette).
    *   `modules/`
        *   `purgaury/`
            *   `ProjectPurgatory.tsx`: Global module wrapper. Enforces WIP limits. Displays current blocking project.
            *   `CanvasWipTraker.tsx`: The active Kanban board. Holds drag-and-drop logic for moving tasks.
            *   `CountdownTimer.tsx`: Gamified deadline tracker.
            *   `ProjectDialog.tsx`: Form to add a new project.
        *   `fitness/`
            *   `FitnessPanel.tsx`: Wrapper for the module.
            *   `WeightChart.tsx`: Recharts integration for weight over time.
            *   `ConsistencyChart.tsx`: Visualization of workout frequency.
            *   `HealthLogForm.tsx`: Form to log weight and daily workouts.
        *   `skills/`
            *   `SkillMatrix.tsx`: Tracker for cybersecurity and AI upskilling.
            *   `DomainProgressBar.tsx`: Progress bars mapping theory to implementation tasks.
*   `lib/`
    *   `supabase/client.ts`: Supabase config.
    *   `supabase/middleware.ts`: Next middleware for session management.
    *   `utils.ts`: Formatters, date utilities (using `date-fns` or similar).
    *   `ai/`
        *   `coach-schema.ts`: Zod schemas for Vercel AI SDK structured output (if needed).

## 5. Step-by-Step Implementation Plan

### Phase 1: Foundation (Execution Step - Pending Approval)
1.  Initialize `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`. Set dev port to `3005`.
2.  Setup Supabase config and initialize the `lib/supabase` files.
3.  Install Shadcn UI and base primitives.
4.  Build the Dashboard Home `layout.tsx` using the specified 1px `#33333` borders and dark-mode colors.
5.  Create the Bento-grid main layout that will host the modules.

### Phase 2: The Purgatory Engine (Productivity)
1.  Build `ProjectPurgatory` state management (Redis or local state + Supabase websockets for sync).
2.  Implement the strict WIP limit: The UI must actively refuse `ProjectDialog` creation if `active_projects > max_wip` (configurable, defaults to 1).
3.  Build `CountdownTimer` tied to the `deadline` field of the active task in `works_in_progress`.
4.  Implementation rewards: When a project moves to 'done', award XP/Coffee credits (stored in a user profile or just gamified locally).

### Phase 3: Fitness & Weight Continuity
1.  Build `HealthLogForm` (validate weight doesn't drop absurdly based on previous logs).
2.  Integrate `Recharts` to render `WeightChart` (smooth lines, minimal dots).
3.  Create time-series aggregation query for `ConsistencyChart`.

### Phase 4: The Cyber-Skill Matrix
1.  Create default `skill_domains` upon user registration (Seed data).
2.  Build UI pattern allowing tasks in `works_in_progress` to be linked to a specific `skill_domain`.
3.  Implement calculation logic: When a linked task is completed, automatically update `current_progress` in `skill_domains`.

### Phase 5: AI Command Palette & Coach
1.  Implement Keyboard Shortcuts (`cmd+K` or `ctrl+K`) for a custom Command Palette using `cmdk` or similar.
2.  Set up Vercel AI SDK `useChat` hook.
3.  Fetch context from the DB: active WIP task, nearest deadlines, and recent weight logarithmic (past 7 days trends).
4.  Inject this context into the prompt for the AI model to act as an accountabilty partner / technical sounding board.

## 6. Environment Variables
*.env*
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key
DATABASE_URL=for_supabase_admin_scripts
```
```
"use client"

import { useCallback, useEffect, useState } from "react"
import { KanbanSquare, AlertCircle, CheckCircle, Clock, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getBrowserClient } from "@/lib/supabase/client"
import { calculateDaysRemaining, endOfDayIso } from "@/lib/utils"
import { CountdownTimer } from "./CountdownTimer"
import { ProjectDialog } from "./ProjectDialog"

// WIP limit: at most TWO active (non-done) projects at a time.
const MAX_WIP = 2

interface Project {
  id: string
  user_id: string
  title: string
  description: string | null
  status: string
  is_blocking: boolean
  created_at: string
  updated_at: string
}

interface WipTask {
  id: string
  project_id: string
  user_id: string
  title: string
  deadline: string
  status: string
}

interface SkillDomainLite {
  id: string
  name: string
  category: string
}

export function ProjectPurgatory() {
  const [projects, setProjects] = useState<Project[]>([])
  const [wipTasks, setWipTasks] = useState<WipTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [domains, setDomains] = useState<SkillDomainLite[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const isConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const fetchData = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    const supabase = getBrowserClient()
    setLoading(true)
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
      if (projectsError) throw projectsError
      setProjects(projectsData || [])

      const { data: wipData, error: wipError } = await supabase
        .from("works_in_progress")
        .select("*")
        .order("created_at", { ascending: false })
      if (wipError) throw wipError
      setWipTasks(wipData || [])

      const { data: domData, error: domError } = await supabase
        .from("skill_domains")
        .select("id, name, category")
      if (domError) throw domError
      setDomains(domData || [])

      setError(null)
    } catch (err: any) {
      setError(err?.message || "Failed to load projects")
    } finally {
      setLoading(false)
    }
  }, [isConfigured])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const activeProjects = projects.filter((p) => p.status !== "done")
  const doneProjects = projects.filter((p) => p.status === "done")
  const wipLimitReached = activeProjects.length >= MAX_WIP

  const findActiveTask = (projectId: string) =>
    wipTasks.find((t) => t.project_id === projectId && t.status !== "completed")

  const handleAddProject = async (values: {
    title: string
    description: string
    deadline: string
    skillDomainId: string
  }) => {
    if (!isConfigured) {
      setError("Supabase is not configured. Copy .env.example to .env and set your credentials.")
      return
    }
    const supabase = getBrowserClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      setError("Sign in first — use the sign-in form in the Cyber-Skill Matrix panel.")
      return
    }
    try {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: userData.user.id,
          title: values.title,
          description: values.description || null,
          status: "active",
          is_blocking: true,
        })
        .select()
        .single()
      if (projectError) throw projectError

      // Attach the first WIP task (optionally linked to a skill domain)
      if (project && values.deadline) {
        const { error: taskError } = await supabase.from("works_in_progress").insert({
          user_id: userData.user.id,
          project_id: project.id,
          title: values.title,
          deadline: endOfDayIso(values.deadline),
          status: "in_progress",
          skill_domain_id: values.skillDomainId || null,
        })
        if (taskError) throw taskError
      }

      await fetchData()
      setDialogOpen(false)
    } catch (err: any) {
      setError(err?.message || "Failed to create project")
    }
  }

  // Completing the active task frees a WIP slot and bumps
  // the linked skill domain (+5, capped) via the DB trigger.
  // Both writes happen inside one DB transaction (complete_my_project RPC)
  // so a failed second update can never wedge a project.
  const handleCompleteProject = async (projectId: string) => {
    if (!isConfigured) return
    const task = findActiveTask(projectId)
    if (!task) return
    const supabase = getBrowserClient()
    try {
      const { error: rpcError } = await supabase.rpc("complete_my_project", {
        p_project_id: projectId,
      })
      if (rpcError) throw rpcError
      setError(null)
    } catch (err: any) {
      setError(err?.message || "Failed to complete project")
    }
    await fetchData()
  }

  // Deleting the project cascades to its WIP tasks (ON DELETE CASCADE).
  const handleDeleteProject = async (projectId: string) => {
    if (!isConfigured) return
    const supabase = getBrowserClient()
    try {
      const { error: delError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
      if (delError) throw delError
      setError(null)
    } catch (err: any) {
      setError(err?.message || "Failed to delete project")
    }
    setConfirmDeleteId(null)
    await fetchData()
  }

  useEffect(() => {
    setConfirmDeleteId(null)
  }, [projects.map((p) => p.id).join(",")])

  if (!isConfigured) {
    return (
      <Card className="p-5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KanbanSquare className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="flex-1">Project Purgatory</CardTitle>
          </div>
          <span className="text-[11px] font-mono-tabular text-muted-foreground">{`WIP: 0/${MAX_WIP}`}</span>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="w-6 h-6 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              Supabase not configured
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              Copy <code className="font-mono-tabular">.env.example</code> to <code className="font-mono-tabular">.env</code>,
              set your Supabase URL and anon key, then restart the dev server.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="p-5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KanbanSquare className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="flex-1">Project Purgatory</CardTitle>
          </div>
          <span className="text-[11px] font-mono-tabular text-muted-foreground">{`WIP: 0/${MAX_WIP}`}</span>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-32 flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-mono-tabular">Loading…</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KanbanSquare className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="flex-1">Project Purgatory</CardTitle>
          </div>
          <span className="text-[11px] font-mono-tabular text-muted-foreground">{`WIP: 0/${MAX_WIP}`}</span>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="p-3 rounded-sm bg-muted/30 border border-border/50">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KanbanSquare className="w-4 h-4 text-muted-foreground" />
            <div>
              <CardTitle className="flex-1">Project Purgatory</CardTitle>
              <p className="text-[11px] text-muted-foreground font-mono-tabular">
                Finish existing projects before adding new ones
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono-tabular font-medium">
            WIP: {activeProjects.length}/{MAX_WIP}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        {wipLimitReached && (
          <div className="p-3 rounded-sm bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium">WIP limit reached</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Finish one of these {activeProjects.length} projects before adding a new one.
            </p>
          </div>
        )}

        {activeProjects.length > 0 ? (
          <div className="space-y-2">
            {activeProjects.map((project) => {
              const task = findActiveTask(project.id)
              return (
                <div
                  key={project.id}
                  className="rounded-sm border border-border/60 bg-muted/10 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{project.title}</span>
                      {task && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          task: {task.title}
                        </span>
                      )}
                    </div>
                    <CountdownTimer deadline={task?.deadline || project.created_at} />
                  </div>
                  {project.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50">
                    <span className="text-xs font-mono-tabular text-muted-foreground">
                      {calculateDaysRemaining(task?.deadline || project.created_at)}d left
                    </span>
                    <div className="flex items-center gap-2">
                      {confirmDeleteId === project.id ? (
                        <>
                          <Button
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-7 px-2.5 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleDeleteProject(project.id)}
                            className="h-7 px-2.5 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" /> Confirm
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => setConfirmDeleteId(project.id)}
                          className="h-7 px-2.5 text-xs"
                          title="Delete project and its tasks"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        onClick={() => handleCompleteProject(project.id)}
                        disabled={!task}
                        className="h-7 px-2.5 text-xs"
                        title="Completes the active task — frees a WIP slot"
                      >
                        <CheckCircle className="w-3 h-3" /> Mark done
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
            <div className="flex items-center justify-between px-3 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>{doneProjects.length} completed</span>
              <span>{activeProjects.length} active</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-6 h-6 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              No active projects
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs mb-4">
              Add your first purgatory project to begin enforcing your WIP limit.
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="h-8 flex items-center gap-2"
              disabled={wipLimitReached}
            >
              <Plus className="w-3 h-3" /> Add Project
            </Button>
          </div>
        )}

        {doneProjects.length > 0 && (
          <div className="rounded-sm border border-border/60 p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              History
            </div>
            <ul className="space-y-1.5">
              {doneProjects.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 shrink-0 text-muted-foreground/50" />
                  <span className="truncate">{p.title}</span>
                  <span className="ml-auto shrink-0 font-mono-tabular text-[10px] text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeProjects.length > 0 && activeProjects.length < MAX_WIP && (
          <div className="flex justify-end">
            <Button
              onClick={() => setDialogOpen(true)}
              className="h-7 px-2.5 text-xs"
            >
              <Plus className="w-3 h-3" /> Add Project
            </Button>
          </div>
        )}
      </CardContent>

      <ProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAddProject}
        domains={domains}
      />
    </Card>
  )
}

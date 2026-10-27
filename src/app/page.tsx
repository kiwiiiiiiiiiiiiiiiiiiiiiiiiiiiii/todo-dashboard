"use client"

import { motion } from "framer-motion"
import { Command } from "lucide-react"
import { ProjectPurgatory } from "@/components/modules/purgatory/ProjectPurgatory"
import { FitnessPanel } from "@/components/modules/fitness/FitnessPanel"
import { SkillMatrix } from "@/components/modules/skills/SkillMatrix"
import { CoachCard } from "@/components/modules/coach/CoachCard"
import { IdeaPanel } from "@/components/modules/ideas/IdeaPanel"
import { CoachPalette } from "@/components/modules/coach/CoachPalette"

export default function Dashboard() {
  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-sm bg-white flex items-center justify-center">
            <div className="w-4 h-4 rounded-sm bg-black" />
          </div>
          <div>
            <h1 className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">Linear Dashboard</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-coach"))}
            className="px-3 py-1.5 text-xs font-medium rounded-sm border border-border hover:bg-muted transition-colors"
          >
            Command
          </button>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono-tabular">
            U1
          </div>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-3 max-w-[1440px] mx-auto">
        {/* Project Purgatory - Large */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="col-span-12 lg:col-span-8"
        >
          <ProjectPurgatory />
        </motion.div>

        {/* Idea Inbox - directly under/after Project Purgatory */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="col-span-12 lg:col-span-4"
        >
          <IdeaPanel />
        </motion.div>

        {/* Fitness & Weight - Medium */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="col-span-12 lg:col-span-4"
        >
          <FitnessPanel />
        </motion.div>

        {/* Cyber Skill Matrix - Large */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="col-span-12 lg:col-span-4"
        >
          <SkillMatrix />
        </motion.div>

        {/* AI Coach - Medium */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="col-span-12 lg:col-span-4"
        >
          <CoachCard />
        </motion.div>
      </div>

      <CoachPalette />
    </div>
  )
}
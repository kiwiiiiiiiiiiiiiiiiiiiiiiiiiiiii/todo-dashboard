"use client"

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useChat } from "ai/react"
import { X, SendHorizontal, CircleStop } from "lucide-react"
import { Button } from "@/components/ui/button"

// Slide-out AI coach. Opens with ⌘K / Ctrl+K or a window event named "open-coach".
export function CoachPalette() {
  const [open, setOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, append, stop } =
    useChat({
      api: "/api/chat",
      body: {
        timezone:
          typeof window !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : undefined,
      },
    })

  const close = useCallback(() => setOpen(false), [])

  // Global keyboard + event listeners
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === "Escape") setOpen(false)
    }
    const onOpenEvent = () => setOpen(true)
    window.addEventListener("keydown", onKey)
    window.addEventListener("open-coach", onOpenEvent)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("open-coach", onOpenEvent)
    }
  }, [])

  // Auto-scroll while streaming
  useEffect(() => {
    if (scrollRef.current && open) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading, open])

  const submitOnEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) handleSubmit(e as any)
    }
  }

  const suggestions = [
    "Scope my plan for today",
    "Audit my deadline pressure",
    "Read my weight trend",
  ]

  // "Working" phase = loading but no tokens have arrived yet. Between hitting
  // send and the assistant's first streamed character the palette used to look
  // completely frozen — this makes that window visible.
  const lastMessage = messages[messages.length - 1]
  const thinking =
    isLoading &&
    (!lastMessage || (lastMessage.role === "assistant" && lastMessage.content.length === 0))

  const ThinkingDots = (
    <span className="inline-flex items-center gap-1">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce [animation-duration:1s]"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[55] bg-black/60"
            onClick={close}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed right-0 top-0 z-[60] flex h-full w-full flex-col bg-card border-l border-border sm:w-[400px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                  }`}
                />
                <span className="text-[13px] font-medium uppercase tracking-wide">Coach</span>
                {thinking && (
                  <span className="px-1.5 py-0.5 rounded-sm border border-border bg-muted/50 text-[10px] font-mono-tabular text-muted-foreground">
                    working…
                  </span>
                )}
                <kbd className="ml-2 rounded-sm border border-border px-1.5 py-0.5 text-[10px] font-mono-tabular text-muted-foreground">
                  ⌘K
                </kbd>
              </div>
              <button
                onClick={close}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close coach"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 && !error ? (
                <div className="flex h-full flex-col justify-center gap-2 py-8">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                    Your data, live — ask about
                  </p>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => append({ role: "user", content: s })}
                      className="w-full border border-border rounded-sm px-2.5 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m, i) => (
                    <div key={m.id ?? i}>
                      <div className="mb-1 text-[10px] uppercase tracking-widest font-mono-tabular text-muted-foreground">
                        {m.role === "user" ? "You" : "Coach"}
                      </div>
                      <div
                        className={`whitespace-pre-wrap text-xs leading-relaxed ${
                          m.role === "user" ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {m.content}
                        {isLoading &&
                          m.role === "assistant" &&
                          i === messages.length - 1 && (
                            <span className="ml-0.5 animate-pulse text-muted-foreground">▌</span>
                          )}
                      </div>
                    </div>
                  ))}
                  {thinking && (
                    <div className="flex items-center gap-2 rounded-sm border border-border/50 bg-muted/20 px-2.5 py-2">
                      {ThinkingDots}
                      <span className="text-[11px] text-muted-foreground font-mono-tabular">
                        Coach is reading your live data…
                      </span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-sm border border-border bg-muted/30 p-2.5">
                  <p className="text-[11px] text-destructive">{error.message}</p>
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 border-t border-border p-3"
            >
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={submitOnEnter}
                rows={1}
                placeholder="Ask your coach…"
                className="max-h-24 flex-1 resize-none rounded-sm border border-border bg-background px-2.5 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {isLoading ? (
                <Button
                  type="button"
                  onClick={() => stop()}
                  className="h-8 px-2.5 text-xs"
                  title="Stop generating"
                >
                  <CircleStop className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button type="submit" disabled={!input.trim()} className="h-8 px-2.5 text-xs">
                  <SendHorizontal className="w-3.5 h-3.5" />
                </Button>
              )}
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

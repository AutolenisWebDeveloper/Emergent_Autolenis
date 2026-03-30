"use client"

/**
 * Lenis Concierge -- Elite Fortune 500-grade chat widget.
 *
 * Features:
 *   - Local FAQ/intent-based response engine (no external AI APIs)
 *   - Persistent conversation history
 *   - Context-aware quick prompt suggestions
 *   - Quick reply chips for suggested follow-up topics
 *   - Route-aware response prioritization
 *   - Premium fintech design with polished animations
 *   - Conversation management (clear history)
 *   - Auto-scroll optimization
 *   - Mobile-responsive with accessibility
 */

import { useState, useRef, useEffect, useCallback, type FormEvent, type KeyboardEvent } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { getQuickPrompts, MORE_DETAILS_PROMPT, formatPromptMessage, type QuickPromptState } from "@/lib/lenis/quickPrompts"
import type { AIRole } from "@/lib/ai/context-builder"
import { processMessage, type SuggestedChip } from "@/lib/chatbot/faq"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string
  sender: "user" | "assistant"
  content: string
  timestamp: number
  error?: boolean
  response?: CopilotResponse
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/* ------------------------------------------------------------------ */
/*  Variant metadata                                                   */
/* ------------------------------------------------------------------ */

const VARIANT_LABELS: Record<CopilotVariant, string> = {
  public: "AutoLenis Copilot",
  buyer: "Buyer Assistant",
  dealer: "Dealer Assistant",
  affiliate: "Affiliate Assistant",
  admin: "Admin Assistant",
}

const VARIANT_WELCOME: Record<CopilotVariant, string> = {
  public:
    "Welcome to AutoLenis! I can help you understand how our platform works, pricing, prequalification, and more. What would you like to know?",
  buyer:
    "Welcome back! I'm your buyer assistant. I can help you check your deal status, pay fees, review your contract, or navigate next steps.",
  dealer:
    "Welcome! I'm your dealer assistant. I can help you view active auctions, manage your inventory, submit offers, and review fix lists.",
  affiliate:
    "Welcome! I'm your affiliate assistant. I can help with commission details, referral links, your team, and payout history.",
  admin:
    "Welcome to the Admin Assistant. I can help you look up deals, buyers, reports, and platform health.",
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ChatWidgetProps {
  variant?: CopilotVariant
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ChatWidget({ variant = "public" }: ChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestedTopics, setSuggestedTopics] = useState<readonly SuggestedChip[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pathname = usePathname()
  const { clearSession } = useCopilotSession()

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || loading) return

      const userMsgId = generateId()
      const assistantMsgId = generateId()

      if (text.trim()) {
        setMessages((prev) => [
          ...prev,
          { id: userMsgId, sender: "user", content: text, timestamp: Date.now() },
        ])
      }
      setInput("")
      setLoading(true)

      // Process locally (deterministic — no network call)
      const result = processMessage(text.trim(), pathname)

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        sender: "assistant",
        content: result.reply,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMsg])
      setSuggestedTopics(result.suggestedTopics)
      setLoading(false)
    },
    [loading, pathname],
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void sendMessage(input)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  const handleClearHistory = () => {
    if (confirm("Clear conversation? This cannot be undone.")) {
      setMessages([])
      setSuggestedTopics([])
      setConversationId(generateConversationId())
      clearConversationHistory()
    }
  }

  const handleCopyMessage = (content: string) => {
    void navigator.clipboard?.writeText(content)
  }

  const label = VARIANT_LABELS[variant]

  return (
    <>
      {/* ------- Toggle FAB ------- */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : `Open ${label}`}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-[0_4px_24px_rgba(0,0,0,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)" }}
        whileHover={{ scale: 1.08, boxShadow: "0 6px 32px rgba(0,0,0,0.24)" }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.svg
              key="close"
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.svg
              key="chat"
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16h6M21 12c0 4.97-4.03 9-9 9a8.96 8.96 0 01-4.58-1.25L3 21l1.25-4.42A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ------- Chat Panel ------- */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 flex h-[36rem] w-[24rem] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[0_12px_48px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)]"
          >
            {/* ---- Header ---- */}
            <div
              className="flex items-center gap-3 px-5 py-4 border-b border-white/10"
              style={{ background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)" }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-semibold text-white leading-tight">{label}</span>
                <span className="text-[11px] text-white/70 leading-tight">AutoLenis</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                  <span className="text-[11px] text-white/60 font-medium">Live</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Clear history"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ---- Messages ---- */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-surface-elevated/30">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex flex-col gap-4"
                >
                  <div className="rounded-xl bg-background border border-border p-5 flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{label}</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {VARIANT_WELCOME[variant]}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Message bubbles */}
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"} group`}
                >
                  {m.sender !== "user" && (
                    <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-border" style={{ background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 max-w-[80%]">
                    <div
                      className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                        m.sender === "user"
                          ? "text-primary-foreground rounded-br-md shadow-sm"
                          : m.error
                            ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-md"
                            : "bg-background border border-border text-foreground rounded-bl-md shadow-sm"
                      }`}
                      style={m.sender === "user" ? { background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)" } : undefined}
                    >
                      {m.content}
                    </div>

                    {/* Quick action chips */}
                    {m.response?.renderState === "quick_actions" &&
                      m.response.quickActions &&
                      m.response.quickActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {m.response.quickActions.map((chip) => (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() => handleChipClick(chip)}
                              disabled={loading}
                              className="rounded-full border border-brand-purple/20 bg-brand-purple/[0.06] px-3 py-1.5 text-[11px] font-medium text-brand-purple hover:bg-brand-purple/[0.12] hover:border-brand-purple/30 disabled:opacity-40 transition-all"
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      )}

                    {/* Action result card */}
                    {m.response?.renderState === "action_result" &&
                      m.response.actionResult &&
                      variant !== "public" && (
                        <ActionResultCard result={m.response.actionResult} />
                      )}

                    {/* Copy button */}
                    {m.sender === "assistant" && m.content && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(m.content)}
                          className="flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-border" style={{ background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-background border border-border px-4 py-3 shadow-sm">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ---- Quick reply chips & "More details" strip ---- */}
            {lastMessageIsAssistant && (
              <div className="border-t border-border px-3 py-2 bg-background space-y-2">
                {suggestedTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedTopics.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => sendMessage(chip.query)}
                        disabled={loading}
                        className="rounded-lg border border-brand-purple/15 bg-brand-purple/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-brand-purple hover:bg-brand-purple/[0.1] hover:border-brand-purple/25 disabled:opacity-40 transition-all duration-150"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => sendMessage(MORE_DETAILS_PROMPT)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground hover:border-brand-purple/20 disabled:opacity-40 transition-all duration-150"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  More details
                </button>
              </div>
            )}

            {/* ---- Input ---- */}
            <form onSubmit={handleSubmit} className="border-t border-border px-3 py-3 bg-background">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  disabled={loading || !!pendingConfirmation}
                  className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple transition-all duration-150 disabled:opacity-50"
                  style={{ maxHeight: "120px" }}
                />
                <motion.button
                  type="submit"
                  disabled={loading || !input.trim() || !!pendingConfirmation}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground disabled:opacity-40 transition-all shadow-sm hover:shadow-md"
                  style={{ background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </motion.button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-muted-foreground/50">
                  Powered by AutoLenis
                </p>
                {messages.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/50">
                    {messages.length} {messages.length === 1 ? "message" : "messages"}
                  </p>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Action Result Card                                                 */
/* ------------------------------------------------------------------ */

function ActionResultCard({ result }: { result: ActionResult }) {
  return (
    <div className="mt-1 rounded-xl border border-brand-purple/15 bg-brand-purple/[0.04] px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-[12px] text-foreground leading-snug flex-1">{result.summary}</p>
      {result.redirectTo && (
        <a
          href={result.redirectTo}
          className="shrink-0 rounded-lg bg-brand-purple px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-purple/90 transition-colors"
        >
          {result.redirectLabel ?? "Go there →"}
        </a>
      )}
    </div>
  )
}

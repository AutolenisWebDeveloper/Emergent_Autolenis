"use client"

/**
 * ConciergeDock — desktop docked concierge panel.
 *
 * Premium fintech-grade chat panel that anchors to the bottom-right
 * of the viewport. Integrates:
 *   - ChatHeader with role + workspace badges
 *   - StatusStrip showing buyer lifecycle progress
 *   - ActionCards for next-best-step CTAs
 *   - Full chat interface with streaming support
 *   - Empty / Loading / Error states
 *
 * Design: consistent with AutoLenis system — Shadcn/ui foundations,
 * brand-purple accents, professional typography, WCAG 2.2 AA.
 */

import { useState, useRef, useEffect, useCallback, type FormEvent, type KeyboardEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getQuickPrompts, MORE_DETAILS_PROMPT, formatPromptMessage, type QuickPromptState } from "@/lib/lenis/quickPrompts"
import type { AIRole } from "@/lib/ai/context-builder"
import type { NextStepResult } from "@/lib/ai/next-step-resolver"
import { extractApiError } from "@/lib/utils/error-message"

import { ChatHeader } from "./ChatHeader"
import { StatusStrip } from "./StatusStrip"
import { ActionCard } from "./ActionCard"
import { EmptyState, LoadingState, ErrorState } from "./States"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  sender: "user" | "assistant" | "system"
  content: string
  timestamp: number
  isStreaming?: boolean
  error?: boolean
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function roleFromPath(pathname: string): AIRole {
  if (pathname.startsWith("/admin")) return "admin"
  if (pathname.startsWith("/affiliate")) return "affiliate"
  if (pathname.startsWith("/dealer")) return "dealer"
  if (pathname.startsWith("/buyer")) return "buyer"
  return "public"
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lenis_chat_history"
const MAX_STORED_MESSAGES = 100

function loadConversationHistory(): { conversationId: string; messages: ChatMessage[] } {
  if (typeof window === "undefined") return { conversationId: generateConversationId(), messages: [] }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { conversationId: generateConversationId(), messages: [] }
    const parsed = JSON.parse(stored)
    return {
      conversationId: parsed.conversationId || generateConversationId(),
      messages: (parsed.messages || []).slice(-MAX_STORED_MESSAGES),
    }
  } catch {
    return { conversationId: generateConversationId(), messages: [] }
  }
}

function saveConversationHistory(conversationId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ conversationId, messages: messages.slice(-MAX_STORED_MESSAGES) }),
    )
  } catch {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ conversationId, messages: messages.slice(-20) }),
      )
    } catch {
      // Quota exceeded — give up
    }
  }
}

function clearConversationHistory() {
  if (typeof window === "undefined") return
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConciergeDockProps {
  promptState?: QuickPromptState
  nextStep?: NextStepResult | null
  workspaceMode?: "LIVE" | "TEST"
  contextLoading?: boolean
  contextError?: string | null
  onRetryContext?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConciergeDock({
  promptState,
  nextStep = null,
  workspaceMode = "LIVE",
  contextLoading = false,
  contextError = null,
  onRetryContext,
}: ConciergeDockProps) {
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState(generateConversationId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  const pathname = typeof window !== "undefined" ? window.location.pathname : "/"
  const role = roleFromPath(pathname)
  const quickPrompts = getQuickPrompts({ role, pathname, state: promptState })

  const lastMessageIsAssistant =
    messages.length > 0 && messages[messages.length - 1].sender === "assistant" && !loading

  // Load history
  useEffect(() => {
    if (!hasInitialized) {
      const h = loadConversationHistory()
      setConversationId(h.conversationId)
      setMessages(h.messages)
      setHasInitialized(true)
    }
  }, [hasInitialized])

  // Persist
  useEffect(() => {
    if (hasInitialized && messages.length > 0) {
      saveConversationHistory(conversationId, messages)
    }
  }, [messages, conversationId, hasInitialized])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const sendMessage = useCallback(
    async (text: string, isRetry = false) => {
      if (!text.trim() || loading) return

      const userMsgId = generateId()
      const assistantMsgId = generateId()

      const userMsg: ChatMessage = {
        id: userMsgId,
        sender: "user",
        content: text,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setLoading(true)

      const streamingMsg: ChatMessage = {
        id: assistantMsgId,
        sender: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      }
      setMessages((prev) => [...prev, streamingMsg])

      try {
        const traceId = `ct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-trace-id": traceId },
          body: JSON.stringify({ conversationId, message: text, stream: true, clientTraceId: traceId }),
        })

        if (!res.ok) {
          // Parse structured error envelope from gateway
          let userMessage = `Request failed (${res.status}).`
          try {
            const errBody = await res.json()
            if (errBody?.error?.userMessage) {
              userMessage = errBody.error.userMessage
            }
          } catch { /* non-JSON response */ }
          throw new Error(userMessage)
        }

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        if (!reader) throw new Error("No response body")

        let accumulatedContent = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === "chunk") {
                  accumulatedContent += data.content
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: accumulatedContent, isStreaming: true } : m,
                    ),
                  )
                } else if (data.type === "done") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, isStreaming: false } : m,
                    ),
                  )
                } else if (data.type === "error") {
                  const errMsg = data.error?.userMessage ?? extractApiError(data.error, "Stream error")
                  const classified = new Error(errMsg)
                  classified.name = "AiStreamError"
                  throw classified
                }
              } catch (parseErr) {
                if (parseErr instanceof Error && parseErr.name === "AiStreamError") throw parseErr
              }
            }
          }
        }

        setRetryCount(0)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again."
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: errorMessage, isStreaming: false, error: true }
              : m,
          ),
        )

        if (!isRetry && retryCount < 2) {
          setRetryCount((c) => c + 1)
          setTimeout(() => {
            setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId))
            sendMessage(text, true)
          }, 2000)
        }
      } finally {
        setLoading(false)
      }
    },
    [conversationId, loading, retryCount],
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleClearHistory = () => {
    if (typeof window !== "undefined" && window.confirm("Clear all conversation history? This cannot be undone.")) {
      setMessages([])
      setConversationId(generateConversationId())
      clearConversationHistory()
    }
  }

  const handleCopyMessage = (content: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(content)
    }
  }

  return (
    <>
      {/* Toggle FAB */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close concierge" : "Open concierge"}
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

      {/* Docked Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 flex h-[40rem] w-[26rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[0_12px_48px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)]"
            role="dialog"
            aria-label="Lenis Concierge"
          >
            {/* Header */}
            <ChatHeader
              role={role}
              workspaceMode={workspaceMode}
              onClearHistory={handleClearHistory}
            />

            {/* Status Strip (buyer only) */}
            {nextStep && nextStep.statusStripSteps.length > 0 && (
              <StatusStrip steps={nextStep.statusStripSteps} />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-surface-elevated/30">
              {contextLoading && <LoadingState />}

              {contextError && (
                <ErrorState message={contextError} onRetry={onRetryContext} />
              )}

              {!contextLoading && !contextError && messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex flex-col gap-3"
                >
                  <EmptyState role={role} />

                  {/* Action Cards from resolver */}
                  {nextStep && nextStep.actionCards.length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      {nextStep.actionCards.map((card) => (
                        <ActionCard
                          key={`${card.type}-${card.label}`}
                          type={card.type}
                          label={card.label}
                          description={card.description}
                          href={card.href}
                        />
                      ))}
                    </div>
                  )}

                  {/* Quick prompts */}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {quickPrompts.map((qp, i) => (
                      <motion.button
                        key={qp.label}
                        type="button"
                        onClick={() => sendMessage(formatPromptMessage(qp))}
                        disabled={loading}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: 0.2 + i * 0.05 }}
                        className="rounded-xl border border-brand-purple/15 bg-brand-purple/[0.05] px-3 py-2 text-[12px] font-medium text-brand-purple hover:bg-brand-purple/[0.1] hover:border-brand-purple/25 disabled:opacity-40 transition-all duration-200 hover:shadow-sm"
                      >
                        {qp.emoji} {qp.label}
                      </motion.button>
                    ))}
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
                    <div
                      className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-border"
                      style={{ background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[80%]">
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
                      {m.isStreaming && !m.content && (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                        </span>
                      )}
                    </div>

                    {m.sender === "assistant" && !m.isStreaming && m.content && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(m.content)}
                          className="flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          aria-label="Copy message"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* "More details" strip */}
            {lastMessageIsAssistant && (
              <div className="border-t border-border px-3 py-2 bg-background">
                <button
                  type="button"
                  onClick={() => sendMessage(MORE_DETAILS_PROMPT)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground hover:border-brand-purple/20 disabled:opacity-40 transition-all duration-150"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  More details
                </button>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-border px-3 py-3 bg-background">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  disabled={loading}
                  className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple transition-all duration-150 disabled:opacity-50"
                  style={{ maxHeight: "120px" }}
                  aria-label="Chat message"
                />
                <motion.button
                  type="submit"
                  disabled={loading || !input.trim()}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground disabled:opacity-40 transition-all shadow-sm hover:shadow-md"
                  style={{ background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)" }}
                  aria-label="Send message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </motion.button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-muted-foreground/50">Powered by AutoLenis AI</p>
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

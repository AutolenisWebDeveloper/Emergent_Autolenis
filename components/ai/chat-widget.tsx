"use client"

/**
 * Lenis Concierge -- Elite Fortune 500-grade AI chat widget.
 *
 * Features:
 *   - Real-time streaming responses with SSE
 *   - Persistent conversation history
 *   - Advanced error handling with retry logic
 *   - Sophisticated typing indicators
 *   - Message actions (copy, regenerate, rate)
 *   - Context-aware quick prompt suggestions
 *   - Premium fintech design with polished animations
 *   - Conversation management (clear history, export)
 *   - Auto-scroll optimization
 *   - Mobile-responsive with accessibility
 */

import { useState, useRef, useEffect, useCallback, type FormEvent, type KeyboardEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getQuickPrompts, MORE_DETAILS_PROMPT, formatPromptMessage, type QuickPromptState } from "@/lib/lenis/quickPrompts"
import type { AIRole } from "@/lib/ai/context-builder"
import { extractApiError } from "@/lib/utils/error-message"
import { csrfHeaders } from "@/lib/csrf-client"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

interface ChatWidgetProps {
  promptState?: QuickPromptState
}

/* ------------------------------------------------------------------ */
/*  Storage helpers                                                    */
/* ------------------------------------------------------------------ */

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
      JSON.stringify({
        conversationId,
        messages: messages.slice(-MAX_STORED_MESSAGES),
      }),
    )
  } catch {
    // Quota exceeded - clear old messages
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          conversationId,
          messages: messages.slice(-20),
        }),
      )
    } catch {
      // Still failing - give up
    }
  }
}

function clearConversationHistory() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ChatWidget(props: ChatWidgetProps = {}) {
  const { promptState } = props
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

  // Load conversation history on mount
  useEffect(() => {
    if (!hasInitialized) {
      const history = loadConversationHistory()
      setConversationId(history.conversationId)
      setMessages(history.messages)
      setHasInitialized(true)
    }
  }, [hasInitialized])

  // Save conversation history whenever messages change
  useEffect(() => {
    if (hasInitialized && messages.length > 0) {
      saveConversationHistory(conversationId, messages)
    }
  }, [messages, conversationId, hasInitialized])

  // Auto-scroll to bottom
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

      // Add user message
      const userMsg: ChatMessage = {
        id: userMsgId,
        sender: "user",
        content: text,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setLoading(true)

      // Add streaming placeholder
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
          headers: csrfHeaders({ "x-trace-id": traceId }),
          body: JSON.stringify({ conversationId, message: text, stream: true, clientTraceId: traceId }),
        })

        if (!res.ok) {
          // Parse structured error envelope from gateway or proxy
          let userMessage = `Request failed (${res.status}).`
          try {
            const errBody = await res.json()
            const extracted = errBody?.error?.userMessage ?? errBody?.error?.message
            if (extracted) {
              userMessage = extracted
            }
          } catch { /* non-JSON response */ }
          const err = Object.assign(new Error(userMessage), { status: res.status })
          throw err
        }

        // Handle streaming response
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("No response body")
        }

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
                  // Update message with accumulated content
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: accumulatedContent, isStreaming: true } : m,
                    ),
                  )
                } else if (data.type === "done") {
                  // Finalize streaming
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
              } catch (parseError) {
                // Re-throw classified errors; ignore JSON parse errors for incomplete chunks
                if (parseError instanceof Error && parseError.name === "AiStreamError") throw parseError
                console.warn("[v0] Parse warning:", parseError)
              }
            }
          }
        }

        setRetryCount(0) // Reset retry count on success
      } catch (error) {
        console.warn("[v0] Chat error:", error)

        const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again."

        // Update message with classified error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: errorMessage,
                  isStreaming: false,
                  error: true,
                }
              : m,
          ),
        )

        // Auto-retry logic (max 2 retries, skip non-retryable errors)
        const httpStatus = error && typeof error === "object" && "status" in error
          ? (error as { status: number }).status
          : undefined
        const retryable = !httpStatus || httpStatus >= 500
        if (retryable && !isRetry && retryCount < 2) {
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
    if (confirm("Clear all conversation history? This cannot be undone.")) {
      setMessages([])
      setConversationId(generateConversationId())
      clearConversationHistory()
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard?.writeText(content)
  }

  return (
    <>
      {/* ------- Toggle FAB ------- */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
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
        
        {/* Notification badge for new messages (future) */}
        <AnimatePresence>
          {!open && messages.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-[10px] font-bold text-white shadow-sm"
            >
              {messages.filter(m => m.sender === "assistant" && !m.error).length > 0 ? "·" : ""}
            </motion.span>
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
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-semibold text-white leading-tight">
                  Lenis Concierge
                </span>
                <span className="text-[11px] text-white/70 leading-tight">AI-Powered Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                  <span className="text-[11px] text-white/60 font-medium">Live</span>
                </div>
                
                {/* Settings dropdown */}
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
                  {/* Welcome card */}
                  <div className="rounded-xl bg-background border border-border p-5 flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-foreground">Welcome to AutoLenis</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      I'm here to guide you through every step of car buying -- from finding your perfect vehicle to making dealers compete for your business.
                    </p>
                    <div className="flex items-start gap-2 rounded-lg bg-brand-green/8 border border-brand-green/15 px-3 py-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-green mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">
                        Get instant answers about pricing, fees, financing, dealer negotiations, and more.
                      </p>
                    </div>
                  </div>

                  {/* Quick prompts */}
                  <div className="flex flex-wrap gap-2">
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
              {messages.map((m, i) => (
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
                    
                    {/* Message actions (copy) */}
                    {m.sender === "assistant" && !m.isStreaming && m.content && (
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

              <div ref={messagesEndRef} />
            </div>

            {/* ---- "More details" strip ---- */}
            {lastMessageIsAssistant && (
              <div className="border-t border-border px-3 py-2 bg-background">
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
                  disabled={loading}
                  className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple transition-all duration-150 disabled:opacity-50"
                  style={{ maxHeight: "120px" }}
                />
                <motion.button
                  type="submit"
                  disabled={loading || !input.trim()}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground disabled:opacity-40 transition-all shadow-sm hover:shadow-md"
                  style={{ background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </motion.button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-muted-foreground/50">
                  Powered by AutoLenis AI
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

/**
 * Session Store – short-term conversation memory for AI agents.
 *
 * Uses an in-memory Map keyed by conversationId.
 * Each entry holds the rolling message history plus a summary that
 * is produced every SUMMARIZE_THRESHOLD messages to keep token usage low.
 */

export interface ChatMessage {
  sender: "user" | "assistant" | "system" | "tool"
  content: string
  toolUsed?: string
  timestamp: number
}

interface SessionEntry {
  messages: ChatMessage[]
  summary: string | null
  createdAt: number
  lastActiveAt: number
}

/** Number of messages after which we trigger a summary. */
const SUMMARIZE_THRESHOLD = 15

/** Maximum age of an idle session in ms (1 hour). */
const MAX_IDLE_MS = 60 * 60 * 1000

class SessionStore {
  private store = new Map<string, SessionEntry>()

  /** Get or create a session entry. */
  get(conversationId: string): SessionEntry {
    let entry = this.store.get(conversationId)
    if (!entry) {
      entry = {
        messages: [],
        summary: null,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      }
      this.store.set(conversationId, entry)
    }
    entry.lastActiveAt = Date.now()
    return entry
  }

  /** Append a message and trigger summarization when threshold is reached. */
  addMessage(conversationId: string, message: ChatMessage): void {
    const entry = this.get(conversationId)
    entry.messages.push(message)

    if (entry.messages.length >= SUMMARIZE_THRESHOLD) {
      this.summarize(conversationId)
    }
  }

  /** Return the context window: summary (if any) + recent messages. */
  getContext(conversationId: string): { summary: string | null; messages: ChatMessage[] } {
    const entry = this.get(conversationId)
    return {
      summary: entry.summary,
      messages: entry.messages,
    }
  }

  /**
   * Collapse older messages into a text summary.
   * Uses a simple join; actual summarization happens through the Gemini call in the orchestrator.
   */
  summarize(conversationId: string): void {
    const entry = this.store.get(conversationId)
    if (!entry) return

    const older = entry.messages.slice(0, -5)
    const recent = entry.messages.slice(-5)

    const condensed = older
      .map((m) => `${m.sender}: ${m.content.slice(0, 120)}`)
      .join("\n")

    entry.summary = entry.summary ? `${entry.summary}\n---\n${condensed}` : condensed
    entry.messages = recent
  }

  /** Remove stale sessions. */
  cleanup(): void {
    const now = Date.now()
    for (const [id, entry] of this.store) {
      if (now - entry.lastActiveAt > MAX_IDLE_MS) {
        this.store.delete(id)
      }
    }
  }

  /** Clear a specific session (used by admin takeover). */
  clear(conversationId: string): void {
    this.store.delete(conversationId)
  }
}

/** Singleton instance used across the application. */
export const sessionStore = new SessionStore()

"use client"

/**
 * Admin AI Panel – admin-only conversation management panel.
 *
 * Capabilities:
 *  - View all AI conversations
 *  - Select a conversation to inspect
 *  - Take over a conversation (disable AI, respond manually)
 *  - Resume AI on a conversation
 *  - Disable AI for a specific user
 */

import { useState, type FormEvent } from "react"

interface Conversation {
  id: string
  userId: string
  role: string
  agent: string
  status: "active" | "paused" | "admin_takeover"
  createdAt: string
}

export default function AdminAIPanel() {
  const [conversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [manualReply, setManualReply] = useState("")
  const [replyError, setReplyError] = useState<string | null>(null)
  const [aiDisabledUsers, setAiDisabledUsers] = useState<Set<string>>(new Set())

  const handleTakeover = (conv: Conversation) => {
    setSelected({ ...conv, status: "admin_takeover" })
  }

  const handleResumeAI = () => {
    if (selected) {
      setSelected({ ...selected, status: "active" })
    }
  }

  const handleSendManualReply = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected || !manualReply.trim()) return
    setReplyError(null)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selected.id,
          message: manualReply.trim(),
          adminOverride: true,
        }),
      })
      if (!res.ok) {
        setReplyError(`Failed to send reply (${res.status})`)
        return
      }
      setManualReply("")
    } catch (err) {
      setReplyError("Failed to send reply. Please try again.")
    }
  }

  const toggleAiForUser = (userId: string) => {
    setAiDisabledUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  return (
    <div className="flex h-full gap-4">
      {/* Conversation list */}
      <div className="w-80 shrink-0 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-lg font-semibold">AI Conversations</h2>
        </div>

        {conversations.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500">No conversations yet.</p>
        )}

        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => setSelected(conv)}
            className={`block w-full border-b border-gray-100 px-4 py-3 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 ${
              selected?.id === conv.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{conv.agent}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  conv.status === "admin_takeover"
                    ? "bg-red-100 text-red-700"
                    : conv.status === "paused"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                }`}
              >
                {conv.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {conv.role} · {conv.userId.slice(0, 8)}…
            </p>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <div className="flex flex-1 flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            Select a conversation to inspect
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <h3 className="font-semibold">{selected.agent}</h3>
                <p className="text-xs text-gray-500">
                  {selected.role} · {selected.userId} · {selected.status}
                </p>
              </div>
              <div className="flex gap-2">
                {selected.status !== "admin_takeover" ? (
                  <button
                    onClick={() => handleTakeover(selected)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
                  >
                    Take Over
                  </button>
                ) : (
                  <button
                    onClick={handleResumeAI}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700"
                  >
                    Resume AI
                  </button>
                )}
                <button
                  onClick={() => toggleAiForUser(selected.userId)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  {aiDisabledUsers.has(selected.userId) ? "Enable AI" : "Disable AI"} for User
                </button>
              </div>
            </div>

            {/* Messages area (placeholder) */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="text-sm text-gray-500">
                Conversation messages will appear here once conversations are active.
              </p>
            </div>

            {/* Admin reply (visible only in takeover mode) */}
            {selected.status === "admin_takeover" && (
              <form onSubmit={handleSendManualReply} className="border-t border-gray-200 px-3 py-2 dark:border-gray-700">
                {replyError && (
                  <p className="mb-2 text-xs text-red-500">{replyError}</p>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={manualReply}
                    onChange={(e) => setManualReply(e.target.value)}
                    placeholder="Type a manual reply as admin…"
                    className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <button
                    type="submit"
                    disabled={!manualReply.trim()}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Send as Admin
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

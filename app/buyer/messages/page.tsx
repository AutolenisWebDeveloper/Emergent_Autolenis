"use client"

import { ProtectedRoute } from "@/components/layout/protected-route"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Search, Send, ShieldCheck, AlertTriangle } from "lucide-react"
import { Suspense, useState, useMemo, useCallback } from "react"
import useSWR from "swr"
import { csrfHeaders } from "@/lib/csrf-client"
import Loading from "./loading"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json())

function approvalBadge(type: string) {
  switch (type) {
    case "autolenis":
      return <Badge variant="default" className="bg-green-600">AutoLenis Prequalified</Badge>
    case "external":
      return <Badge variant="default" className="bg-blue-600">External Pre-Approval Uploaded</Badge>
    case "cash":
      return <Badge variant="secondary">Cash Buyer</Badge>
    default:
      return null
  }
}

export default function BuyerMessagesPage() {
  const { data, isLoading, mutate } = useSWR("/api/buyer/messages", fetcher)
  const [search, setSearch] = useState("")
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  const conversations: any[] = useMemo(() => {
    return data?.success ? data.data || [] : []
  }, [data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c: any) =>
        String(c.approvalType || "").toLowerCase().includes(q) ||
        String(c.lastMessage || "").toLowerCase().includes(q),
    )
  }, [conversations, search])

  // Thread detail data
  const { data: threadData, mutate: mutateThread } = useSWR(
    selectedThread ? `/api/buyer/messages/${selectedThread}` : null,
    fetcher,
  )

  const thread = threadData?.data

  const handleSendMessage = useCallback(async () => {
    if (!selectedThread || !draft.trim()) return
    setSending(true)
    try {
      const res = await fetch("/api/buyer/messages", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_message", threadId: selectedThread, message: draft }),
        credentials: "include",
      })
      if (res.ok) {
        setDraft("")
        mutateThread()
        mutate()
      }
    } finally {
      setSending(false)
    }
  }, [selectedThread, draft, mutateThread, mutate])

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <Suspense fallback={<Loading />}>
        <div className="space-y-6">
          <PageHeader
            title="Messages"
            subtitle="Communicate with dealers about offers and deals"
          />

          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations */}
          {isLoading ? (
            <Loading />
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
              title="No messages yet"
              description="When you start communicating with dealers about offers, your conversations will appear here."
              primaryCta={{ label: "Browse Vehicles", href: "/buyer/search" }}
            />
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Conversation List */}
              <Card className="lg:col-span-1 h-[600px] overflow-hidden">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filtered.map((conv: any) => (
                      <div
                        key={conv.id}
                        className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                          selectedThread === conv.id ? "bg-muted" : ""
                        }`}
                        onClick={() => setSelectedThread(conv.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              <MessageSquare className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {approvalBadge(conv.approvalType)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessage || "No messages yet"}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Message Area */}
              <Card className="lg:col-span-2 h-[600px] flex flex-col">
                {selectedThread && thread ? (
                  <>
                    <div className="p-4 border-b">
                      <div className="flex items-center gap-2">
                        {approvalBadge(thread.approvalType)}
                        <Badge variant={thread.status === "ACTIVE" ? "default" : "secondary"}>
                          {thread.status}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="flex-1 overflow-y-auto p-4">
                      <div className="space-y-3">
                        {(thread.messages || []).map((msg: any) => (
                          <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-xs rounded-lg p-3 ${msg.isMe ? "bg-[#0066FF] text-white" : "bg-muted"}`}>
                              <p className="text-sm">{msg.body}</p>
                              {msg.containsSensitiveData && (
                                <div className="flex items-center gap-1 mt-1">
                                  <ShieldCheck className="h-3 w-3" />
                                  <span className="text-xs opacity-75">Some contact details were hidden to protect the transaction.</span>
                                </div>
                              )}
                              <p className={`text-xs mt-1 ${msg.isMe ? "text-blue-100" : "text-muted-foreground"}`}>
                                {new Date(msg.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder={thread.status === "ACTIVE" ? "Type a message..." : "Thread is closed"}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          disabled={thread.status !== "ACTIVE" || sending}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={thread.status !== "ACTIVE" || sending || !draft.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a conversation to view messages</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          )}
        </div>
      </Suspense>
    </ProtectedRoute>
  )
}

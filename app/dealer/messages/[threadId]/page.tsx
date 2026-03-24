"use client"
import { use, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { MessageSquare, Send, ShieldCheck } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"
import { useSearchParams } from "next/navigation"

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

export default function DealerMessageThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params)
  const searchParams = useSearchParams()
  const isSupportTicket = searchParams.get("type") === "support"

  const [messages, setMessages] = useState<any[]>([])
  const [subject, setSubject] = useState<string>("")
  const [status, setStatus] = useState<string>("")
  const [approvalType, setApprovalType] = useState<string>("")
  const [readiness, setReadiness] = useState<any>(null)
  const [identityReleased, setIdentityReleased] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchThread() {
      try {
        // Use appropriate API based on thread type
        const endpoint = isSupportTicket
          ? `/api/dealer/messages/${threadId}`
          : `/api/dealer/messages/threads/${threadId}`
        const res = await fetch(endpoint, { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          if (isSupportTicket) {
            setMessages(data.data?.messages || [])
            setSubject(data.data?.subject || threadId)
            setStatus(data.data?.status || "")
          } else {
            setMessages(data.data?.messages || [])
            setStatus(data.data?.status || "")
            setApprovalType(data.data?.approvalType || "")
            setReadiness(data.data?.readiness || null)
            setIdentityReleased(data.data?.identityReleased || false)
          }
        }
      } finally {
        setLoading(false)
      }
    }
    fetchThread()
  }, [threadId, isSupportTicket])

  const handleSend = async () => {
    if (!draft.trim()) return
    setSending(true)
    try {
      if (isSupportTicket) {
        const res = await fetch(`/api/dealer/messages/${threadId}`, {
          method: "POST",
          headers: { ...csrfHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ message: draft }),
          credentials: "include",
        })
        if (!res.ok) return
        setDraft("")
        const r2 = await fetch(`/api/dealer/messages/${threadId}`, { credentials: "include" })
        const d2 = await r2.json().catch(() => null)
        setMessages(d2?.data?.messages || [])
      } else {
        const res = await fetch("/api/dealer/messages/threads", {
          method: "POST",
          headers: { ...csrfHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, message: draft }),
          credentials: "include",
        })
        if (!res.ok) return
        setDraft("")
        const r2 = await fetch(`/api/dealer/messages/threads/${threadId}`, { credentials: "include" })
        const d2 = await r2.json().catch(() => null)
        setMessages(d2?.data?.messages || [])
      }
    } finally {
      setSending(false)
    }
  }

  const isClosed = isSupportTicket ? status === "CLOSED" : status !== "ACTIVE"

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dealer/messages">Messages</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{isSupportTicket ? subject || threadId : "Buyer Conversation"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Buyer Readiness Card (only for buyer↔dealer threads) */}
      {!isSupportTicket && readiness && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Buyer Readiness Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Approval Source</p>
                <div className="mt-1">{approvalBadge(readiness.approvalType)}</div>
              </div>
              {readiness.maxBudget != null && (
                <div>
                  <p className="text-muted-foreground">Max Budget</p>
                  <p className="font-medium">${Number(readiness.maxBudget).toLocaleString()}</p>
                </div>
              )}
              {readiness.expiration && readiness.expiration !== "Expired" && (
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <p className="font-medium">{new Date(readiness.expiration).toLocaleDateString()}</p>
                </div>
              )}
              {readiness.expiration === "Expired" && (
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="destructive">Expired</Badge>
                </div>
              )}
              {readiness.vehicleConstraints && (
                <div>
                  <p className="text-muted-foreground">Vehicle Constraints</p>
                  <p className="font-medium">{readiness.vehicleConstraints}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="truncate">
              {isSupportTicket ? subject || "Support Ticket" : "Buyer Conversation"}
            </span>
            <div className="flex items-center gap-2">
              {!isSupportTicket && approvalBadge(approvalType)}
              {status ? <Badge variant={isClosed ? "secondary" : "default"} className="text-xs">{status}</Badge> : null}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p>No messages yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs rounded-lg p-3 ${msg.isMe ? "bg-[#0066FF] text-white" : "bg-muted"}`}>
                    <p className="text-sm">{msg.body || msg.message}</p>
                    {msg.containsSensitiveData && (
                      <div className="flex items-center gap-1 mt-1">
                        <ShieldCheck className="h-3 w-3" />
                        <span className="text-xs opacity-75">Some contact details were hidden to protect the transaction.</span>
                      </div>
                    )}
                    <p className={`text-xs mt-1 ${msg.isMe ? "text-blue-100" : "text-muted-foreground"}`}>
                      {new Date(msg.createdAt || msg.time).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              placeholder={isClosed ? "Thread is closed" : "Type your message..."}
              className="flex-1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isClosed || sending}
            />
            <Button
              disabled={isClosed || sending || !draft.trim()}
              onClick={handleSend}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

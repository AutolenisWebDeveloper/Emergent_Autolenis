"use client"

import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Search, Send, ShieldCheck } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import { useMemo, useState } from "react"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json())

function approvalBadge(type: string) {
  switch (type) {
    case "autolenis":
      return <Badge variant="default" className="bg-green-600 text-xs">AutoLenis Prequalified</Badge>
    case "external":
      return <Badge variant="default" className="bg-blue-600 text-xs">External Pre-Approval</Badge>
    case "cash":
      return <Badge variant="secondary" className="text-xs">Cash Buyer</Badge>
    default:
      return null
  }
}

export default function DealerMessagesPage() {
  // Support tickets
  const { data: ticketData, isLoading: ticketsLoading } = useSWR("/api/dealer/messages", fetcher)
  // Buyer↔Dealer threads
  const { data: threadData, isLoading: threadsLoading } = useSWR("/api/dealer/messages/threads", fetcher)
  const [search, setSearch] = useState("")

  const tickets: any[] = useMemo(() => {
    return ticketData?.success ? ticketData.data || [] : []
  }, [ticketData])

  const threads: any[] = useMemo(() => {
    return threadData?.success ? threadData.data || [] : []
  }, [threadData])

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tickets
    return tickets.filter(
      (c) =>
        String(c.subject || "").toLowerCase().includes(q) ||
        String(c.lastMessage || "").toLowerCase().includes(q),
    )
  }, [tickets, search])

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return threads
    return threads.filter(
      (c: any) =>
        String(c.approvalType || "").toLowerCase().includes(q) ||
        String(c.lastMessage || "").toLowerCase().includes(q),
    )
  }, [threads, search])

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" subtitle="Support tickets & buyer conversations." />

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link href="/dealer/messages/new" className="inline-flex">
          <Button>New Ticket</Button>
        </Link>
      </div>

      <Tabs defaultValue="buyer-threads">
        <TabsList>
          <TabsTrigger value="buyer-threads">
            Buyer Conversations {threads.length > 0 && <Badge variant="secondary" className="ml-2">{threads.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="support">
            Support Tickets {tickets.length > 0 && <Badge variant="secondary" className="ml-2">{tickets.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Buyer↔Dealer Threads Tab */}
        <TabsContent value="buyer-threads">
          {threadsLoading ? (
            <div className="space-y-3">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
              title="No buyer conversations yet"
              description="When buyers message you about offers, conversations will appear here."
            />
          ) : (
            <div className="space-y-2">
              {filteredThreads.map((t: any) => (
                <Link key={t.id} href={`/dealer/messages/${t.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar>
                            <AvatarFallback>
                              <MessageSquare className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {approvalBadge(t.approvalType)}
                              <Badge variant={t.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                                {t.status}
                              </Badge>
                            </div>
                            {t.readiness && (
                              <p className="text-xs text-muted-foreground">
                                {t.readiness.approvalSource}
                                {t.readiness.maxBudget ? ` · Budget: $${Number(t.readiness.maxBudget).toLocaleString()}` : ""}
                                {t.readiness.expiration && t.readiness.expiration !== "Expired" ? ` · Exp: ${new Date(t.readiness.expiration).toLocaleDateString()}` : ""}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {t.lastMessage || "No messages yet"}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Support Tickets Tab */}
        <TabsContent value="support">
          {ticketsLoading ? (
            <div className="space-y-3">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
              title="No support tickets yet"
              description="Start a support ticket to get help from the AutoLenis team."
              primaryCta={{ label: "Create Ticket", href: "/dealer/messages/new" }}
            />
          ) : (
            <div className="space-y-2">
              {filteredTickets.map((conv: any) => (
                <Link key={conv.id} href={`/dealer/messages/${conv.id}?type=support`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar>
                            <AvatarFallback>{String(conv.subject || "S").slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{conv.subject}</p>
                            <p className="text-sm text-muted-foreground truncate">{conv.lastMessage || ""}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

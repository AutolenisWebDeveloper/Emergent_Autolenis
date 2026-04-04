"use client"

import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { csrfHeaders } from "@/lib/csrf-client"

export default function NewDealerTicketPage() {
  const router = useRouter()
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader title="New Support Ticket" subtitle="Contact AutoLenis support (dealer-only)." />

      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="subject">Subject</label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Contract Shield issue, payout question"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="message">Message</label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you need help with..."
              rows={6}
            />
          </div>

          <div className="flex gap-3">
            <Button
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true)
                try {
                  const res = await fetch("/api/dealer/messages", {
                    method: "POST",
                    headers: {
                      ...csrfHeaders(),
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ subject, message }),
                    credentials: "include",
                  })
                  const data = await res.json().catch(() => null)
                  if (!res.ok || !data?.success) {
                    toast.error(data?.error || "Failed to create ticket")
                    return
                  }
                  toast.success("Ticket created")
                  router.push(`/dealer/messages/${data.data.id}`)
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              Create Ticket
            </Button>
            <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

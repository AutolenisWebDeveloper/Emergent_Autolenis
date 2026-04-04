"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Flag, StickyNote, Search, AlertTriangle, User, Building2 } from "lucide-react"

export default function AdminSupportPage() {
  const [impersonateType, setImpersonateType] = useState<"buyer" | "dealer">("buyer")
  const [impersonateId, setImpersonateId] = useState("")
  const [noteType, setNoteType] = useState<"buyer" | "dealer" | "deal">("buyer")
  const [noteEntityId, setNoteEntityId] = useState("")
  const [noteContent, setNoteContent] = useState("")

  const handleImpersonate = () => {
    // Implementation would open a new tab with read-only view
  }

  const handleAddNote = () => {
    // Implementation would save note via API
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Support Tools</h1>
        <p className="text-muted-foreground">Administrative tools for user support</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Impersonation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              View As User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              View the platform as a specific user to debug issues (read-only mode)
            </p>
            <div className="flex gap-3">
              <Select value={impersonateType} onValueChange={(v: "buyer" | "dealer") => setImpersonateType(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="dealer">Dealer</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={`Enter ${impersonateType} ID or email...`}
                value={impersonateId}
                onChange={(e) => setImpersonateId(e.target.value)}
                className="flex-1"
              />
            </div>
            <Button onClick={handleImpersonate} className="w-full bg-primary hover:bg-primary/90">
              <Eye className="h-4 w-4 mr-2" />
              View As {impersonateType === "buyer" ? "Buyer" : "Dealer"}
            </Button>
          </CardContent>
        </Card>

        {/* Internal Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-[#7ED321]" />
              Internal Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add internal notes to users, dealers, or deals (not visible to users)
            </p>
            <div className="flex gap-3">
              <Select value={noteType} onValueChange={(v: "buyer" | "dealer" | "deal") => setNoteType(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="dealer">Dealer</SelectItem>
                  <SelectItem value="deal">Deal</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={`Enter ${noteType} ID...`}
                value={noteEntityId}
                onChange={(e) => setNoteEntityId(e.target.value)}
                className="flex-1"
              />
            </div>
            <Textarea
              placeholder="Enter note content..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
            />
            <Button onClick={handleAddNote} className="w-full bg-[#7ED321] hover:bg-[#7ED321]/90 text-white">
              <StickyNote className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </CardContent>
        </Card>

        {/* Flags & Risk Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-500" />
              Flagged Entities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Review flagged users, dealers, and deals for suspicious activity
            </p>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium text-sm">Suspicious Affiliate Activity</p>
                    <p className="text-xs text-muted-foreground">2 affiliates flagged</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
              <div className="p-3 border rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">Contract Issues</p>
                    <p className="text-xs text-muted-foreground">1 dealer with multiple failures</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
              <div className="p-3 border rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium text-sm">Payment Disputes</p>
                    <p className="text-xs text-muted-foreground">0 pending disputes</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-[#00D9FF]" />
              Quick Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Search across all entities by ID, email, or name</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by ID, email, name, VIN..." className="pl-10" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="justify-start bg-transparent">
                <User className="h-4 w-4 mr-2" />
                Buyers
              </Button>
              <Button variant="outline" size="sm" className="justify-start bg-transparent">
                <Building2 className="h-4 w-4 mr-2" />
                Dealers
              </Button>
              <Button variant="outline" size="sm" className="justify-start bg-transparent">
                <Flag className="h-4 w-4 mr-2" />
                Deals
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

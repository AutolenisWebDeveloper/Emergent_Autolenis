"use client"

import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, User, Shield, Ban, CheckCircle } from "lucide-react"
import useSWR from "swr"
import Link from "next/link"
import { useState } from "react"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/users/${userId}`, fetcher)
  const [suspending, setSuspending] = useState(false)

  const handleSuspendToggle = async () => {
    if (!data?.user) return
    const action = data.user.status === "SUSPENDED" ? "reactivate" : "suspend"
    if (!confirm(`Are you sure you want to ${action} this user?`)) return

    setSuspending(true)
    try {
      await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ action }),
      })
      mutate()
    } catch {
      // Error handling
    } finally {
      setSuspending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data?.user) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Failed to load user details.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const user = data.user

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {user.first_name || ""} {user.last_name || ""}
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge variant="outline">{user.role}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">User ID</span>
              <span className="text-sm font-mono text-muted-foreground">{user.id}</span>
            </div>
            {user.phone && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm">{user.phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email Verified</span>
              <span className="text-sm">{user.is_email_verified ? "Yes" : "No"}</span>
            </div>
            {user.createdAt && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" /> Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={user.status === "SUSPENDED" ? "destructive" : "default"}>
                {user.status || "ACTIVE"}
              </Badge>
            </div>
            <div className="pt-2 border-t">
              {user.status === "SUSPENDED" ? (
                <Button
                  onClick={handleSuspendToggle}
                  disabled={suspending}
                  className="w-full"
                  variant="outline"
                >
                  {suspending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Reactivate Account
                </Button>
              ) : (
                <Button
                  onClick={handleSuspendToggle}
                  disabled={suspending}
                  className="w-full"
                  variant="destructive"
                >
                  {suspending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
                  Suspend Account
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Car, Calendar, MapPin, ArrowRight, Loader2, AlertCircle, FileSearch, RefreshCw } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-700 border-blue-300",
  SOURCING: "bg-yellow-100 text-yellow-700 border-yellow-300",
  OFFERS_AVAILABLE: "bg-green-100 text-green-700 border-green-300",
  OFFER_SELECTED: "bg-emerald-100 text-emerald-700 border-emerald-300",
  DEALER_INVITED: "bg-purple-100 text-purple-700 border-purple-300",
  IN_PLATFORM_TRANSACTION: "bg-indigo-100 text-indigo-700 border-indigo-300",
  CLOSED_WON: "bg-gray-200 text-gray-600 border-gray-400",
  CLOSED_LOST: "bg-gray-200 text-gray-500 border-gray-300",
  CLOSED_CANCELLED: "bg-red-100 text-red-700 border-red-300",
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ")
}

interface RequestCase {
  id: string
  status: string
  marketZip: string
  radiusMiles: number
  createdAt: string
  items: Array<{
    id: string
    make: string
    model?: string | null
    vehicleType: string
  }>
}

export default function BuyerRequestsPage() {
  const [cases, setCases] = useState<RequestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const loadCases = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setRetryCount((prev) => prev + 1)
    }
    setLoading(true)
    setError(null)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
      
      const res = await fetch("/api/buyer/requests", {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        // Handle specific error codes gracefully
        if (res.status === 401 || res.status === 403) {
          // Auth issues - don't show generic error, let ProtectedRoute handle it
          setCases([])
          return
        }
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed (${res.status})`)
      }
      
      const data = await res.json()
      setCases(data.cases ?? data.data ?? [])
      setRetryCount(0) // Reset retry count on success
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Please check your connection and try again.")
      } else {
        setError(err instanceof Error ? err.message : "Unable to load your requests")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCases()
  }, [loadCases])

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vehicle Requests</h1>
            <p className="text-muted-foreground">
              Track your vehicle sourcing requests and offers
            </p>
          </div>
          <Button asChild>
            <Link href="/buyer/requests/new">
              <Plus className="h-4 w-4 mr-2" />
              Create New Request
            </Link>
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <h3 className="font-semibold text-lg">Loading your requests</h3>
              <p className="text-muted-foreground mt-1">
                Please wait while we fetch your vehicle requests...
              </p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
              <h3 className="font-semibold text-lg">Unable to load requests</h3>
              <p className="text-muted-foreground mt-1 max-w-md">{error}</p>
              {retryCount < 3 ? (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => loadCases(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try again
                </Button>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Still having trouble? You can still create a new request.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => loadCases(true)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try again
                    </Button>
                    <Button asChild>
                      <Link href="/buyer/requests/new">
                        <Plus className="h-4 w-4 mr-2" />
                        New Request
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : cases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileSearch className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No requests yet</h3>
              <p className="text-muted-foreground mt-1">
                Tell us what vehicles you&apos;re looking for and we&apos;ll source offers from our dealer network.
              </p>
              <Button asChild className="mt-4">
                <Link href="/buyer/requests/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Request
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {cases.map((c) => {
              const firstItem = c.items?.[0]
              const itemCount = c.items?.length ?? 0
              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Car className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={STATUS_COLORS[c.status] ?? ""}
                            >
                              {formatStatus(c.status)}
                            </Badge>
                          </div>
                          {firstItem && (
                            <h3 className="font-semibold">
                              {firstItem.make}
                              {firstItem.model ? ` ${firstItem.model}` : ""}
                              {itemCount > 1 && (
                                <span className="text-muted-foreground font-normal">
                                  {" "}+{itemCount - 1} more
                                </span>
                              )}
                            </h3>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {itemCount} vehicle{itemCount !== 1 ? "s" : ""} requested
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {c.marketZip} &middot; {c.radiusMiles} mi
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild className="bg-transparent">
                        <Link href={`/buyer/requests/${c.id}`}>
                          View
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

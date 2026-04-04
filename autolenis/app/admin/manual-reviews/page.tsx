"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import useSWR from "swr"
import { CheckCircle2, Clock, AlertTriangle, XCircle, ExternalLink, Shield } from "lucide-react"
import { useRouter } from "next/navigation"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  OPEN: { label: "Open", variant: "secondary", icon: Clock },
  PENDING_SECOND_APPROVAL: { label: "Pending Second Approval", variant: "outline", icon: AlertTriangle },
  APPROVED: { label: "Approved", variant: "default", icon: CheckCircle2 },
  RETURNED_INTERNAL_FIX: { label: "Internal Fix", variant: "secondary", icon: AlertTriangle },
  REVOKED: { label: "Revoked", variant: "destructive", icon: XCircle },
}

export default function ManualReviewsListPage() {
  const router = useRouter()
  const { data } = useSWR("/api/admin/manual-reviews", fetcher)

  const reviews = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Manual Reviews (CMA)
        </h1>
        <p className="text-muted-foreground">
          Controlled Manual Approval workflow for non-dealer-correctable contract rejects
        </p>
      </div>

      <div className="grid gap-4">
        {reviews.map((review: any) => {
          const config = statusConfig[review.status] || statusConfig.OPEN
          const StatusIcon = config.icon

          return (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Deal: {review.deal?.id?.slice(0, 8)}...
                    </CardTitle>
                    <CardDescription>
                      {review.rootCauseCategory
                        ? `Root cause: ${review.rootCauseCategory.replace(/_/g, " ")}`
                        : "Pending checklist submission"}
                      {" • "}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant={config.variant}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {review.approvedByAdmin && (
                    <Badge variant="outline">
                      Reviewed by: {review.approvedByAdmin.first_name} {review.approvedByAdmin.last_name}
                    </Badge>
                  )}
                  {review.approvalMode && (
                    <Badge variant="outline">
                      {review.approvalMode.replace(/_/g, " ")}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/admin/manual-reviews/${review.id}`)}
                  >
                    View Details
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {reviews.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No manual reviews yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

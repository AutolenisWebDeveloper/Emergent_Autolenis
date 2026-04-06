import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function NewBuyerRequestLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-16" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
      </div>
      {/* Step indicator skeleton */}
      <div className="flex items-center justify-between gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-3 w-16 hidden sm:block" />
          </div>
        ))}
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

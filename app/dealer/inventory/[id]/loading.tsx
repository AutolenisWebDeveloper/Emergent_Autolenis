import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-64" />
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-72 mb-2" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

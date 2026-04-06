import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-4 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-16 w-full" /></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

export default function DealerAnalyticsLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-36" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  )
}

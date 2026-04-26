import { Skeleton } from "@/components/ui/skeleton"

export default function DealerNotificationsLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-44" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  )
}

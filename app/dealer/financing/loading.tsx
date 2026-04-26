import { Skeleton } from "@/components/ui/skeleton"

export default function DealerFinancingLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}

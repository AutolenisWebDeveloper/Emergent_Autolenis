"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface VehicleLoadingSkeletonProps {
  variant?: "card" | "compact" | "row" | "summary"
  count?: number
  className?: string
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      {/* Image placeholder */}
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        <Skeleton className="h-3.5 w-2/3" />
        <div className="flex items-end justify-between pt-2 border-t border-border/40">
          <div className="space-y-1">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonCompact() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl border border-border/60">
      <Skeleton className="w-28 h-20 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="space-y-1 flex-shrink-0">
        <Skeleton className="h-5 w-20 ml-auto" />
        <Skeleton className="h-3 w-14 ml-auto" />
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex gap-4 p-3.5 border-b border-border/40">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-8 ml-auto" />
    </div>
  )
}

function SkeletonSummary() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-slate-900">
        <Skeleton className="h-5 w-36 bg-white/10" />
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-3 md:border-l md:pl-6">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="border-t pt-3">
              <Skeleton className="h-6 w-1/2 ml-auto" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function VehicleLoadingSkeleton({
  variant = "card",
  count = 1,
  className,
}: VehicleLoadingSkeletonProps) {
  const items = Array.from({ length: count })

  if (variant === "summary") {
    return (
      <div className={cn("space-y-6", className)}>
        {items.map((_, i) => (
          <SkeletonSummary key={i} />
        ))}
      </div>
    )
  }

  if (variant === "row") {
    return (
      <div className={cn("space-y-0", className)}>
        {items.map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <div className={cn("space-y-3", className)}>
        {items.map((_, i) => (
          <SkeletonCompact key={i} />
        ))}
      </div>
    )
  }

  // Card grid
  return (
    <div className={cn("grid md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
      {items.map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

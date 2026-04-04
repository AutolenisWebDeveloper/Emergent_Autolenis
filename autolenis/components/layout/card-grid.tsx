import type React from "react"
import { cn } from "@/lib/utils"

interface CardGridProps {
  children: React.ReactNode
  className?: string
  columns?: 1 | 2 | 3 | 4
}

export function CardGrid({ children, className, columns = 3 }: CardGridProps) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }

  return <div className={cn("grid gap-4 sm:gap-6", columnClasses[columns], className)}>{children}</div>
}

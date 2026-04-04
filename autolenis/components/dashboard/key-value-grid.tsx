"use client"

import type { ReactNode } from "react"

interface KeyValueItem {
  label: string
  value: ReactNode
  className?: string
}

interface KeyValueGridProps {
  items: KeyValueItem[]
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function KeyValueGrid({ items, columns = 2, className = "" }: KeyValueGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className={`space-y-1 ${item.className || ""}`}>
          <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
          <dd className="text-sm font-semibold">{item.value || "—"}</dd>
        </div>
      ))}
    </div>
  )
}

"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { Car } from "lucide-react"
import type { ReactNode } from "react"

interface VehicleImageFrameProps {
  src?: string | null
  alt: string
  aspectRatio?: "video" | "square" | "wide"
  size?: "sm" | "md" | "lg"
  className?: string
  priority?: boolean
  overlay?: ReactNode
}

export function VehicleImageFrame({
  src,
  alt,
  aspectRatio = "video",
  size = "md",
  className,
  priority = false,
  overlay,
}: VehicleImageFrameProps) {
  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    wide: "aspect-[2/1]",
  }

  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/60",
        aspectClasses[aspectRatio],
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Car className={cn("text-muted-foreground/30", iconSizes[size])} />
        </div>
      )}
      {overlay && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="pointer-events-auto">{overlay}</div>
        </div>
      )}
    </div>
  )
}

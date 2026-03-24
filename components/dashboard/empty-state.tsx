"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import type { ReactNode } from "react"

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  primaryCta?: {
    label: string
    href?: string
    onClick?: () => void
  }
  secondaryCta?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  primaryCta,
  secondaryCta,
  className = "",
}: EmptyStateProps) {
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm max-w-md mb-6">{description}</p>
        
        {(primaryCta || secondaryCta) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {primaryCta && (
              <Button
                onClick={primaryCta.onClick}
                asChild={!!primaryCta.href}
              >
                {primaryCta.href ? (
                  <Link href={primaryCta.href}>{primaryCta.label}</Link>
                ) : (
                  primaryCta.label
                )}
              </Button>
            )}
            {secondaryCta && (
              <Button
                variant="outline"
                onClick={secondaryCta.onClick}
                asChild={!!secondaryCta.href}
              >
                {secondaryCta.href ? (
                  <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
                ) : (
                  secondaryCta.label
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

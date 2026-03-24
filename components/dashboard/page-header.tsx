"use client"

import { ChevronRight, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  backHref?: string
  backLabel?: string
  primaryAction?: {
    label: string
    href?: string
    onClick?: () => void
    icon?: ReactNode
    variant?: "default" | "outline" | "secondary"
  }
  secondaryActions?: {
    label: string
    href?: string
    onClick?: () => void
    icon?: ReactNode
    variant?: "default" | "outline" | "secondary" | "ghost"
  }[]
  children?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  backHref,
  backLabel = "Back",
  primaryAction,
  secondaryActions,
  children,
}: PageHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center text-sm text-muted-foreground" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
              {item.href ? (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Back Button */}
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {backLabel}
        </Link>
      )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm sm:text-base mt-1">{subtitle}</p>}
        </div>

        {/* Actions */}
        {(primaryAction || secondaryActions) && (
          <div className="flex items-center gap-2 flex-wrap">
            {secondaryActions?.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "outline"}
                onClick={action.onClick}
                asChild={!!action.href}
              >
                {action.href ? (
                  <Link href={action.href}>
                    {action.icon}
                    {action.label}
                  </Link>
                ) : (
                  <>
                    {action.icon}
                    {action.label}
                  </>
                )}
              </Button>
            ))}
            {primaryAction && (
              <Button
                variant={primaryAction.variant || "default"}
                onClick={primaryAction.onClick}
                asChild={!!primaryAction.href}
              >
                {primaryAction.href ? (
                  <Link href={primaryAction.href}>
                    {primaryAction.icon}
                    {primaryAction.label}
                  </Link>
                ) : (
                  <>
                    {primaryAction.icon}
                    {primaryAction.label}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {children}
    </div>
  )
}

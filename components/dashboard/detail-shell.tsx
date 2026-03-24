"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ReactNode } from "react"

interface SummarySection {
  title?: string
  content: ReactNode
  actions?: ReactNode
}

interface TabConfig {
  id: string
  label: string
  content: ReactNode
  badge?: string | number
}

interface DetailShellProps {
  summary: SummarySection
  tabs: TabConfig[]
  defaultTab?: string
  className?: string
}

export function DetailShell({
  summary,
  tabs,
  defaultTab,
  className = "",
}: DetailShellProps) {
  return (
    <div className={`grid lg:grid-cols-3 gap-6 ${className}`}>
      {/* Summary Card */}
      <Card className="h-fit">
        {summary.title && (
          <CardHeader>
            <CardTitle className="text-lg">{summary.title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={summary.title ? "" : "pt-6"}>
          {summary.content}
          {summary.actions && <div className="mt-6">{summary.actions}</div>}
        </CardContent>
      </Card>

      {/* Tabs Panel */}
      <Card className="lg:col-span-2">
        <Tabs defaultValue={defaultTab || tabs[0]?.id}>
          <CardHeader className="pb-0">
            <TabsList className="flex-wrap h-auto gap-1">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="relative">
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-muted">
                      {tab.badge}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </CardHeader>
          <CardContent className="pt-6">
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                {tab.content}
              </TabsContent>
            ))}
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}

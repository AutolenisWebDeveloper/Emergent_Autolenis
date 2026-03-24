"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Bug, CheckCircle, XCircle } from "lucide-react"

interface AuthDebugInfo {
  hostname: string
  portal: string
  path: string
  cookiesEnabled: boolean
  storageAvailable: boolean
  sessionCookie: boolean
}

interface AuthDebugDrawerProps {
  portal: "buyer" | "dealer" | "affiliate" | "admin"
}

export function AuthDebugDrawer({ portal }: AuthDebugDrawerProps) {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Only show in development or when env badge is enabled
  const showDebugDrawer = process.env['NEXT_PUBLIC_ENV_BADGE'] === "true"

  useEffect(() => {
    if (!showDebugDrawer || !isOpen) return

    const cookiesEnabled = navigator.cookieEnabled
    const storageAvailable = checkStorageAvailable()
    const sessionCookie = document.cookie.includes("session=")

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Gathering debug info from browser APIs on open is intentional
    setDebugInfo({
      hostname: window.location.hostname,
      portal,
      path: window.location.pathname,
      cookiesEnabled,
      storageAvailable,
      sessionCookie,
    })
  }, [portal, showDebugDrawer, isOpen])

  if (!showDebugDrawer) {
    return null
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 shadow-lg"
          aria-label="Open auth debug drawer"
        >
          <Bug className="h-4 w-4 mr-2" />
          Auth Debug
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Authentication Debug Info</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {debugInfo && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Environment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hostname:</span>
                    <span className="font-mono text-xs">{debugInfo.hostname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Portal:</span>
                    <span className="font-medium">{debugInfo.portal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Path:</span>
                    <span className="font-mono text-xs truncate max-w-[200px]">{debugInfo.path}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Browser Capabilities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <StatusRow label="Cookies Enabled" status={debugInfo.cookiesEnabled} />
                  <StatusRow label="Storage Available" status={debugInfo.storageAvailable} />
                  <StatusRow label="Session Cookie Present" status={debugInfo.sessionCookie} />
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
                <CardHeader>
                  <CardTitle className="text-sm text-yellow-800 dark:text-yellow-200">
                    Important Note
                  </CardTitle>
                  <CardDescription className="text-yellow-700 dark:text-yellow-300">
                    Sessions don't transfer between preview links and autolenis.com. Each domain requires
                    separate authentication.
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    window.open("/api/auth/health", "_blank")
                  }}
                >
                  View Full Auth Health Report
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function StatusRow({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      {status ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-red-600" />
      )}
    </div>
  )
}

function checkStorageAvailable(): boolean {
  try {
    const test = "__storage_test__"
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

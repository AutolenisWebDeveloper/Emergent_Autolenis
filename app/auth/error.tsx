"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertCircle, LogIn, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AuthErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Authentication Error</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Please try again or sign in.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button size="sm" asChild>
            <Link href="/auth/signin">
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

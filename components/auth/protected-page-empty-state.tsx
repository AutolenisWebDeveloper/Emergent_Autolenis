"use client"

import { ShieldAlert, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

interface ProtectedPageEmptyStateProps {
  /**
   * Portal type to determine correct sign-in route
   */
  portal?: "buyer" | "dealer" | "affiliate" | "admin"
  /**
   * Optional custom message
   */
  message?: string
}

export function ProtectedPageEmptyState({ 
  portal = "buyer",
  message 
}: ProtectedPageEmptyStateProps) {
  const signInRoute = getSignInRoute(portal)

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Sign in required</h3>
          
          <p className="text-muted-foreground text-sm max-w-sm mb-2">
            {message || "You need to be signed in to access this page."}
          </p>
          
          <p className="text-muted-foreground text-xs max-w-sm mb-6 bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded border border-yellow-200 dark:border-yellow-900">
            <strong>Note:</strong> Sessions don't transfer between preview links and autolenis.com.
            If you're signed in elsewhere, you'll need to sign in here separately.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              asChild
              className="bg-primary hover:bg-primary/90"
            >
              <Link href={signInRoute}>Go to Sign In</Link>
            </Button>
            
            <Button
              variant="outline"
              asChild
            >
              <a 
                href="https://autolenis.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center"
              >
                Open AutoLenis.com
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getSignInRoute(portal: "buyer" | "dealer" | "affiliate" | "admin"): string {
  switch (portal) {
    case "admin":
      return "/admin/sign-in"
    case "buyer":
    case "dealer":
    case "affiliate":
    default:
      return "/auth/signin"
  }
}

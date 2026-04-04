import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShieldX, Home, ArrowLeft } from "lucide-react"

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border bg-card shadow-xl">
        <CardHeader className="gap-1 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Access Denied
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            You don{"'"}t have permission to access this resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            This area is restricted to authorized personnel only. If you
            believe you should have access, please contact the system
            administrator.
          </p>

          <div className="flex flex-col gap-2">
            <Button
              asChild
              className="w-full font-semibold text-primary-foreground"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
              }}
            >
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/signin">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} AutoLenis. All rights reserved.
      </p>
    </div>
  )
}

"use client"

import { Suspense } from "react"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { AuthNav } from "@/components/layout/auth-nav"
import { AuthFooter } from "@/components/layout/auth-footer"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Shield, TrendingUp, Car } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

function AuthBrandPanel() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between p-10 xl:p-14 text-primary-foreground relative overflow-hidden min-h-full"
      style={{
        background:
          "linear-gradient(155deg, var(--brand-purple) 0%, var(--brand-blue) 60%, var(--brand-cyan) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, white, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, white, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col gap-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/auto-20lenis.png"
            alt="AutoLenis"
            width={44}
            height={44}
            className="rounded-xl"
          />
          <span className="text-xl font-bold tracking-tight">AutoLenis</span>
        </Link>

        <div className="flex flex-col gap-4 mt-8">
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight text-balance">
            Join thousands of smart car buyers
          </h2>
          <p className="text-lg text-white/70 leading-relaxed max-w-md">
            Create your free account and start saving today. No commitments, no
            obligations.
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          {[
            "Instant pre-qualification (no credit impact)",
            "Dealers compete in a silent auction",
            "AI-powered contract verification",
            "Flat fee -- no hidden costs",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3" />
              </div>
              <span className="text-sm text-white/80">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-5 mt-auto pt-12">
        {[
          {
            icon: Shield,
            title: "Contract Shield AI",
            desc: "Every contract verified before you sign",
          },
          {
            icon: TrendingUp,
            title: "$2,500 Average Savings",
            desc: "Dealers compete, you save",
          },
          {
            icon: Car,
            title: "White-Glove Service",
            desc: "From search to delivery, we handle it",
          },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">{item.title}</div>
              <div className="text-sm text-white/60">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SignUpFormLoading() {
  return (
    <Card className="w-full max-w-md border border-border bg-card shadow-xl">
      <CardContent className="p-8">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="flex flex-col gap-3 mt-4">
            <div className="h-11 bg-muted rounded-lg" />
            <div className="h-11 bg-muted rounded-lg" />
            <div className="h-11 bg-muted rounded-lg" />
            <div className="h-11 bg-muted rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="lg:hidden">
        <AuthNav showSignIn={true} />
      </div>

      <div className="flex-1 grid lg:grid-cols-2">
        <AuthBrandPanel />

        <div className="flex items-center justify-center px-4 sm:px-8 py-12">
          <div className="w-full max-w-md">
            <Suspense fallback={<SignUpFormLoading />}>
              <SignUpForm />
            </Suspense>
          </div>
        </div>
      </div>

      <AuthFooter />
    </div>
  )
}

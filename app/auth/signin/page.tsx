"use client"

import { Suspense } from "react"
import { SignInForm } from "@/components/auth/sign-in-form"
import { AuthNav } from "@/components/layout/auth-nav"
import { AuthFooter } from "@/components/layout/auth-footer"
import { Loader2, Shield, TrendingUp, Car } from "lucide-react"
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
      {/* Decorative elements */}
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
            Your AI-powered car buying concierge
          </h2>
          <p className="text-lg text-white/70 leading-relaxed max-w-md">
            Dealers compete for your business. You stay in control with full
            transparency at every step.
          </p>
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

function SignInContent() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="lg:hidden">
        <AuthNav showSignUp={true} />
      </div>

      <div className="flex-1 grid lg:grid-cols-2">
        <AuthBrandPanel />

        <div className="flex items-center justify-center px-4 sm:px-8 py-12">
          <div className="w-full max-w-md">
            <SignInForm />
          </div>
        </div>
      </div>

      <AuthFooter />
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}

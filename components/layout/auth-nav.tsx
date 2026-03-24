"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { NAV_LINKS } from "@/components/nav/nav-config"

/** Subset of public nav links shown on auth pages */
const AUTH_PAGE_LINKS = NAV_LINKS.filter((l) =>
  ["/how-it-works", "/pricing", "/dealer-application", "/contact"].includes(l.href),
)

export function AuthNav({
  showSignUp = false,
  showSignIn = false,
}: {
  showSignUp?: boolean
  showSignIn?: boolean
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <Image
              src="/images/auto-20lenis.png"
              alt="AutoLenis"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="text-lg font-bold tracking-tight text-foreground">
              AutoLenis
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-6">
            {AUTH_PAGE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {showSignIn && (
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
            )}

            {showSignUp && (
              <Link href="/auth/signup">
                <Button
                  className="font-semibold text-primary-foreground"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
                  }}
                >
                  Get Started
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden"
            >
              <div className="flex flex-col gap-2 pt-4 pb-2 border-t border-border mt-3">
                {AUTH_PAGE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                {showSignIn && (
                  <Link
                    href="/auth/signin"
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                )}
                {showSignUp && (
                  <Link
                    href="/auth/signup"
                    className="block mt-1"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      className="w-full font-semibold text-primary-foreground"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
                      }}
                    >
                      Get Started
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

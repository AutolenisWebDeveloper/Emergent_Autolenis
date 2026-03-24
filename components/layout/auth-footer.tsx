import Link from "next/link"

export function AuthFooter() {
  return (
    <footer className="relative bg-footer-bg mt-auto">
      {/* Top border gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--footer-accent) 30%, var(--footer-accent) 70%, transparent)",
          opacity: 0.3,
        }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-footer-muted">
            &copy; {new Date().getFullYear()} <span style={{ color: "oklch(0.65 0.18 278)" }}>AutoLenis</span>. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <Link
              href="/faq"
              className="text-sm text-footer-muted hover:text-footer-foreground transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/legal/privacy"
              className="text-sm text-footer-muted hover:text-footer-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              className="text-sm text-footer-muted hover:text-footer-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/contact"
              className="text-sm text-footer-muted hover:text-footer-foreground transition-colors"
            >
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/how-it-works"
              className="text-sm text-footer-muted hover:text-footer-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-footer-muted hover:text-footer-foreground transition-colors"
            >
              Pricing
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

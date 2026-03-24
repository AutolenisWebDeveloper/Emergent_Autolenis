import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { SkipLink } from "@/components/skip-link"
import "@/lib/monitoring"
import { organizationSchema, webSiteSchema, jsonLdScript } from "@/lib/seo/schema"
import { ReferralCapture } from "@/components/affiliate/referral-capture"
import { Suspense } from "react"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  metadataBase: new URL(process.env['NEXT_PUBLIC_APP_URL'] || "https://autolenis.com"),
  title: {
    default: "AutoLenis — Car Buying. Reengineered.",
    template: "%s | AutoLenis",
  },
  description:
    "Get pre-qualified, submit a vehicle request, and receive verified out-the-door offers from competing dealers. AutoLenis is a premium automotive concierge platform for smarter, more transparent car buying.",
  generator: "v0.app",
  applicationName: "AutoLenis",
  keywords: [
    "automotive concierge",
    "car buying platform",
    "vehicle purchase",
    "transparent pricing",
    "out-the-door offers",
    "pre-qualification",
    "dealer offers",
    "digital car buying",
  ],
  authors: [{ name: "AutoLenis" }],
  creator: "AutoLenis",
  publisher: "AutoLenis",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://autolenis.com",
    siteName: "AutoLenis",
    title: "AutoLenis — Car Buying. Reengineered.",
    description:
      "Get pre-qualified, submit a vehicle request, and receive verified out-the-door offers from competing dealers. AutoLenis is a premium automotive concierge platform for smarter, more transparent car buying.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AutoLenis — Car Buying. Reengineered.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoLenis — Car Buying. Reengineered.",
    description: "Get pre-qualified, submit a vehicle request, and receive verified out-the-door offers from competing dealers.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "32x32",
      },
      {
        url: "/icon-light-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
  },
  verification: {
    // Add your verification codes here when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const ldJson = jsonLdScript([organizationSchema(), webSiteSchema()])

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`font-sans antialiased`}>
        <SkipLink />
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        {ldJson && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: ldJson }}
          />
        )}
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}

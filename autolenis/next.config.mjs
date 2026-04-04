// next.config.mjs — AutoLenis
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['@prisma/client', 'prisma', 'cheerio', 'playwright'],
  async headers() {
    // Determine the allowed CORS origin.
    // Priority: explicit NEXT_PUBLIC_APP_URL > Vercel-provided URL > production default.
    // This ensures Vercel preview/staging deployments return correct CORS headers
    // without requiring NEXT_PUBLIC_APP_URL to be set for every preview environment.
    let appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl && process.env.VERCEL_URL) {
      // Only trust VERCEL_URL for this project's own deployments
      const vercelUrl = process.env.VERCEL_URL
      if (vercelUrl.startsWith('auto-lenis-') && vercelUrl.endsWith('.vercel.app')) {
        appUrl = `https://${vercelUrl}`
      }
    }
    if (!appUrl) {
      appUrl = 'https://autolenis.com'
    }
    
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: appUrl },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ]
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}

export default withBundleAnalyzer(nextConfig)

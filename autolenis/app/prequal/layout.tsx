import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Shopping Prequalification | AutoLenis",
  description: "Check your estimated vehicle shopping range in minutes.",
}

export default function PrequalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-xl mx-auto">
          <a href="/" className="text-lg font-bold text-blue-700">AutoLenis</a>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-12 pb-8 text-center text-xs text-gray-400 px-4">
        <p>
          AutoLenis prequalification uses alternative credit data and is an informational tool
          only. Results are not a loan offer, financing approval, or guarantee of credit.
          Actual vehicle financing terms are determined by dealerships and lenders at time of
          purchase.
        </p>
      </footer>
    </div>
  )
}

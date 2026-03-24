"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function DealerAuctionsPage() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get("status")

  useEffect(() => {
    // Fetch invited auctions
    const url = statusFilter ? `/api/dealer/auctions?status=${statusFilter}` : "/api/dealer/auctions"
    fetch(url)
      .then((res) => {
        if (res.status === 403) {
          console.warn("[DealerAuctions] RLS_DENIED: Auction access restricted")
          return { auctions: [], _rlsDenied: true }
        }
        return res.json()
      })
      .then((data) => {
        setAuctions(data.auctions || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error("[v0] Error fetching auctions:", err)
        setLoading(false)
      })
  }, [statusFilter])

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading auctions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Auction Invitations</h1>
        <p className="text-muted-foreground mt-1">Respond to buyer auction requests</p>
      </div>

      <div className="grid gap-6">
        {auctions.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold mb-2">No Active Auctions</h3>
            <p className="text-muted-foreground">You'll be notified when buyers invite you to auctions</p>
          </div>
        ) : (
          auctions.map((auction: any) => (
            <div
              key={auction.id}
              className="bg-card border border-border rounded-lg p-6 hover:border-primary transition cursor-pointer"
              onClick={() => router.push(`/dealer/auctions/${auction.id}`)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">Auction #{auction.id.slice(0, 8)}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        auction.status === "ACTIVE"
                          ? "bg-brand-green/10 text-brand-green"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {auction.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {auction.shortlist.items.length} vehicles in shortlist
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Ends:</span>{" "}
                      <span className="font-medium">{new Date(auction.endsAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Your offers:</span>{" "}
                      <span className="font-medium">
                        {auction.offers?.filter((o: any) => o.dealerId === auction.dealerId).length || 0}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition">
                  View & Bid
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

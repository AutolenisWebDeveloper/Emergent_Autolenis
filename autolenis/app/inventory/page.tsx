"use client"

import { useEffect, useMemo, useState } from "react"

type Item = {
  id: string
  price: number | null
  mileage: number | null
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  vin: string | null
  listing_url: string | null
  source: string | null
  dealer_name: string | null
  dealer_phone: string | null
  dealer_address: string | null
  dealer_website: string | null
  city: string | null
  state: string | null
  zip: string | null
  last_seen_at: string | null
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState("")
  const [zip, setZip] = useState("")
  const [make, setMake] = useState("")
  const [model, setModel] = useState("")

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (q) p.set("q", q)
    if (zip) p.set("zip", zip)
    if (make) p.set("make", make)
    if (model) p.set("model", model)
    return p.toString()
  }, [q, zip, make, model])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/inventory/search?${qs}`)
        const data = await res.json()
        setItems(data.items || [])
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [qs])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Search Inventory</h1>
        <p className="text-sm text-gray-500">
          Browse vetted inventory found through the AutoLenis sourcing network.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="border rounded-xl px-3 py-2"
          placeholder="Search make, model, VIN, dealer"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="border rounded-xl px-3 py-2"
          placeholder="ZIP"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
        />
        <input
          className="border rounded-xl px-3 py-2"
          placeholder="Make"
          value={make}
          onChange={(e) => setMake(e.target.value)}
        />
        <input
          className="border rounded-xl px-3 py-2"
          placeholder="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </div>

      {loading && <div className="text-sm text-gray-500">Loading inventory...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-2xl p-4 space-y-3">
            <div>
              <div className="font-semibold">
                {[item.year, item.make, item.model, item.trim].filter(Boolean).join(" ")}
              </div>
              <div className="text-sm text-gray-500">{item.vin || "VIN unavailable"}</div>
            </div>

            <div className="text-lg font-semibold">
              {item.price ? `$${item.price.toLocaleString()}` : "Price on request"}
            </div>

            <div className="text-sm text-gray-600">
              Mileage: {item.mileage ? item.mileage.toLocaleString() : "—"}
            </div>

            <div className="text-sm">
              <div className="font-medium">{item.dealer_name || "Dealer unavailable"}</div>
              <div className="text-gray-500">
                {[item.city, item.state, item.zip].filter(Boolean).join(", ")}
              </div>
            </div>

            {item.listing_url ? (
              <a
                href={item.listing_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                View Listing
              </a>
            ) : (
              <span className="inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm text-gray-400">
                Available on AutoLenis
              </span>
            )}
          </div>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-sm text-gray-500">No inventory found.</div>
      )}
    </div>
  )
}

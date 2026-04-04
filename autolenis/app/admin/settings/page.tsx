"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Shield, Plug, Palette, Loader2 } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

export default function AdminSettingsPage() {
  const [depositAmount, setDepositAmount] = useState("99")
  const [feeTierOne, setFeeTierOne] = useState("499")
  const [auctionDuration, setAuctionDuration] = useState("48")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (!res.ok) {
        throw new Error("Failed to load settings")
      }
      const data = await res.json()
      setDepositAmount(String(data.depositAmount ?? 99))
      setFeeTierOne(String(data.feeTierOneCents ? Math.round(data.feeTierOneCents / 100) : 499))
      setAuctionDuration(String(data.auctionDurationHours ?? 48))
    } catch {
      setFeedback({ type: "error", message: "Failed to load settings. Using defaults." })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const saveSettings = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      const updates = [
        { key: "deposit_amount", value: Number(depositAmount) },
        { key: "fee_tier_one_cents", value: Number(feeTierOne) * 100 },
        { key: "auction_duration_hours", value: Number(auctionDuration) },
      ]

      for (const { key, value } of updates) {
        if (isNaN(value) || value < 0) {
          setFeedback({ type: "error", message: `Invalid value for ${key.replace(/_/g, " ")}` })
          setSaving(false)
          return
        }
        const res = await fetch("/api/admin/settings", {
          method: "POST",
          headers: csrfHeaders(),
          body: JSON.stringify({ key, value }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error?.message || "Failed to save settings")
        }
      }

      setFeedback({ type: "success", message: "Settings saved successfully." })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save settings"
      setFeedback({ type: "error", message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">System Settings</h1>

      {/* Quick links to sub-pages */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/settings/roles"
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <Shield className="h-5 w-5 text-purple-600" />
          <div>
            <p className="font-medium text-foreground">Role Management</p>
            <p className="text-sm text-muted-foreground">Manage user roles &amp; permissions</p>
          </div>
        </Link>
        <Link
          href="/admin/settings/integrations"
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <Plug className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-medium text-foreground">Integrations</p>
            <p className="text-sm text-muted-foreground">Manage connected services</p>
          </div>
        </Link>
        <Link
          href="/admin/settings/branding"
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <Palette className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-foreground">Branding</p>
            <p className="text-sm text-muted-foreground">Site name, colors &amp; metadata</p>
          </div>
        </Link>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-lg text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Payment Settings</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <input
                id="depositAmount"
                type="number"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label htmlFor="feeTierOne" className="block text-sm font-medium text-gray-700 mb-1">Premium Concierge Fee</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <input
                id="feeTierOne"
                type="number"
                min="0"
                value={feeTierOne}
                onChange={(e) => setFeeTierOne(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Auction Settings</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="auctionDuration" className="block text-sm font-medium text-gray-700 mb-1">Default Auction Duration (hours)</label>
            <input
              id="auctionDuration"
              type="number"
              min="1"
              value={auctionDuration}
              onChange={(e) => setAuctionDuration(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  )
}

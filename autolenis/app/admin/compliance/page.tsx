"use client"

import { useState, useEffect } from "react"

export default function AdminCompliancePage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/admin/compliance")
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events || data.data || [])
        } else {
          setError("Failed to load compliance events")
        }
      } catch {
        setError("Failed to load compliance events")
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  const severityColors: Record<string, string> = {
    INFO: "bg-blue-100 text-blue-800",
    WARNING: "bg-yellow-100 text-yellow-800",
    CRITICAL: "bg-red-100 text-red-800",
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Compliance Logs</h1>
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Compliance Logs</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Events Today</p>
          <p className="text-3xl font-bold text-foreground">{events.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-muted-foreground mb-1">Critical Alerts</p>
          <p className="text-3xl font-bold text-red-600">{events.filter((e) => e.severity === "CRITICAL").length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-muted-foreground mb-1">Warnings</p>
          <p className="text-3xl font-bold text-yellow-600">{events.filter((e) => e.severity === "WARNING").length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading compliance events...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No compliance events found</div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Severity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-accent">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{event.timestamp}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{event.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {event.userName} ({event.userId})
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{event.details}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${severityColors[event.severity]}`}>
                      {event.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  )
}

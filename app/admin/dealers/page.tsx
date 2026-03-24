"use client"

import { useState } from "react"
import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { useAdminList } from "@/hooks/use-admin-list"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Star } from "lucide-react"
import Link from "next/link"

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

const columns: AdminListColumn[] = [
  {
    header: "Dealer",
    key: "dealer",
    render: (dealer: any) => (
      <div>
        <Link href={`/admin/dealers/${dealer.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
          {dealer.name}
        </Link>
        <p className="text-xs text-muted-foreground">{dealer.email}</p>
      </div>
    ),
  },
  {
    header: "Location",
    key: "location",
    render: (dealer: any) => (
      <span className="text-sm text-muted-foreground">
        {dealer.city}, {dealer.state}
      </span>
    ),
  },
  {
    header: "Status",
    key: "status",
    render: (dealer: any) =>
      dealer.profileComplete === false ? (
        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Profile Incomplete</span>
      ) : dealer.verified && dealer.active ? (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
      ) : !dealer.verified ? (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
      ) : (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Inactive</span>
      ),
  },
  {
    header: "Score",
    key: "score",
    render: (dealer: any) => (
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
        <span className="font-medium">{dealer.integrityScore?.toFixed(1) || "N/A"}</span>
      </div>
    ),
  },
  {
    header: "Inventory",
    key: "inventoryCount",
    render: (dealer: any) => <span className="text-sm text-foreground">{dealer.inventoryCount}</span>,
  },
  {
    header: "Offers",
    key: "offersCount",
    render: (dealer: any) => <span className="text-sm text-foreground">{dealer.offersCount}</span>,
  },
  {
    header: "Win Rate",
    key: "winRate",
    render: (dealer: any) => <span className="text-sm font-medium text-green-600">{dealer.winRate}%</span>,
  },
  {
    header: "Joined",
    key: "joined",
    render: (dealer: any) => <span className="text-sm text-muted-foreground">{formatDate(dealer.createdAt)}</span>,
  },
  {
    header: "Actions",
    key: "actions",
    render: (dealer: any) => (
      <div className="flex items-center gap-2">
        <Link href={`/admin/dealers/${dealer.id}`} className="text-primary hover:underline text-sm font-medium">
          Details
        </Link>
      </div>
    ),
  },
]

export default function AdminDealersPage() {
  const [status, setStatus] = useState("all")

  const { data, isLoading, error, search, setSearch, handleSearch, page, setPage } = useAdminList({
    endpoint: "/api/admin/dealers",
    extraParams: { status },
  })

  return (
    <AdminListPageShell
      title="Dealers & Inventory"
      subtitle="Manage dealer accounts and inventory"
      searchPlaceholder="Search by name or email..."
      searchValue={search}
      onSearchChange={setSearch}
      onSearch={handleSearch}
      filterSlot={
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dealers</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending Verification</SelectItem>
          </SelectContent>
        </Select>
      }
      stats={[
        {
          label: "Total Dealers",
          value: data?.total || 0,
          icon: <Building2 className="h-8 w-8 text-primary" />,
        },
      ]}
      columns={columns}
      items={data?.dealers || []}
      rowKey={(dealer: any) => dealer.id}
      isLoading={isLoading}
      error={error}
      emptyText="No dealers found"
      loadingText="Loading dealers..."
      errorText="Failed to load dealers"
      page={data?.page || page}
      totalPages={data?.totalPages || 1}
      total={data?.total || 0}
      onPageChange={setPage}
    />
  )
}
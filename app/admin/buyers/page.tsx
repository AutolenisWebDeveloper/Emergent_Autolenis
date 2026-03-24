"use client"

import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { useAdminList } from "@/hooks/use-admin-list"
import { Button } from "@/components/ui/button"
import { Users, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

const columns: AdminListColumn[] = [
  {
    header: "Name",
    key: "name",
    render: (buyer: any) => (
      <div>
        <p className="font-medium text-foreground">
          {buyer.firstName || buyer.lastName ? `${buyer.firstName} ${buyer.lastName}`.trim() : buyer.email}
        </p>
        {buyer.profileComplete === false && (
          <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
            Profile Incomplete
          </span>
        )}
      </div>
    ),
  },
  {
    header: "Email",
    key: "email",
    render: (buyer: any) => <span className="text-sm text-muted-foreground">{buyer.email}</span>,
  },
  {
    header: "Phone",
    key: "phone",
    render: (buyer: any) => <span className="text-sm text-muted-foreground">{buyer.phone || "-"}</span>,
  },
  {
    header: "Pre-Qual",
    key: "preQual",
    render: (buyer: any) =>
      buyer.hasPreQual ? (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          {buyer.preQualStatus || "Active"}
        </span>
      ) : (
        <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
          None
        </span>
      ),
  },
  {
    header: "Affiliate",
    key: "affiliate",
    render: (buyer: any) =>
      buyer.isAffiliate ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-gray-300" />
      ),
  },
  {
    header: "Status",
    key: "status",
    render: (buyer: any) =>
      buyer.hasCompletedDeal ? (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          Completed Deal
        </span>
      ) : buyer.hasActiveAuction ? (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          Active Auction
        </span>
      ) : (
        <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
          Browsing
        </span>
      ),
  },
  {
    header: "Joined",
    key: "joined",
    render: (buyer: any) => <span className="text-sm text-muted-foreground">{formatDate(buyer.createdAt)}</span>,
  },
  {
    header: "Actions",
    key: "actions",
    render: (buyer: any) => (
      <Link href={`/admin/buyers/${buyer.id}`} className="text-primary hover:underline text-sm font-medium">
        View Details
      </Link>
    ),
  },
]

export default function AdminBuyersPage() {
  const { data, isLoading, error, search, setSearch, handleSearch, page, setPage } = useAdminList({
    endpoint: "/api/admin/buyers",
  })

  return (
    <AdminListPageShell
      title="Buyers"
      subtitle="Manage all registered buyers"
      headerActions={
        <Link href="/admin/buyers/create">
          <Button className="bg-gradient-to-r from-[#7ED321] to-[#00D9FF]">Create Buyer</Button>
        </Link>
      }
      searchPlaceholder="Search by name or email..."
      searchValue={search}
      onSearchChange={setSearch}
      onSearch={handleSearch}
      stats={[
        {
          label: "Total Buyers",
          value: data?.total || 0,
          icon: <Users className="h-8 w-8 text-primary" />,
        },
      ]}
      columns={columns}
      items={data?.buyers || []}
      rowKey={(buyer: any) => buyer.id}
      isLoading={isLoading}
      error={error}
      emptyText="No buyers found"
      loadingText="Loading buyers..."
      errorText="Failed to load buyers"
      page={data?.page || page}
      totalPages={data?.totalPages || 1}
      total={data?.total || 0}
      onPageChange={setPage}
    />
  )
}

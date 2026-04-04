"use client"

import useSWR from "swr"
import type { UserRole } from "@/lib/types"

interface UserData {
  id: string
  email: string
  role: UserRole
  is_affiliate?: boolean
  emailVerified?: boolean
  createdAt?: string
  firstName?: string
  lastName?: string
  phone?: string
  buyerProfile?: any
  dealerProfile?: any
  affiliateProfile?: any
  workspace_mode?: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)

  // If unauthorized (stale session cleared), return empty data
  if (res.status === 401) {
    return { success: false, data: { user: null } }
  }

  // If other error, throw to trigger SWR error state
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`)
  }

  return res.json()
}

export function useUser() {
  const { data, error, isLoading, mutate } = useSWR("/api/auth/me", fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: true,
  })

  const user: UserData | null = data?.data?.user ?? null

  return {
    user,
    isLoading,
    isError: error,
    mutate,
  }
}

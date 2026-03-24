export const REFERRAL_CODE_FIELD = "refCode" as const

export function getReferralCode(affiliate: any): string {
  return affiliate?.refCode || affiliate?.referralCode || affiliate?.ref_code || ""
}

export function buildReferralLink(code: string, path = "/"): string {
  const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || "https://autolenis.com"
  return `${baseUrl}${path}?ref=${code}`
}

export function normalizeReferralCodeQuery(code: string | null | undefined): string | undefined {
  if (!code) return undefined
  return code.trim().toUpperCase()
}

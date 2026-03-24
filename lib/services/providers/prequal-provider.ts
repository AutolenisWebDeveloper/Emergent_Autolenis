/**
 * PreQual Provider abstraction layer.
 *
 * All prequal providers (internal heuristic, MicroBilt/Experian, iPredict)
 * must implement this interface. The service layer dispatches to the correct
 * provider based on configuration and source type.
 *
 * The two-layer architecture separates:
 *   Layer 1 — Consent + compliance orchestration (service layer)
 *   Layer 2 — Provider abstraction (this module)
 */

// ─── Provider request ──────────────────────────────────────────

export interface PrequalProviderRequest {
  firstName: string
  lastName: string
  dateOfBirth: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  monthlyIncomeCents: number
  monthlyHousingCents: number
  ssnLast4?: string
  consentArtifactId?: string
}

// ─── Provider response ─────────────────────────────────────────

export interface PrequalProviderResponse {
  success: boolean
  creditTier?: string
  creditScore?: number
  approvedAmountCents?: number
  maxMonthlyPaymentCents?: number
  minMonthlyPaymentCents?: number
  dtiRatio?: number
  providerReferenceId?: string
  errorMessage?: string
  errorCode?: string
  rawResponse?: unknown
}

// ─── Provider interface ────────────────────────────────────────

export interface PrequalProvider {
  /** Unique provider identifier */
  readonly providerName: string

  /** Human-readable display name */
  readonly displayName: string

  /**
   * Execute a prequal request against the provider.
   * Must NOT handle consent — that is the service layer's responsibility.
   */
  prequalify(request: PrequalProviderRequest): Promise<PrequalProviderResponse>

  /**
   * Whether this provider is available for use.
   * Providers should return false if required config is missing.
   */
  isAvailable(): boolean
}

// ─── Provider registry ─────────────────────────────────────────

const providers = new Map<string, PrequalProvider>()

export function registerProvider(provider: PrequalProvider): void {
  providers.set(provider.providerName, provider)
}

export function getProvider(name: string): PrequalProvider | undefined {
  return providers.get(name)
}

export function getAvailableProviders(): PrequalProvider[] {
  return Array.from(providers.values()).filter((p) => p.isAvailable())
}

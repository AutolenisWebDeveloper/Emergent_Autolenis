/**
 * Dealer Agreement Gate — Shared Enforcement Utility
 *
 * Ensures dealers have a completed participation agreement before
 * accessing protected actions (offer submission, etc.).
 *
 * Uses the existing checkDealerAgreementGate function from
 * dealer-onboarding/types.ts for the actual gating logic.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { checkDealerAgreementGate } from "@/lib/services/dealer-onboarding/types"
import { randomUUID } from "crypto"

/**
 * Verify that a dealer has completed their participation agreement.
 * Returns null if the dealer passes the gate, or a NextResponse with
 * a 403 error if they are blocked.
 *
 * Usage in API routes:
 *   const gateResult = await requireDealerAgreement(dealer.id)
 *   if (gateResult) return gateResult
 */
export async function requireDealerAgreement(
  dealerId: string,
): Promise<NextResponse | null> {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: {
      agreementRequired: true,
      agreementCompleted: true,
      docusignBlocked: true,
      accessState: true,
    },
  })

  if (!dealer) {
    return NextResponse.json(
      {
        error: { code: "DEALER_NOT_FOUND", message: "Dealer not found" },
        correlationId: randomUUID(),
      },
      { status: 404 },
    )
  }

  // Defensive defaults: agreementRequired defaults to true so that dealers
  // with null/undefined fields are blocked until explicitly configured.
  const gate = checkDealerAgreementGate({
    agreementRequired: dealer.agreementRequired ?? true,
    agreementCompleted: dealer.agreementCompleted ?? false,
    docusignBlocked: dealer.docusignBlocked ?? false,
    accessState: dealer.accessState ?? null,
  })

  if (!gate.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "AGREEMENT_REQUIRED",
          message: "Dealer participation agreement must be completed before this action",
          blockers: gate.blockers,
        },
        correlationId: randomUUID(),
      },
      { status: 403 },
    )
  }

  return null
}

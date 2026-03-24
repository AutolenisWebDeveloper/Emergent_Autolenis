/**
 * DocuSign Template Service
 *
 * Handles template operations: listing, retrieving, validating, and creating
 * the dealer agreement template configuration.
 */

import { logger } from "@/lib/logger"
import {
  getDocuSignAuthConfig,
  isDocuSignConfigured,
  getDocuSignAccessToken,
} from "./auth.service"

// ---------------------------------------------------------------------------
// Agreement HTML document (canonical source of truth)
// ---------------------------------------------------------------------------

export const DEALER_AGREEMENT_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; margin: 60px; color: #000; line-height: 1.5; }
  h1 { font-size: 16pt; text-align: center; font-weight: bold; }
  h2 { font-size: 13pt; margin-top: 24px; font-weight: bold; }
  p  { margin: 8px 0; }
  ul { margin: 8px 0 8px 24px; }
  li { margin: 4px 0; }
  .section { margin-top: 20px; }
  .signature-block { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; }
  .field-row { margin: 16px 0; }
  .field-label { font-weight: bold; display: inline-block; min-width: 220px; }
  .field-line { display: inline-block; border-bottom: 1px solid #000; min-width: 260px; }
  .anchor { font-size: 1px; color: white; }
  .center { text-align: center; }
  .footer { margin-top: 48px; border-top: 1px solid #ccc; padding-top: 12px; font-size: 9pt; text-align: center; color: #555; }
</style>
</head>
<body>
<h1>AUTOLENIS DEALER PARTICIPATION AGREEMENT</h1>
<p class="center"><strong>Version 1.0</strong></p>
<p>This AutoLenis Dealer Participation Agreement (&ldquo;Agreement&rdquo;) is entered into by and between <strong>AutoLenis, Inc.</strong> (&ldquo;AutoLenis,&rdquo; &ldquo;Platform,&rdquo; &ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) and the dealership or automotive retailer identified in the signature block below (&ldquo;Dealer,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;). This Agreement governs Dealer&rsquo;s participation in the AutoLenis digital vehicle marketplace and platform.</p>
<p>By signing this Agreement electronically through DocuSign or any authorized electronic signature system, Dealer agrees to be legally bound by the terms and conditions set forth below.</p>
<div class="section"><h2>1. PLATFORM OVERVIEW</h2><p>AutoLenis operates a digital automotive marketplace that connects verified vehicle buyers with licensed automotive dealers through a structured offer system that allows dealers to submit verified out-the-door vehicle offers directly to buyers.</p><p>The Platform enables:</p><ul><li>Buyer prequalification</li><li>Reverse marketplace offer competition</li><li>Digital vehicle offer submission</li><li>Secure contract management</li><li>Electronic documentation and delivery coordination</li><li>Consumer protection monitoring</li></ul><p>Dealer&rsquo;s participation in the Platform allows Dealer to receive vehicle purchase opportunities and submit offers to buyers through the AutoLenis system.</p><p>AutoLenis does not act as a dealer, broker, or agent in vehicle transactions. All vehicle sales occur directly between Dealer and the buyer.</p></div>
<div class="section"><h2>2. DEALER ELIGIBILITY</h2><p>To participate in the Platform, Dealer must:</p><ol><li>Maintain a valid motor vehicle dealer license in each jurisdiction where vehicles are sold.</li><li>Maintain all required state, local, and federal regulatory compliance.</li><li>Maintain valid business registration and tax compliance.</li><li>Maintain any required dealer bond and insurance required by applicable law.</li><li>Maintain accurate dealership contact and ownership information.</li></ol><p>Dealer represents and warrants that all information provided to AutoLenis during onboarding and thereafter is true, accurate, and complete.</p><p>AutoLenis reserves the right to verify Dealer credentials and may suspend or terminate access if Dealer fails to maintain compliance.</p></div>
<div class="section"><h2>3. DEALER OBLIGATIONS</h2><p>Dealer agrees to:</p><ul><li>Respond to vehicle opportunities in good faith</li><li>Provide accurate vehicle availability information</li><li>Provide accurate pricing and fee disclosure</li><li>Comply with all applicable consumer protection laws</li><li>Maintain professional conduct with buyers</li></ul><p>Dealer must ensure that all vehicle offers submitted through the Platform represent genuine purchase offers that the Dealer is willing and able to honor. Dealer may not submit offers for vehicles that are not available or that cannot reasonably be delivered.</p></div>
<div class="section"><h2>4. PRICING AND OFFER ACCURACY</h2><p>All offers submitted through the AutoLenis Platform must include complete and accurate out-the-door pricing, including:</p><ul><li>Vehicle price</li><li>Dealer fees</li><li>Documentation fees</li><li>Government fees</li><li>Taxes (when applicable)</li><li>Optional add-ons (if disclosed)</li></ul><p>Dealer agrees that the price submitted through the Platform represents the actual price that will be honored for the buyer, subject only to lawful government taxes and registration adjustments.</p><p>Dealer agrees not to add undisclosed dealer fees, undisclosed accessories or protection packages, or misrepresent pricing to attract buyers.</p><p>AutoLenis may monitor and audit dealer pricing activity to protect consumers and maintain marketplace integrity.</p></div>
<div class="section"><h2>5. CONSUMER PROTECTION AND COMPLIANCE</h2><p>Dealer agrees to comply with all applicable consumer protection laws and regulations including but not limited to: Federal Trade Commission regulations, Truth in Lending Act, Equal Credit Opportunity Act, State dealer laws, State advertising rules, and Unfair and deceptive practices laws.</p><p>Dealer shall not engage in misleading, deceptive, or unfair practices when interacting with buyers obtained through the Platform. AutoLenis reserves the right to suspend or terminate dealers who violate consumer protection standards.</p></div>
<div class="section"><h2>6. PLATFORM USE</h2><p>Dealer is granted a limited, non-exclusive, revocable license to access and use the AutoLenis Platform solely for the purpose of participating in the vehicle marketplace. Dealer agrees not to copy or reproduce Platform technology, reverse engineer Platform systems, use automated bots or scraping tools, or interfere with Platform operations. All Platform intellectual property remains the exclusive property of AutoLenis.</p></div>
<div class="section"><h2>7. LEAD HANDLING AND BUYER INTERACTION</h2><p>Buyer information provided through the Platform may only be used for the purpose of completing a vehicle purchase. Dealer agrees not to sell buyer data, not to share buyer data with third parties unrelated to the transaction, and not to contact buyers outside of legitimate transaction communication. Dealer must comply with all applicable data protection and privacy laws.</p></div>
<div class="section"><h2>8. DEALER FEES</h2><p>AutoLenis may charge dealers fees associated with participation in the marketplace, including transaction fees, marketplace participation fees, and technology fees. Fee schedules may be updated by AutoLenis with reasonable notice to Dealer. Dealer agrees to pay all applicable platform fees associated with completed transactions.</p></div>
<div class="section"><h2>9. DOCUMENTATION AND RECORDKEEPING</h2><p>Dealer agrees to maintain accurate records of vehicle transactions resulting from Platform referrals. Dealer must comply with all document retention requirements imposed by law. AutoLenis may request documentation for compliance, dispute resolution, or audit purposes.</p></div>
<div class="section"><h2>10. DATA SECURITY</h2><p>Dealer must maintain reasonable administrative, technical, and physical safeguards to protect buyer data received through the Platform. Dealer must promptly notify AutoLenis of any data breach involving buyer information.</p></div>
<div class="section"><h2>11. TERM AND TERMINATION</h2><p>This Agreement begins on the date Dealer signs the Agreement. Either party may terminate this Agreement at any time. AutoLenis may suspend or terminate Dealer access immediately if Dealer violates Platform rules, engages in deceptive practices, fails compliance verification, or harms marketplace integrity. Upon termination, Dealer must immediately cease use of the Platform.</p></div>
<div class="section"><h2>12. LIMITATION OF LIABILITY</h2><p>To the maximum extent permitted by law, AutoLenis shall not be liable for lost profits, indirect damages, consequential damages, or lost business opportunities. AutoLenis provides the Platform &ldquo;as-is&rdquo; without warranties of any kind.</p></div>
<div class="section"><h2>13. INDEMNIFICATION</h2><p>Dealer agrees to defend, indemnify, and hold harmless AutoLenis and its officers, employees, and affiliates from any claims arising from Dealer conduct, Dealer pricing representations, Dealer consumer interactions, or Dealer legal violations.</p></div>
<div class="section"><h2>14. DISPUTE RESOLUTION</h2><p>Any dispute arising under this Agreement shall first be addressed through good faith negotiation between the parties. If unresolved, disputes shall be resolved through binding arbitration conducted in the State of Texas.</p></div>
<div class="section"><h2>15. GOVERNING LAW</h2><p>This Agreement shall be governed by and construed in accordance with the laws of the State of Texas, without regard to conflict of law principles.</p></div>
<div class="section"><h2>16. ELECTRONIC SIGNATURE</h2><p>The parties agree that this Agreement may be executed electronically. Electronic signatures shall have the same legal effect as handwritten signatures.</p></div>
<div class="section"><h2>17. ENTIRE AGREEMENT</h2><p>This Agreement constitutes the entire agreement between the parties regarding participation in the AutoLenis Platform and supersedes all prior agreements or understandings.</p></div>
<div class="signature-block">
<h2>DEALER SIGNATURE</h2>
<div class="field-row"><span class="field-label">Dealer Legal Name:</span><span class="anchor">\\DealerLegalName\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="field-row"><span class="field-label">Dealership Name:</span><span class="anchor">\\DealershipName\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="field-row"><span class="field-label">Dealer License Number:</span><span class="anchor">\\DealerLicense\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="field-row"><span class="field-label">Authorized Signer Name:</span><span class="anchor">\\SignerFullName\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="field-row"><span class="field-label">Authorized Signer Title:</span><span class="anchor">\\SignerTitle\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="field-row"><span class="field-label">Authorized Signer Email:</span><span class="anchor">\\SignerEmail\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="field-row" style="margin-top:32px;"><span class="field-label">Signature:</span><span class="anchor">\\DealerSignHere\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="field-row"><span class="field-label">Date:</span><span class="anchor">\\DealerDateSigned\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
</div>
<div class="signature-block">
<h2>AUTOLENIS, INC.</h2>
<div class="field-row"><span class="field-label">Authorized Representative:</span><span class="anchor">\\AutolenisRepName\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="field-row"><span class="field-label">Title:</span><span class="anchor">\\AutolenisRepTitle\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="field-row" style="margin-top:32px;"><span class="field-label">Signature:</span><span class="anchor">\\AutolenisSignHere\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="field-row"><span class="field-label">Date:</span><span class="anchor">\\AutolenisDateSigned\\</span><span class="field-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
</div>
<div class="footer"><p><strong>AutoLenis, Inc.</strong> &bull; AutoLenis Digital Marketplace Platform &bull; www.autolenis.com</p><p>End of Agreement</p></div>
</body>
</html>`

// ---------------------------------------------------------------------------
// Template creation
// ---------------------------------------------------------------------------

/**
 * Create the AutoLenis Dealer Participation Agreement template in DocuSign.
 *
 * This is a one-time provisioning operation. After the template is created,
 * store the returned templateId in DOCUSIGN_DEALER_TEMPLATE_ID.
 *
 * Recipients / roles created:
 *   - dealer_signer     (routing order 1) — Dealer authorized signer
 *   - autolenis_signer  (routing order 2) — AutoLenis counter-signer
 */
export async function createDealerAgreementTemplate(): Promise<{
  templateId: string
  name: string
}> {
  if (!isDocuSignConfigured()) {
    throw new Error("DocuSign is not configured. Set the required DOCUSIGN_* environment variables.")
  }

  const config = getDocuSignAuthConfig()
  const accessToken = await getDocuSignAccessToken()

  const docB64 = Buffer.from(DEALER_AGREEMENT_HTML).toString("base64")

  const templateBody = {
    name: "AutoLenis Dealer Participation Agreement v1.0",
    description:
      "Standard dealer participation agreement for onboarding to the AutoLenis digital vehicle marketplace.",
    shared: false,
    emailSubject: "AutoLenis Dealer Participation Agreement — Action Required",
    emailBlurb:
      "Please review and sign the AutoLenis Dealer Participation Agreement to complete your onboarding.",
    documents: [
      {
        documentId: "1",
        name: "AutoLenis Dealer Participation Agreement v1.0",
        fileExtension: "html",
        documentBase64: docB64,
      },
    ],
    recipients: {
      signers: [
        {
          recipientId: "1",
          roleName: "dealer_signer",
          routingOrder: "1",
          tabs: {
            fullNameTabs: [
              { documentId: "1", anchorString: "\\SignerFullName\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "-4", tabLabel: "SignerFullName" },
            ],
            textTabs: [
              { documentId: "1", anchorString: "\\SignerTitle\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "-4", tabLabel: "SignerTitle", required: "true" },
              { documentId: "1", anchorString: "\\DealerLegalName\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "-4", tabLabel: "DealerLegalName", required: "true" },
              { documentId: "1", anchorString: "\\DealershipName\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "-4", tabLabel: "DealershipName", required: "true" },
              { documentId: "1", anchorString: "\\DealerLicense\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "-4", tabLabel: "DealerLicenseNumber", required: "true" },
            ],
            emailTabs: [
              { documentId: "1", anchorString: "\\SignerEmail\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "-4", tabLabel: "SignerEmail" },
            ],
            signHereTabs: [
              { documentId: "1", anchorString: "\\DealerSignHere\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "0", tabLabel: "DealerSignature" },
            ],
            dateSignedTabs: [
              { documentId: "1", anchorString: "\\DealerDateSigned\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "-4", tabLabel: "DealerDateSigned" },
            ],
          },
        },
        {
          recipientId: "2",
          roleName: "autolenis_signer",
          routingOrder: "2",
          tabs: {
            fullNameTabs: [
              { documentId: "1", anchorString: "\\AutolenisRepName\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "-4", tabLabel: "AutolenisRepName" },
            ],
            textTabs: [
              { documentId: "1", anchorString: "\\AutolenisRepTitle\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "-4", tabLabel: "AutolenisRepTitle" },
            ],
            signHereTabs: [
              { documentId: "1", anchorString: "\\AutolenisSignHere\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "0", tabLabel: "AutolenisSignature" },
            ],
            dateSignedTabs: [
              { documentId: "1", anchorString: "\\AutolenisDateSigned\\", anchorUnits: "pixels", anchorXOffset: "5", anchorYOffset: "-4", tabLabel: "AutolenisDateSigned" },
            ],
          },
        },
      ],
    },
  }

  const url = `${config.basePath}/v2.1/accounts/${config.accountId}/templates`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(templateBody),
  })

  const data = await response.json()

  if (!response.ok) {
    logger.error("DocuSign template creation failed", { status: response.status, body: data })
    throw new Error(
      `DocuSign template creation failed (HTTP ${response.status}): ${JSON.stringify(data)}`,
    )
  }

  const templateId = (data as { templateId: string }).templateId
  const name = (data as { name?: string }).name ?? "AutoLenis Dealer Participation Agreement v1.0"

  logger.info("DocuSign dealer agreement template created", { templateId, name })

  return { templateId, name }
}

// ---------------------------------------------------------------------------
// Template verification
// ---------------------------------------------------------------------------

/**
 * Verify the configured dealer agreement template exists in DocuSign.
 * Returns template metadata if found.
 */
export async function verifyDealerTemplate(): Promise<{
  templateId: string
  name: string
  exists: boolean
}> {
  const templateId = process.env.DOCUSIGN_DEALER_TEMPLATE_ID
  if (!templateId) {
    return { templateId: "", name: "", exists: false }
  }

  if (!isDocuSignConfigured()) {
    return { templateId, name: "", exists: false }
  }

  try {
    const config = getDocuSignAuthConfig()
    const accessToken = await getDocuSignAccessToken()

    const url = `${config.basePath}/v2.1/accounts/${config.accountId}/templates/${templateId}`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      logger.warn("DocuSign dealer template not found", { templateId, status: response.status })
      return { templateId, name: "", exists: false }
    }

    const data = await response.json()
    return {
      templateId,
      name: data.name || "",
      exists: true,
    }
  } catch (err) {
    logger.error("DocuSign template verification failed", { error: err })
    return { templateId, name: "", exists: false }
  }
}

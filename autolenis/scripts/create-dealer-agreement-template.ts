#!/usr/bin/env tsx
/**
 * create-dealer-agreement-template.ts
 *
 * Provisions the AutoLenis Dealer Participation Agreement as a reusable
 * DocuSign template in the configured account.
 *
 * Usage:
 *   npx tsx scripts/create-dealer-agreement-template.ts
 *
 * Required env vars (same as the app):
 *   DOCUSIGN_INTEGRATION_KEY
 *   DOCUSIGN_USER_ID
 *   DOCUSIGN_ACCOUNT_ID
 *   DOCUSIGN_PRIVATE_KEY_BASE64
 *   DOCUSIGN_AUTH_SERVER   (default: account-d.docusign.com)
 *   DOCUSIGN_BASE_PATH     (default: https://demo.docusign.net/restapi)
 *
 * On success the script prints the template ID and a reminder to set:
 *   DOCUSIGN_DEALER_TEMPLATE_ID=<id>
 */

import crypto from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { DEALER_AGREEMENT_HTML } from "../lib/services/docusign/template.service"

// Load .env from project root (manual parse — avoids requiring the dotenv package)
function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env")
  try {
    const lines = readFileSync(envPath, "utf-8").split("\n")
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIdx = trimmed.indexOf("=")
      if (eqIdx < 0) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
      if (key && !(key in process.env)) process.env[key] = val
    }
  } catch {
    // .env not present — rely on existing environment
  }
}
loadDotEnv()

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY ?? ""
const USER_ID = process.env.DOCUSIGN_USER_ID ?? ""
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID ?? ""
const AUTH_SERVER = process.env.DOCUSIGN_AUTH_SERVER ?? "account-d.docusign.com"
const PRIVATE_KEY_B64 = process.env.DOCUSIGN_PRIVATE_KEY_BASE64 ?? ""
const BASE_PATH =
  process.env.DOCUSIGN_BASE_PATH ??
  process.env.DOCUSIGN_BASE_URL ??
  "https://demo.docusign.net/restapi"

function validate() {
  const missing: string[] = []
  if (!INTEGRATION_KEY) missing.push("DOCUSIGN_INTEGRATION_KEY")
  if (!USER_ID) missing.push("DOCUSIGN_USER_ID")
  if (!ACCOUNT_ID) missing.push("DOCUSIGN_ACCOUNT_ID")
  if (!PRIVATE_KEY_B64) missing.push("DOCUSIGN_PRIVATE_KEY_BASE64")
  if (missing.length) {
    console.error("❌ Missing required environment variables:", missing.join(", "))
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// JWT Auth
// ---------------------------------------------------------------------------

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function buildJwt(): string {
  const now = Math.floor(Date.now() / 1000)
  const header = { typ: "JWT", alg: "RS256" }
  const payload = {
    iss: INTEGRATION_KEY,
    sub: USER_ID,
    aud: AUTH_SERVER,
    iat: now,
    exp: now + 3600,
    scope: "signature impersonation",
  }
  const sigInput = `${base64url(Buffer.from(JSON.stringify(header)))}.${base64url(Buffer.from(JSON.stringify(payload)))}`
  const sign = crypto.createSign("RSA-SHA256")
  sign.update(sigInput)
  const privateKeyPem = Buffer.from(PRIVATE_KEY_B64, "base64").toString("utf-8")
  return `${sigInput}.${base64url(sign.sign(privateKeyPem))}`
}

async function getAccessToken(): Promise<string> {
  const res = await fetch(`https://${AUTH_SERVER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: buildJwt(),
    }).toString(),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`DocuSign JWT auth failed (${res.status}): ${txt}`)
  }
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

// ---------------------------------------------------------------------------
// Agreement HTML document
// ---------------------------------------------------------------------------

// Reuse the shared dealer agreement HTML from the DocuSign template service
// to ensure a single source of truth for the document content and anchors.
const AGREEMENT_HTML = DEALER_AGREEMENT_HTML

// ---------------------------------------------------------------------------
// Template definition
// ---------------------------------------------------------------------------

function buildTemplateBody() {
  const docB64 = Buffer.from(AGREEMENT_HTML).toString("base64")

  return {
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
        // Role 1 — Dealer
        {
          recipientId: "1",
          roleName: "dealer_signer",
          routingOrder: "1",
          tabs: {
            // Full name field (pre-fill from signer name)
            fullNameTabs: [
              {
                documentId: "1",
                anchorString: "\\SignerFullName\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "-4",
                tabLabel: "SignerFullName",
              },
            ],
            // Title text field
            textTabs: [
              {
                documentId: "1",
                anchorString: "\\SignerTitle\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "-4",
                tabLabel: "SignerTitle",
                required: "true",
              },
              {
                documentId: "1",
                anchorString: "\\DealerLegalName\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "-4",
                tabLabel: "DealerLegalName",
                required: "true",
              },
              {
                documentId: "1",
                anchorString: "\\DealershipName\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "-4",
                tabLabel: "DealershipName",
                required: "true",
              },
              {
                documentId: "1",
                anchorString: "\\DealerLicense\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "-4",
                tabLabel: "DealerLicenseNumber",
                required: "true",
              },
            ],
            // Email field
            emailTabs: [
              {
                documentId: "1",
                anchorString: "\\SignerEmail\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "-4",
                tabLabel: "SignerEmail",
              },
            ],
            // Signature
            signHereTabs: [
              {
                documentId: "1",
                anchorString: "\\DealerSignHere\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "0",
                tabLabel: "DealerSignature",
              },
            ],
            // Date signed
            dateSignedTabs: [
              {
                documentId: "1",
                anchorString: "\\DealerDateSigned\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "-4",
                tabLabel: "DealerDateSigned",
              },
            ],
          },
        },

        // Role 2 — AutoLenis counter-signer
        {
          recipientId: "2",
          roleName: "autolenis_signer",
          routingOrder: "2",
          tabs: {
            fullNameTabs: [
              {
                documentId: "1",
                anchorString: "\\AutolenisRepName\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "-4",
                tabLabel: "AutolenisRepName",
              },
            ],
            textTabs: [
              {
                documentId: "1",
                anchorString: "\\AutolenisRepTitle\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "-4",
                tabLabel: "AutolenisRepTitle",
              },
            ],
            signHereTabs: [
              {
                documentId: "1",
                anchorString: "\\AutolenisSignHere\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "0",
                tabLabel: "AutolenisSignature",
              },
            ],
            dateSignedTabs: [
              {
                documentId: "1",
                anchorString: "\\AutolenisDateSigned\\",
                anchorUnits: "pixels",
                anchorXOffset: "5",
                anchorYOffset: "-4",
                tabLabel: "AutolenisDateSigned",
              },
            ],
          },
        },
      ],
    },
  }
}

// ---------------------------------------------------------------------------
// Create template via REST API
// ---------------------------------------------------------------------------

async function createTemplate(token: string): Promise<string> {
  const url = `${BASE_PATH}/v2.1/accounts/${ACCOUNT_ID}/templates`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(buildTemplateBody()),
  })

  const body = await res.json()

  if (!res.ok) {
    console.error("DocuSign API error:", JSON.stringify(body, null, 2))
    throw new Error(`Template creation failed: HTTP ${res.status}`)
  }

  return (body as { templateId: string }).templateId
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🔐 Authenticating with DocuSign…")
  validate()

  const token = await getAccessToken()
  console.log("✅ Access token obtained")

  console.log("📄 Creating dealer agreement template…")
  const templateId = await createTemplate(token)

  console.log("\n✅ Template created successfully!")
  console.log("─────────────────────────────────────────")
  console.log(`Template ID: ${templateId}`)
  console.log("─────────────────────────────────────────")
  console.log("\nNext step — add this to your .env:")
  console.log(`DOCUSIGN_DEALER_TEMPLATE_ID=${templateId}`)
  console.log("\nTemplate roles defined:")
  console.log("  • dealer_signer    — Dealer authorized signer (routing order 1)")
  console.log("  • autolenis_signer — AutoLenis counter-signer  (routing order 2)")
}

main().catch((err) => {
  console.error("❌ Fatal error:", err instanceof Error ? err.message : err)
  process.exit(1)
})

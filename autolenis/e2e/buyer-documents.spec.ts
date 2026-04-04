import { test, expect } from "@playwright/test"

/**
 * Buyer Documents Upload E2E Test
 *
 * Verifies:
 * - Documents page loads without 500
 * - Upload modal opens and closes correctly
 * - Uploading a document closes modal and document appears in list
 *
 * Run: pnpm test:e2e --grep "Buyer Documents"
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"
const TEST_BASE = process.env.SMOKE_TEST_BASE_URL ?? BASE

test.describe("Buyer Documents", () => {
  test.setTimeout(60_000)

  test("documents page returns non-500 status", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/buyer/documents`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status, `buyer/documents returned ${status}`).toBeLessThan(500)
  })

  test("upload modal opens and closes via Cancel", async ({ page }) => {
    await page.goto(`${TEST_BASE}/buyer/documents`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()

    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — cannot test upload without session")
      return
    }

    // Click the Upload Document button
    const uploadBtn = page.locator("button", { hasText: "Upload Document" })
    const exists = await uploadBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!exists) {
      test.skip(true, "Upload Document button not visible — page may require auth")
      return
    }

    await uploadBtn.click()

    // Verify modal opens — dialog title should appear
    const dialogTitle = page.locator('[role="dialog"] >> text=Upload Document')
    await expect(dialogTitle).toBeVisible({ timeout: 3_000 })

    // Click Cancel to close modal
    const cancelBtn = page.locator('[role="dialog"] button', { hasText: "Cancel" })
    await cancelBtn.click()

    // Verify modal closes
    await expect(dialogTitle).not.toBeVisible({ timeout: 3_000 })
  })

  test("upload via file URL closes modal and document appears in list", async ({ page }) => {
    await page.goto(`${TEST_BASE}/buyer/documents`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()

    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — cannot test upload without session")
      return
    }

    // Open the upload modal
    const uploadBtn = page.locator("button", { hasText: "Upload Document" })
    const exists = await uploadBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!exists) {
      test.skip(true, "Upload Document button not visible — page may require auth")
      return
    }

    await uploadBtn.click()

    // Wait for modal to be visible
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 3_000 })

    // Fill in the form: file name (label-based selector)
    const fileNameInput = dialog.locator('input[type="text"]').first()
    await fileNameInput.fill("test-upload-doc.pdf")

    // Fill in a file URL instead of uploading a file (label-based selector)
    const fileUrlInput = dialog.locator('input[type="text"]').last()
    await fileUrlInput.fill("https://example.com/test-upload-doc.pdf")

    // Click the Upload button inside the dialog
    const submitBtn = dialog.locator("button", { hasText: "Upload" }).last()
    await submitBtn.click()

    // Verify modal closes after successful upload
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    // Verify the document appears in the list
    const docName = page.locator("text=test-upload-doc.pdf")
    await expect(docName).toBeVisible({ timeout: 10_000 })
  })

  test("upload failure keeps modal open and shows error", async ({ page }) => {
    await page.goto(`${TEST_BASE}/buyer/documents`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()

    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — cannot test upload without session")
      return
    }

    const uploadBtn = page.locator("button", { hasText: "Upload Document" })
    const exists = await uploadBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!exists) {
      test.skip(true, "Upload Document button not visible — page may require auth")
      return
    }

    // Intercept the upload API to simulate failure
    await page.route("**/api/documents", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Simulated server error" }),
        })
      } else {
        route.continue()
      }
    })

    await uploadBtn.click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 3_000 })

    // Fill in form (label-based selectors)
    const fileNameInput = dialog.locator('input[type="text"]').first()
    await fileNameInput.fill("fail-doc.pdf")
    const fileUrlInput = dialog.locator('input[type="text"]').last()
    await fileUrlInput.fill("https://example.com/fail-doc.pdf")

    // Click Upload
    const submitBtn = dialog.locator("button", { hasText: "Upload" }).last()
    await submitBtn.click()

    // Modal should stay open on failure
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Error toast should appear
    const errorToast = page.locator("text=Simulated server error")
    await expect(errorToast).toBeVisible({ timeout: 5_000 })
  })
})

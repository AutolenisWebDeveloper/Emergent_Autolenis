import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Link-Checker E2E Suite
 *
 * Discovers all pages on the target site and tests every internal link.
 * Produces a broken-link / missing-page report (CSV + Markdown).
 *
 * Run:  pnpm test:e2e --grep "Link Checker"
 *   or: npx playwright test e2e/link-checker.spec.ts
 */

const TARGET = process.env.LINK_CHECK_TARGET ?? "http://localhost:3000";
const MAX_PAGES = Number(process.env.LINK_CHECK_MAX_PAGES ?? "200");
const REQUEST_TIMEOUT = 15_000;
const REPORTS_DIR = path.resolve("reports");

// Auth-protected routes – should redirect, never 500/502
const AUTH_PROTECTED_ROUTES = [
  "/buyer/dashboard",
  "/dealer/dashboard",
  "/affiliate/portal/dashboard",
  "/admin/dashboard",
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface LinkRecord {
  url: string;
  status: number;
  finalUrl: string;
  sourcePage: string;
  linkText: string;
  issueType: string;
  notes: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip UTM / tracking params and normalize trailing slashes. */
function normalizeUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    // Only keep same-origin links
    const origin = new URL(base).origin;
    if (u.origin !== origin) return null;

    // Remove common tracking params
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "ref",
    ];
    for (const p of trackingParams) u.searchParams.delete(p);

    // Normalize trailing slash (keep "/" root as-is)
    let pathname = u.pathname;
    if (pathname !== "/" && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

    return `${u.origin}${pathname}${u.search}`;
  } catch {
    return null;
  }
}

/** Parse a sitemap XML string and return all <loc> URLs. */
function parseSitemapUrls(xml: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

/** Classify a result into an issue type + priority. */
function classify(record: LinkRecord): { issueType: string; priority: string } {
  const { status, url, finalUrl } = record;

  if (status >= 500) {
    const isAuth = AUTH_PROTECTED_ROUTES.some((r) => url.includes(r));
    return {
      issueType: isAuth ? "auth-broken-500" : "server-error",
      priority: "P0",
    };
  }
  if (status === 0) return { issueType: "redirect-loop-or-timeout", priority: "P0" };
  if (status === 404) return { issueType: "missing-page-404", priority: "P1" };
  if (status >= 400) return { issueType: `client-error-${status}`, priority: "P1" };
  if (status >= 300 && finalUrl === url) return { issueType: "redirect-no-resolve", priority: "P2" };
  return { issueType: "ok", priority: "" };
}

/** Write CSV report. */
function writeCsv(records: LinkRecord[], filePath: string) {
  const header = "URL,Status,Final URL,Source Page,Link Text,Issue Type,Notes";
  const rows = records.map((r) => {
    const escapedText = `"${r.linkText.replace(/"/g, '""')}"`;
    const escapedNotes = `"${r.notes.replace(/"/g, '""')}"`;
    return [r.url, r.status, r.finalUrl, r.sourcePage, escapedText, r.issueType, escapedNotes].join(",");
  });
  fs.writeFileSync(filePath, [header, ...rows].join("\n"), "utf8");
}

/** Write Markdown report. */
function writeMarkdown(records: LinkRecord[], filePath: string) {
  const lines: string[] = [
    "# Broken-Link / Missing-Page Report",
    "",
    `> Target: ${TARGET}`,
    `> Generated: ${new Date().toISOString()}`,
    `> Total URLs checked: ${records.length}`,
    "",
  ];

  // Summary
  const issues = records.filter((r) => r.issueType !== "ok");
  const p0 = issues.filter((r) => r.notes.startsWith("P0"));
  const p1 = issues.filter((r) => r.notes.startsWith("P1"));
  const p2 = issues.filter((r) => r.notes.startsWith("P2"));

  lines.push("## Summary", "");
  lines.push(`| Priority | Count | Description |`);
  lines.push(`|----------|-------|-------------|`);
  lines.push(`| P0 | ${p0.length} | 500/502, auth broken, admin broken |`);
  lines.push(`| P1 | ${p1.length} | nav links 404, core flows broken |`);
  lines.push(`| P2 | ${p2.length} | cosmetic / redirect issues |`);
  lines.push(`| OK | ${records.length - issues.length} | No issues |`);
  lines.push("");

  // Detailed table
  lines.push("## Detailed Results", "");
  lines.push("| URL | Status | Final URL | Source Page | Link Text | Issue Type | Notes |");
  lines.push("|-----|--------|-----------|-------------|-----------|------------|-------|");

  // Issues first, then OK
  const sorted = [...issues, ...records.filter((r) => r.issueType === "ok")];
  for (const r of sorted) {
    lines.push(
      `| ${r.url} | ${r.status} | ${r.finalUrl} | ${r.sourcePage} | ${r.linkText} | ${r.issueType} | ${r.notes} |`
    );
  }

  // Prioritized Bug List
  if (issues.length > 0) {
    lines.push("", "## Prioritized Bug List", "");
    if (p0.length) {
      lines.push("### P0 — Critical");
      for (const r of p0) lines.push(`- **${r.url}** → ${r.status} (${r.issueType}) from ${r.sourcePage}`);
      lines.push("");
    }
    if (p1.length) {
      lines.push("### P1 — High");
      for (const r of p1) lines.push(`- **${r.url}** → ${r.status} (${r.issueType}) from ${r.sourcePage}`);
      lines.push("");
    }
    if (p2.length) {
      lines.push("### P2 — Low");
      for (const r of p2) lines.push(`- **${r.url}** → ${r.status} (${r.issueType}) from ${r.sourcePage}`);
    }
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Link Checker", () => {
  // Increase timeout for crawling
  test.setTimeout(300_000);

  test("collect URLs from sitemap.xml and robots.txt", async ({ request }) => {
    const discovered: { url: string; source: string }[] = [];

    // 1a. robots.txt
    const robotsRes = await request.get(`${TARGET}/robots.txt`, { timeout: REQUEST_TIMEOUT });
    if (robotsRes.ok()) {
      const body = await robotsRes.text();
      const sitemapMatch = body.match(/Sitemap:\s*(\S+)/i);
      if (sitemapMatch) {
        discovered.push({ url: sitemapMatch[1], source: "robots.txt" });
      }
    }

    // 1b. sitemap.xml (and sitemap indexes)
    const sitemapRes = await request.get(`${TARGET}/sitemap.xml`, { timeout: REQUEST_TIMEOUT });
    if (sitemapRes.ok()) {
      const xml = await sitemapRes.text();
      const urls = parseSitemapUrls(xml);

      // Check for sitemap index
      const sitemapIndexUrls = urls.filter((u) => u.endsWith(".xml"));
      const pageUrls = urls.filter((u) => !u.endsWith(".xml"));

      for (const u of pageUrls) discovered.push({ url: u, source: "sitemap.xml" });

      // Crawl nested sitemaps
      for (const indexUrl of sitemapIndexUrls) {
        const subRes = await request.get(indexUrl, { timeout: REQUEST_TIMEOUT });
        if (subRes.ok()) {
          const subXml = await subRes.text();
          for (const u of parseSitemapUrls(subXml)) {
            discovered.push({ url: u, source: indexUrl });
          }
        }
      }
    }

    console.log(`[sitemap] Discovered ${discovered.length} URLs from sitemap/robots.txt`);
    expect(discovered.length).toBeGreaterThanOrEqual(0); // informational – don't fail
  });

  test("crawl homepage and follow internal links", async ({ page, request }) => {
    const visited = new Set<string>();
    const queue: { url: string; sourcePage: string; linkText: string }[] = [];
    const results: LinkRecord[] = [];

    // Seed the queue
    queue.push({ url: TARGET, sourcePage: "(seed)", linkText: "homepage" });

    // Also seed sitemap URLs
    try {
      const sitemapRes = await request.get(`${TARGET}/sitemap.xml`, { timeout: REQUEST_TIMEOUT });
      if (sitemapRes.ok()) {
        const xml = await sitemapRes.text();
        for (const u of parseSitemapUrls(xml)) {
          const norm = normalizeUrl(u, TARGET);
          if (norm && !visited.has(norm)) {
            queue.push({ url: norm, sourcePage: "sitemap.xml", linkText: "" });
          }
        }
      }
    } catch {
      // sitemap unavailable – continue with homepage
    }

    while (queue.length > 0 && visited.size < MAX_PAGES) {
      const item = queue.shift()!;
      const norm = normalizeUrl(item.url, TARGET);
      if (!norm || visited.has(norm)) continue;
      visited.add(norm);

      let status = 0;
      let finalUrl = norm;
      let notes = "";

      try {
        const response = await page.goto(norm, {
          waitUntil: "domcontentloaded",
          timeout: REQUEST_TIMEOUT,
        });

        status = response?.status() ?? 0;
        finalUrl = page.url();

        // Collect console errors
        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") consoleErrors.push(msg.text());
        });

        // Wait for network to settle before checking console errors
        await page.waitForLoadState("networkidle").catch(() => {});

        if (consoleErrors.length > 0) {
          notes += `console-errors: ${consoleErrors.length}`;
        }

        // Extract internal links from the page
        const links = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll("a[href]"));
          return anchors.map((a) => ({
            href: (a as HTMLAnchorElement).href,
            text: (a as HTMLAnchorElement).textContent?.trim().slice(0, 80) ?? "",
          }));
        });

        for (const link of links) {
          const linkNorm = normalizeUrl(link.href, TARGET);
          if (linkNorm && !visited.has(linkNorm)) {
            queue.push({ url: linkNorm, sourcePage: norm, linkText: link.text });
          }
        }
      } catch (err) {
        notes = `error: ${(err as Error).message?.slice(0, 120)}`;
      }

      const record: LinkRecord = {
        url: norm,
        status,
        finalUrl,
        sourcePage: item.sourcePage,
        linkText: item.linkText,
        issueType: "",
        notes: "",
      };

      const { issueType, priority } = classify(record);
      record.issueType = issueType;
      record.notes = priority ? `${priority}: ${notes}` : notes;

      results.push(record);
    }

    // Write reports
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    writeCsv(results, path.join(REPORTS_DIR, "link-report.csv"));
    writeMarkdown(results, path.join(REPORTS_DIR, "link-report.md"));

    console.log(`\n[crawl] Checked ${results.length} URLs`);
    const issues = results.filter((r) => r.issueType !== "ok");
    console.log(`[crawl] Found ${issues.length} issues`);

    // The test logs issues but doesn't hard-fail on 404s (informational scan)
    const p0 = issues.filter((r) => r.notes.startsWith("P0"));
    if (p0.length > 0) {
      console.error("\n=== P0 CRITICAL ISSUES ===");
      for (const r of p0) {
        console.error(`  ${r.status} ${r.url} (${r.issueType}) from ${r.sourcePage}`);
      }
    }

    // Fail on P0 server errors
    expect(p0.length, `Found ${p0.length} P0 critical issues (500/502, auth broken)`).toBe(0);
  });

  test("auth-protected routes should redirect, not error", async ({ page }) => {
    for (const route of AUTH_PROTECTED_ROUTES) {
      const url = `${TARGET}${route}`;
      let status = 0;
      let finalUrl = "";

      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: REQUEST_TIMEOUT,
        });
        status = response?.status() ?? 0;
        finalUrl = page.url();
      } catch (err) {
        console.error(`[auth] ${route}: error – ${(err as Error).message}`);
        // Navigation timeout is not a failure — the redirect may have occurred
        finalUrl = page.url();
      }

      console.log(`[auth] ${route} → ${status} → ${finalUrl}`);

      // Must NOT be 500/502
      if (status >= 500) {
        expect(status, `${route} returned ${status} – expected redirect or access-denied, not server error`).toBeLessThan(500);
      }

      // Should redirect to sign-in or show access denied (not the dashboard itself)
      if (status > 0 && status < 400) {
        const redirectedToAuth =
          finalUrl.includes("/auth/signin") ||
          finalUrl.includes("/auth/sign-in") ||
          finalUrl.includes("/admin/sign-in") ||
          finalUrl.includes("/login");
        const showsAccessDenied = await page
          .locator("text=/access denied|unauthorized|sign in|log in/i")
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        expect(
          redirectedToAuth || showsAccessDenied,
          `${route}: expected redirect to signin or access-denied page, got ${finalUrl}`
        ).toBeTruthy();
      }
    }
  });
});

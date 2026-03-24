#!/usr/bin/env node
/**
 * crawl-and-report.mjs
 *
 * Standalone link-checker that crawls the target site, discovers all internal
 * links, tests each URL, and produces CSV + Markdown reports.
 *
 * Usage:
 *   node scripts/crawl-and-report.mjs                        # default target
 *   LINK_CHECK_TARGET=http://localhost:3000 node scripts/crawl-and-report.mjs
 *   LINK_CHECK_MAX_PAGES=50 node scripts/crawl-and-report.mjs
 */
import fs from "node:fs";
import path from "node:path";

const TARGET = process.env.LINK_CHECK_TARGET ?? "https://www.autolenis.com";
const MAX_PAGES = Number(process.env.LINK_CHECK_MAX_PAGES ?? "200");
const REQUEST_TIMEOUT = 15_000;
const REPORTS_DIR = path.resolve("reports");

const AUTH_PROTECTED_ROUTES = [
  "/buyer/dashboard",
  "/dealer/dashboard",
  "/affiliate/portal/dashboard",
  "/admin/dashboard",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeUrl(raw, base) {
  try {
    const u = new URL(raw, base);
    const origin = new URL(base).origin;
    if (u.origin !== origin) return null;

    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "ref",
    ];
    for (const p of trackingParams) u.searchParams.delete(p);

    let pathname = u.pathname;
    if (pathname !== "/" && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    return `${u.origin}${pathname}${u.search}`;
  } catch {
    return null;
  }
}

function parseSitemapUrls(xml) {
  const urls = [];
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function parseLinksFromHtml(html, pageUrl) {
  const links = [];
  const hrefRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const norm = normalizeUrl(match[1], pageUrl);
    if (norm) {
      links.push({ url: norm, text: match[2].trim().slice(0, 80) });
    }
  }
  return links;
}

async function fetchWithRedirects(url) {
  const startTime = Date.now();
  const seen = new Set();
  let currentUrl = url;
  let status = 0;
  let body = "";

  for (let i = 0; i < 10; i++) {
    if (seen.has(currentUrl)) {
      return { status: 0, finalUrl: currentUrl, body: "", error: "redirect-loop" };
    }
    seen.add(currentUrl);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      const res = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "AutoLenis-LinkChecker/1.0" },
      });
      clearTimeout(timer);

      status = res.status;

      if (status >= 300 && status < 400) {
        const location = res.headers.get("location");
        if (location) {
          currentUrl = new URL(location, currentUrl).href;
          continue;
        }
      }

      body = await res.text();
      return { status, finalUrl: currentUrl, body, error: null };
    } catch (err) {
      const elapsed = Date.now() - startTime;
      return {
        status: 0,
        finalUrl: currentUrl,
        body: "",
        error: elapsed > REQUEST_TIMEOUT ? "timeout" : err.message,
      };
    }
  }

  return { status: 0, finalUrl: currentUrl, body: "", error: "too-many-redirects" };
}

function classify(status, url) {
  const isAuth = AUTH_PROTECTED_ROUTES.some((r) => url.includes(r));

  if (status >= 500) {
    return { issueType: isAuth ? "auth-broken-500" : "server-error", priority: "P0" };
  }
  if (status === 0) return { issueType: "redirect-loop-or-timeout", priority: "P0" };
  if (status === 404) return { issueType: "missing-page-404", priority: "P1" };
  if (status >= 400) return { issueType: `client-error-${status}`, priority: "P1" };
  return { issueType: "ok", priority: "" };
}

// ─── CSV / Markdown writers ──────────────────────────────────────────────────

function writeCsv(records, filePath) {
  const header = "URL,Status,Final URL,Source Page,Link Text,Issue Type,Notes";
  const rows = records.map(
    (r) =>
      [
        r.url,
        r.status,
        r.finalUrl,
        r.sourcePage,
        `"${r.linkText.replace(/"/g, '""')}"`,
        r.issueType,
        `"${r.notes.replace(/"/g, '""')}"`,
      ].join(",")
  );
  fs.writeFileSync(filePath, [header, ...rows].join("\n"), "utf8");
}

function writeMarkdown(records, filePath) {
  const lines = [
    "# Broken-Link / Missing-Page Report",
    "",
    `> Target: ${TARGET}`,
    `> Generated: ${new Date().toISOString()}`,
    `> Total URLs checked: ${records.length}`,
    "",
  ];

  const issues = records.filter((r) => r.issueType !== "ok");
  const p0 = issues.filter((r) => r.notes.startsWith("P0"));
  const p1 = issues.filter((r) => r.notes.startsWith("P1"));
  const p2 = issues.filter((r) => r.notes.startsWith("P2"));

  lines.push("## Summary", "");
  lines.push("| Priority | Count | Description |");
  lines.push("|----------|-------|-------------|");
  lines.push(`| P0 | ${p0.length} | 500/502, auth broken, admin broken |`);
  lines.push(`| P1 | ${p1.length} | nav links 404, core flows broken |`);
  lines.push(`| P2 | ${p2.length} | cosmetic / redirect issues |`);
  lines.push(`| OK | ${records.length - issues.length} | No issues |`);
  lines.push("");

  lines.push("## Detailed Results", "");
  lines.push("| URL | Status | Final URL | Source Page | Link Text | Issue Type | Notes |");
  lines.push("|-----|--------|-----------|-------------|-----------|------------|-------|");

  const sorted = [...issues, ...records.filter((r) => r.issueType === "ok")];
  for (const r of sorted) {
    lines.push(
      `| ${r.url} | ${r.status} | ${r.finalUrl} | ${r.sourcePage} | ${r.linkText} | ${r.issueType} | ${r.notes} |`
    );
  }

  if (issues.length > 0) {
    lines.push("", "## Prioritized Bug List", "");
    if (p0.length) {
      lines.push("### P0 — Critical");
      for (const r of p0)
        lines.push(`- **${r.url}** → ${r.status} (${r.issueType}) from ${r.sourcePage}`);
      lines.push("");
    }
    if (p1.length) {
      lines.push("### P1 — High");
      for (const r of p1)
        lines.push(`- **${r.url}** → ${r.status} (${r.issueType}) from ${r.sourcePage}`);
      lines.push("");
    }
    if (p2.length) {
      lines.push("### P2 — Low");
      for (const r of p2)
        lines.push(`- **${r.url}** → ${r.status} (${r.issueType}) from ${r.sourcePage}`);
    }
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

// ─── Main crawl loop ─────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔗 AutoLenis Link Checker`);
  console.log(`   Target: ${TARGET}`);
  console.log(`   Max pages: ${MAX_PAGES}\n`);

  const visited = new Set();
  const queue = [];
  const results = [];

  // Seed: homepage
  queue.push({ url: TARGET, sourcePage: "(seed)", linkText: "homepage" });

  // Seed: robots.txt
  try {
    const { status, body } = await fetchWithRedirects(`${TARGET}/robots.txt`);
    if (status === 200 && body) {
      console.log("[robots.txt] Found");
      const sitemapMatch = body.match(/Sitemap:\s*(\S+)/i);
      if (sitemapMatch) {
        const norm = normalizeUrl(sitemapMatch[1], TARGET);
        if (norm) queue.push({ url: norm, sourcePage: "robots.txt", linkText: "sitemap" });
      }
    }
  } catch {
    console.log("[robots.txt] Not available");
  }

  // Seed: sitemap.xml (and sitemap indexes)
  try {
    const { status, body } = await fetchWithRedirects(`${TARGET}/sitemap.xml`);
    if (status === 200 && body) {
      const urls = parseSitemapUrls(body);
      const sitemapIndexUrls = urls.filter((u) => u.endsWith(".xml"));
      const pageUrls = urls.filter((u) => !u.endsWith(".xml"));

      console.log(`[sitemap.xml] Found ${pageUrls.length} page URLs, ${sitemapIndexUrls.length} sub-sitemaps`);

      for (const u of pageUrls) {
        const norm = normalizeUrl(u, TARGET);
        if (norm) queue.push({ url: norm, sourcePage: "sitemap.xml", linkText: "" });
      }

      for (const indexUrl of sitemapIndexUrls) {
        const sub = await fetchWithRedirects(indexUrl);
        if (sub.status === 200) {
          for (const u of parseSitemapUrls(sub.body)) {
            const norm = normalizeUrl(u, TARGET);
            if (norm) queue.push({ url: norm, sourcePage: indexUrl, linkText: "" });
          }
        }
      }
    }
  } catch {
    console.log("[sitemap.xml] Not available");
  }

  // Seed: auth-protected routes (always test these)
  for (const route of AUTH_PROTECTED_ROUTES) {
    const url = normalizeUrl(route, TARGET);
    if (url) queue.push({ url, sourcePage: "(auth-check)", linkText: route });
  }

  console.log(`\n[crawl] Starting with ${queue.length} seed URLs...\n`);

  // Crawl
  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const item = queue.shift();
    const norm = normalizeUrl(item.url, TARGET);
    if (!norm || visited.has(norm)) continue;
    visited.add(norm);

    const { status, finalUrl, body, error } = await fetchWithRedirects(norm);

    const { issueType, priority } = classify(status, norm);
    const notes = priority
      ? `${priority}: ${error ?? ""}`
      : error ?? "";

    results.push({
      url: norm,
      status,
      finalUrl,
      sourcePage: item.sourcePage,
      linkText: item.linkText,
      issueType,
      notes,
    });

    // Status indicator
    const icon = issueType === "ok" ? "✓" : "✗";
    process.stdout.write(`  ${icon} ${status || "ERR"} ${norm}\n`);

    // Extract links from successful HTML responses
    if (status >= 200 && status < 400 && body) {
      const links = parseLinksFromHtml(body, norm);
      for (const link of links) {
        if (!visited.has(link.url)) {
          queue.push({ url: link.url, sourcePage: norm, linkText: link.text });
        }
      }
    }
  }

  // Write reports
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const csvPath = path.join(REPORTS_DIR, "link-report.csv");
  const mdPath = path.join(REPORTS_DIR, "link-report.md");

  writeCsv(results, csvPath);
  writeMarkdown(results, mdPath);

  // Print summary
  const issues = results.filter((r) => r.issueType !== "ok");
  const p0 = issues.filter((r) => r.notes.startsWith("P0"));
  const p1 = issues.filter((r) => r.notes.startsWith("P1"));
  const p2 = issues.filter((r) => r.notes.startsWith("P2"));

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  LINK CHECK COMPLETE`);
  console.log(`  Total checked:  ${results.length}`);
  console.log(`  P0 (critical):  ${p0.length}`);
  console.log(`  P1 (high):      ${p1.length}`);
  console.log(`  P2 (low):       ${p2.length}`);
  console.log(`  OK:             ${results.length - issues.length}`);
  console.log(`${"═".repeat(60)}`);
  console.log(`\n  Reports saved to:`);
  console.log(`    CSV:      ${csvPath}`);
  console.log(`    Markdown: ${mdPath}\n`);

  // Auth-protected route check
  console.log("  Auth-protected routes:");
  for (const route of AUTH_PROTECTED_ROUTES) {
    const fullUrl = normalizeUrl(route, TARGET);
    const record = results.find((r) => r.url === fullUrl);
    if (record) {
      const ok = record.status < 500;
      console.log(`    ${ok ? "✓" : "✗"} ${route} → ${record.status} → ${record.finalUrl}`);
    } else {
      console.log(`    ? ${route} (not reached)`);
    }
  }

  // Exit with non-zero if P0 issues found
  if (p0.length > 0) {
    console.error(`\n[FAIL] ${p0.length} P0 critical issues found.\n`);
    process.exit(1);
  }

  console.log("\n[OK] No critical issues found.\n");
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});

import fs from "node:fs";
import path from "node:path";

function fail(msg) {
  console.error(`\n[FAIL] ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[OK] ${msg}`);
}

const APP_DIR = "app";
if (!fs.existsSync(APP_DIR)) fail(`No ${APP_DIR}/ directory found.`);

const EXCLUDE_PREFIXES = [
  "http://",
  "https://",
  "mailto:",
  "tel:",
  "#",
];

const IGNORE_ROUTES = new Set([
  "/_next",
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function toRouteFromPageFile(pageFile) {
  // app/foo/bar/page.tsx => /foo/bar
  const rel = pageFile.replaceAll("\\", "/").replace(/^app\//, "").replace(/\/page\.(t|j)sx?$/, "");
  if (!rel) return "/";
  return "/" + rel;
}

function normalizeRoute(route) {
  if (route !== "/" && route.endsWith("/")) return route.slice(0, -1);
  return route;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function routeToMatcher(route) {
  // Turn /dealer/inventory/[id]/edit => regex that matches /dealer/inventory/<anything>/edit
  const parts = route.split("/").filter(Boolean).map((p) => {
    if (p.startsWith("[") && p.endsWith("]")) return "[^/]+";
    return escapeRegex(p);
  });
  return new RegExp("^/" + parts.join("/") + "$");
}

const files = walk(APP_DIR);

// 1) Collect routes (from page.tsx)
const pageFiles = files.filter((f) => /\/page\.(t|j)sx?$/.test(f.replaceAll("\\", "/")));
const routes = pageFiles.map(toRouteFromPageFile).map(normalizeRoute);
const routeMatchers = routes.map(routeToMatcher);

// 2) Collect internal links from source files
const sourceFiles = files.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
const hrefRegex = /href\s*=\s*["'](\/[^"']*)["']/g;
const pushRegex = /router\.push\(\s*["'](\/[^"']*)["']\s*\)/g;

const foundLinks = [];

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, "utf8");
  for (const re of [hrefRegex, pushRegex]) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const target = m[1];
      foundLinks.push({ file, target });
    }
  }
}

// Filter links: internal only, ignore external prefixes, ignore query/hash parts
const internalLinks = foundLinks
  .map(({ file, target }) => {
    const cleaned = target.split("?")[0].split("#")[0];
    return { file, target: normalizeRoute(cleaned) };
  })
  .filter(({ target }) => !EXCLUDE_PREFIXES.some((p) => target.startsWith(p)))
  .filter(({ target }) => target.startsWith("/"))
  .filter(({ target }) => !IGNORE_ROUTES.has(target));

function routeExists(link) {
  if (routes.includes(link)) return true;
  return routeMatchers.some((re) => re.test(link));
}

const missing = [];
for (const { file, target } of internalLinks) {
  if (!routeExists(target)) {
    missing.push({ file: file.replaceAll("\\", "/"), target });
  }
}

ok(`Discovered ${routes.length} routes from app/**/page.tsx`);
ok(`Scanned ${internalLinks.length} internal links from source`);

if (missing.length) {
  console.error("\nMissing routes for internal links:\n");
  for (const item of missing.slice(0, 60)) {
    console.error(`- ${item.target}  (from ${item.file})`);
  }
  if (missing.length > 60) console.error(`\n...and ${missing.length - 60} more`);
  fail(`Found ${missing.length} internal links that do not map to existing routes.`);
}

ok("All internal links map to existing routes (including dynamic routes).");

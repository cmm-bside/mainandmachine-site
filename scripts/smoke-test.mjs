#!/usr/bin/env node
// Post-deploy smoke test — one build everywhere.
// Fetches every URL in the LIVE sitemap and fails if any page serves a marker
// from the old (pre-redesign) build, is missing the current topbar banner, or
// if /book/ lost its load-bearing elements. Run against production:
//
//   npm run smoke:test                       (defaults to the live site)
//   BASE_URL=https://preview.example node scripts/smoke-test.mjs
import { COMPANY } from "../src/data/company.mjs";
import { ASSET_VERSION, PROXIED_ROUTES } from "./lib/config.mjs";

const BASE = process.env.BASE_URL || COMPANY.origin;
const errors = [];
const fail = (m) => errors.push(m);

// Markers that only ever existed in the old build.
const OLD_BUILD_MARKERS = ["limited slots", 'href="/#work"', "<title>Book an Assessment"];
// Every current non-blog page carries this banner; blog pages carry their own.
const CURRENT_BANNER = 'class="ticker"';
const BLOG_BANNER = "free essays, a few times a month";
// These current conversion pages deliberately use a quieter header.
const CONVERSION_MARKERS = {
  "/": ['id="home-work-title"', 'href="/plan/"', 'class="home-sample-preview"', 'data-cta="hero-sample"'],
  "/plan/": ['id="workflow"', 'id="plan-faq-title"'],
  "/plan/sample/": ['id="plan-title"', 'class="sample-plan', 'src="/js/pa"'],
};

async function get(url) {
  const res = await fetch(url, { headers: { "cache-control": "no-cache" }, redirect: "manual" });
  return { status: res.status, body: res.status === 200 ? await res.text() : "" };
}

const sitemap = await get(`${BASE}/sitemap.xml`);
if (sitemap.status !== 200) {
  console.error(`[smoke:test] FAILED — sitemap.xml returned ${sitemap.status}`);
  process.exit(1);
}
const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(COMPANY.origin, BASE));
console.log(`[smoke:test] ${urls.length} URLs in live sitemap`);

for (const url of urls) {
  const route = url.replace(BASE, "") || "/";
  const { status, body } = await get(url);
  if (status !== 200) {
    fail(`${route}: HTTP ${status}`);
    continue;
  }
  for (const marker of OLD_BUILD_MARKERS) {
    if (body.includes(marker)) fail(`${route}: serves OLD build marker "${marker}"`);
  }
  const isBlog = route.startsWith("/blog");
  const isLegal = ["/privacy/", "/terms/"].includes(route);
  // The proxied score tool has its own deployment and asset versions.
  if (!PROXIED_ROUTES.includes(route) && !body.includes(`/styles.css?v=${ASSET_VERSION}`))
    fail(`${route}: missing current stylesheet version ${ASSET_VERSION} — possibly a stale copy`);
  if (CONVERSION_MARKERS[route]) {
    for (const marker of CONVERSION_MARKERS[route]) {
      if (!body.includes(marker)) fail(`${route}: missing current conversion-page element ${marker}`);
    }
  }
  if (!isBlog && !isLegal && !CONVERSION_MARKERS[route] && !body.includes(CURRENT_BANNER))
    fail(`${route}: missing current banner "${CURRENT_BANNER}" — possibly a stale copy`);
  if (isBlog && !route.includes(".xml") && !body.includes(BLOG_BANNER) && !body.includes(CURRENT_BANNER))
    fail(`${route}: missing expected topbar banner`);
}

// Apex must redirect to www — a stale copy can't hide on the bare domain.
for (const [route, markers] of Object.entries({
  "/pricing/": ['id="scope-examples"', 'data-cta="pricing-no-call"'],
  "/services/": ['How is the free plan different from a paid audit?', 'data-cta="page-hero-book"'],
  "/book/": ['id="calPrivacy"', 'aria-describedby="calPrivacy"'],
  "/services/builds/instant-lead-response/": ['data-cta="build-page-hero-book"', 'href="/plan/"'],
})) {
  const result = await get(`${BASE}${route}`);
  for (const marker of markers) if (!result.body.includes(marker)) fail(`${route}: missing release marker ${marker}`);
}

if (BASE === COMPANY.origin) {
  const apex = await fetch("https://mainandmachine.com/book/", { redirect: "manual" });
  const loc = apex.headers.get("location") || "";
  if (![301, 308].includes(apex.status) || !loc.startsWith(COMPANY.origin))
    fail(`apex /book/: expected 301/308 → ${COMPANY.origin}, got ${apex.status} → ${loc}`);
}

// /book/ load-bearing elements (FAQ 01 regression + the named advisor).
const book = await get(`${BASE}/book/`);
for (const s of ["Is it really free?", "Fair questions.", "What happens · 30 minutes", "Who actually shows up to the call?", "Christopher Myers", 'id="calEmbed"', 'id="assessForm"']) {
  if (!book.body.includes(s)) fail(`/book/: missing "${s}"`);
}
// Six FAQ items since 2026-07 — keep in lockstep with scripts/check-book.mjs.
const nums = [...book.body.matchAll(/<summary><span class="q-no">(\d{2})<\/span>/g)].map((m) => m[1]);
if (nums.join(",") !== "01,02,03,04,05,06") fail(`/book/: FAQ numbering is [${nums.join(",")}], expected [01..06]`);

if (errors.length) {
  console.error(`[smoke:test] FAILED with ${errors.length} issue(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`[smoke:test] OK — one build everywhere; ${urls.length} routes verified against ${BASE}.`);

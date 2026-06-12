#!/usr/bin/env node
// Post-deploy smoke test — one build everywhere.
// Fetches every URL in the LIVE sitemap and fails if any page serves a marker
// from the old (pre-redesign) build, is missing the current topbar banner, or
// if /book/ lost its load-bearing elements. Run against production:
//
//   npm run smoke:test                       (defaults to the live site)
//   BASE_URL=https://preview.example node scripts/smoke-test.mjs
import { COMPANY } from "../src/data/company.mjs";

const BASE = process.env.BASE_URL || COMPANY.origin;
const errors = [];
const fail = (m) => errors.push(m);

// Markers that only ever existed in the old build.
const OLD_BUILD_MARKERS = ["limited slots", 'href="/#work"', "<title>Book an Assessment"];
// Every current non-blog page carries this banner; blog pages carry their own.
const CURRENT_BANNER = "Now booking Q3 builds";
const BLOG_BANNER = "free weekly essays";

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
  if (!isBlog && !isLegal && !body.includes(CURRENT_BANNER))
    fail(`${route}: missing current banner "${CURRENT_BANNER}" — possibly a stale copy`);
  if (isBlog && !route.includes(".xml") && !body.includes(BLOG_BANNER) && !body.includes(CURRENT_BANNER))
    fail(`${route}: missing expected topbar banner`);
}

// /book/ load-bearing elements (FAQ 01 regression + the named advisor).
const book = await get(`${BASE}/book/`);
for (const s of ["Is it really free?", "Fair questions.", "What happens · 30 minutes", "Who you'll talk to", "Christopher Myers"]) {
  if (!book.body.includes(s)) fail(`/book/: missing "${s}"`);
}
const nums = [...book.body.matchAll(/<summary><span class="q-no">(\d{2})<\/span>/g)].map((m) => m[1]);
if (nums.join(",") !== "01,02,03,04,05") fail(`/book/: FAQ numbering is [${nums.join(",")}], expected [01..05]`);

if (errors.length) {
  console.error(`[smoke:test] FAILED with ${errors.length} issue(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`[smoke:test] OK — one build everywhere; ${urls.length} routes verified against ${BASE}.`);

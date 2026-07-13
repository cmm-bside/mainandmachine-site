#!/usr/bin/env node
// Internal link checker — crawls sitemap.xml plus every internal href found
// on those pages, and reports status codes and redirect hops. The contract:
// every SITEMAP URL answers 200 directly (no redirect), and every INTERNAL
// LINK resolves in at most one hop (one hop only for deliberate permanent
// redirects like /report/* rescues — chains of 2+ always fail).
//
//   node scripts/check-links.mjs [origin]     default: https://www.mainandmachine.com
import { setTimeout as delay } from "node:timers/promises";

const ORIGIN = (process.argv[2] || "https://www.mainandmachine.com").replace(/\/+$/, "");
const UA = "mm-linkcheck/1.0";
const CONCURRENCY = 8;

async function fetchStatus(url, method = "GET") {
  const res = await fetch(url, { method, redirect: "manual", headers: { "User-Agent": UA } });
  // Drain small bodies so connections recycle cleanly.
  try { await res.arrayBuffer(); } catch { /* streaming errors don't matter here */ }
  return res;
}

// Follow redirects manually, recording each hop.
async function trace(url, maxHops = 5) {
  const hops = [];
  let cur = url;
  for (let i = 0; i <= maxHops; i++) {
    const res = await fetchStatus(cur);
    hops.push({ url: cur, status: res.status });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      cur = new URL(loc, cur).href;
      continue;
    }
    break;
  }
  return hops;
}

function extractInternalHrefs(html) {
  const out = new Set();
  for (const m of html.matchAll(/href="([^"#]+)(#[^"]*)?"/g)) {
    const href = m[1];
    if (href.startsWith("/") && !href.startsWith("//")) out.add(href.split("?")[0]);
    else if (href.startsWith(ORIGIN)) out.add(new URL(href).pathname);
  }
  return out;
}

const SKIP = [/^\/cdn-cgi\//, /^\/js\//, /^\/blog-data\//, /\.(xml|txt|png|ico|css|js|webp|svg|pdf)$/];

// --- 1. sitemap URLs --------------------------------------------------------
const sitemapXml = await (await fetch(`${ORIGIN}/sitemap.xml`, { headers: { "User-Agent": UA } })).text();
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

// --- 2. internal hrefs from every sitemap page -------------------------------
const linkSources = new Map(); // path -> first page it was seen on
const pagePool = [...sitemapUrls];
async function harvest() {
  while (pagePool.length) {
    const page = pagePool.pop();
    try {
      const res = await fetch(page, { headers: { "User-Agent": UA } });
      if (!(res.headers.get("content-type") || "").includes("text/html")) continue;
      for (const path of extractInternalHrefs(await res.text())) {
        if (SKIP.some((re) => re.test(path))) continue;
        if (!linkSources.has(path)) linkSources.set(path, page.replace(ORIGIN, ""));
      }
    } catch { /* page fetch failure surfaces below via sitemap check */ }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, harvest));

// --- 3. check everything ------------------------------------------------------
const targets = new Map(); // url -> {kind, seenOn}
for (const u of sitemapUrls) targets.set(u, { kind: "sitemap" });
for (const [path, seenOn] of linkSources) {
  const u = ORIGIN + path;
  if (!targets.has(u)) targets.set(u, { kind: "link", seenOn });
}

const rows = [];
const queue = [...targets.entries()];
async function worker() {
  while (queue.length) {
    const [u, meta] = queue.pop();
    const hops = await trace(u);
    rows.push({ url: u, ...meta, hops });
    await delay(15);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// --- report -------------------------------------------------------------------
rows.sort((a, b) => a.url.localeCompare(b.url));
let bad = 0;
const fmt = (h) => h.map((x) => x.status).join(" → ");
for (const r of rows) {
  const final = r.hops[r.hops.length - 1];
  const redirects = r.hops.length - 1;
  const ok =
    final.status === 200 &&
    (r.kind === "sitemap" ? redirects === 0 : redirects <= 1);
  if (!ok) {
    bad++;
    console.log(`FAIL  [${r.kind}] ${r.url.replace(ORIGIN, "")}  ${fmt(r.hops)}${r.seenOn ? `  (seen on ${r.seenOn})` : ""}`);
    for (const h of r.hops.slice(1)) console.log(`        ↳ ${h.url.replace(ORIGIN, "")}`);
  }
}
const oneHop = rows.filter((r) => r.hops.length === 2 && r.hops[1].status === 200);
console.log(`\n[links:check] ${rows.length} URLs (${sitemapUrls.length} sitemap + ${rows.length - sitemapUrls.length} discovered links) — ${rows.length - bad} OK, ${bad} failing`);
if (oneHop.length) {
  console.log(`  one-hop permanent redirects (allowed for links, listed for review):`);
  for (const r of oneHop) console.log(`    ${r.url.replace(ORIGIN, "")}  ${fmt(r.hops)}  → ${r.hops[1].url.replace(ORIGIN, "")}`);
}
process.exit(bad ? 1 : 0);

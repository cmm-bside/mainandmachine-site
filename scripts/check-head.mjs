#!/usr/bin/env node
// Per-page <head> consistency audit. Walks every publishable HTML page and
// checks title/description/canonical/h1/OG+Twitter/JSON-LD, plus cross-page
// title & description collisions. Exits non-zero on any error so it can gate
// CI or a pre-commit hook.
//
//   npm run head:check
//
// Image "resolution" is checked against the deploy tree on disk (same-origin
// and relative image URLs must map to a real file) — no network, so it is
// deterministic in CI. External image hosts are reported but not failed.
//
// Two severities:
//   ERROR   — structural defects (missing/duplicate/broken tags, bad canonical,
//             unresolved images, JSON-LD parse/@id, cross-page collisions).
//             These ALWAYS exit non-zero — wire this into CI / a pre-commit hook.
//   WARNING — advisory SEO length limits (title >60, description <70 / >160).
//             Reported but do not fail the build, UNLESS run with --strict
//             (or HEAD_CHECK_STRICT=1), which promotes warnings to errors.
import fs from "node:fs";
import path from "node:path";
import { ROOT, SITE_ORIGIN } from "./lib/config.mjs";

const STRICT = process.argv.includes("--strict") || process.env.HEAD_CHECK_STRICT === "1";

// --- SEO length thresholds -------------------------------------------------
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

// Required social tags.
const OG_REQUIRED = ["og:title", "og:description", "og:image", "og:url", "og:type"];
const TW_REQUIRED = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"];

// Dirs that never contain publishable site pages.
const IGNORE_TOP = new Set([
  "node_modules", "scratchpad", "src", "scripts", "functions",
  "emails", "reports", "audit", "blog-data", "images", "js", ".git",
]);

const errors = [];
const warnings = [];
const fail = (page, msg) => errors.push(`${page}: ${msg}`);
const warn = (page, msg) => warnings.push(`${page}: ${msg}`);

// --- enumerate pages: every index.html on disk + 404.html ------------------
function walk(dir, prefix = "") {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (prefix === "" && IGNORE_TOP.has(name)) continue;
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) out.push(...walk(fp, prefix + "/" + name));
    else if (name === "index.html") out.push({ file: fp, route: (prefix || "") + "/" });
  }
  return out;
}
const pages = walk(ROOT);
const fourOhFour = path.join(ROOT, "404.html");
if (fs.existsSync(fourOhFour)) pages.push({ file: fourOhFour, route: null }); // no indexable URL

// --- helpers ---------------------------------------------------------------
const rel = (file) => path.relative(ROOT, file);
const matchAll = (re, s) => [...s.matchAll(re)];
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function metaContent(html, attr, val) {
  // <meta name="x" content="y"> or <meta property="x" content="y"> (attr order agnostic)
  const re = new RegExp(`<meta[^>]*\\b${attr}=["']${val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "gi");
  return matchAll(re, html).map((m) => {
    const c = m[0].match(/\bcontent=["']([^"']*)["']/i);
    return c ? c[1] : "";
  });
}

function imageResolves(page, label, url) {
  if (!url) return;
  let p = null;
  if (url.startsWith(SITE_ORIGIN)) p = url.slice(SITE_ORIGIN.length);
  else if (url.startsWith("/")) p = url;
  else if (/^https?:\/\//i.test(url)) { return; } // external host — not verifiable offline
  else p = "/" + url;
  const fp = path.join(ROOT, p.split("#")[0].split("?")[0]);
  if (!fs.existsSync(fp)) fail(page, `${label} image does not resolve to a file: ${url}`);
}

// --- per-page audit --------------------------------------------------------
const titles = new Map();       // title text -> [pages]
const descriptions = new Map(); // desc text  -> [pages]

for (const { file, route } of pages) {
  const page = rel(file);
  const html = fs.readFileSync(file, "utf8");

  // 1. <title>
  const titleTags = matchAll(/<title>([\s\S]*?)<\/title>/gi, html);
  if (titleTags.length === 0) fail(page, "missing <title>");
  else {
    if (titleTags.length > 1) fail(page, `${titleTags.length} <title> tags (expected 1)`);
    const title = decode(titleTags[0][1].trim());
    if (!title) fail(page, "empty <title>");
    if (title.length > TITLE_MAX) warn(page, `<title> ${title.length} chars > ${TITLE_MAX}: "${title}"`);
    if (title) (titles.get(title) || titles.set(title, []).get(title)).push(page);
  }

  // 2. meta description
  const descs = metaContent(html, "name", "description");
  if (descs.length === 0) fail(page, "missing meta description");
  else {
    if (descs.length > 1) fail(page, `${descs.length} meta descriptions (expected 1)`);
    const d = decode(descs[0].trim());
    if (!d) fail(page, "empty meta description");
    else {
      if (d.length < DESC_MIN) warn(page, `meta description ${d.length} chars < ${DESC_MIN}: "${d}"`);
      if (d.length > DESC_MAX) warn(page, `meta description ${d.length} chars > ${DESC_MAX}: "${d}"`);
      (descriptions.get(d) || descriptions.set(d, []).get(d)).push(page);
    }
  }

  // 3. canonical: exactly one, self-referential, canonical URL form
  const canon = matchAll(/<link[^>]*\brel=["']canonical["'][^>]*>/gi, html)
    .map((m) => (m[0].match(/\bhref=["']([^"']+)["']/i) || [])[1]);
  if (route !== null) { // 404 has no indexable canonical URL
    if (canon.length === 0) fail(page, "missing canonical");
    else if (canon.length > 1) fail(page, `${canon.length} canonical tags (expected 1)`);
    else {
      const expected = SITE_ORIGIN + route;
      if (canon[0] !== expected) fail(page, `canonical "${canon[0]}" != self "${expected}"`);
    }
  }

  // 4. exactly one <h1>
  const h1s = matchAll(/<h1\b[^>]*>/gi, html);
  if (h1s.length === 0) fail(page, "missing <h1>");
  else if (h1s.length > 1) fail(page, `${h1s.length} <h1> tags (expected 1)`);

  // 5 + 6. OG + Twitter presence and image resolution.
  // Skipped for 404 (a noindex error page that is never shared socially).
  if (route !== null) {
    for (const tag of OG_REQUIRED) if (metaContent(html, "property", tag).length === 0) fail(page, `missing ${tag}`);
    for (const tag of TW_REQUIRED) {
      // twitter:* may use name= or property=
      if (metaContent(html, "name", tag).length === 0 && metaContent(html, "property", tag).length === 0)
        fail(page, `missing ${tag}`);
    }
    imageResolves(page, "og:image", (metaContent(html, "property", "og:image")[0] || "").trim());
    const tw = (metaContent(html, "name", "twitter:image")[0] || metaContent(html, "property", "twitter:image")[0] || "").trim();
    imageResolves(page, "twitter:image", tw);
  }

  // 7. JSON-LD parses + no duplicate @id across the page's graph
  const blocks = matchAll(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi, html);
  const ids = new Set();
  for (const [, raw] of blocks) {
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { fail(page, `JSON-LD does not parse (${e.message})`); continue; }
    (function visit(n) {
      if (Array.isArray(n)) return n.forEach(visit);
      if (n && typeof n === "object") {
        if (n["@type"] && typeof n["@id"] === "string") {
          if (ids.has(n["@id"])) fail(page, `duplicate @id in graph: ${n["@id"]}`);
          ids.add(n["@id"]);
        }
        for (const v of Object.values(n)) visit(v);
      }
    })(parsed);
  }
}

// --- 8. cross-page collisions ---------------------------------------------
for (const [title, pgs] of titles)
  if (pgs.length > 1) fail("(cross-page)", `duplicate <title> on ${pgs.length} pages [${pgs.join(", ")}]: "${title}"`);
for (const [desc, pgs] of descriptions)
  if (pgs.length > 1) fail("(cross-page)", `duplicate meta description on ${pgs.length} pages [${pgs.join(", ")}]: "${desc}"`);

// --- report ----------------------------------------------------------------
// In --strict mode, length warnings are promoted to errors.
if (STRICT && warnings.length) { errors.push(...warnings.splice(0)); }

if (warnings.length) {
  console.warn(`[head:check] ${warnings.length} warning(s) (advisory — not failing; run with --strict to enforce):`);
  for (const w of warnings) console.warn("  ⚠ " + w);
}
if (errors.length) {
  console.error(`[head:check] FAILED with ${errors.length} error(s) across ${pages.length} page(s):`);
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log(`[head:check] OK — ${pages.length} page(s) pass title/description/canonical/h1/OG/Twitter/JSON-LD + no cross-page collisions${warnings.length ? ` (${warnings.length} advisory warning(s) above)` : ""}.`);

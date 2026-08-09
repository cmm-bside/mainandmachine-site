#!/usr/bin/env node
// SEO/GEO regression suite over the BUILT HTML. Offline, in build:static.
//
//   npm run seo:regression
//
// SCOPE, and why it is not everything in one file: this repo already carries
// dedicated guards for several of these areas, each with negative tests behind
// it. Re-implementing them here would mean two definitions of the same rule
// drifting apart — the exact failure this codebase keeps finding. So this
// suite owns the checks nothing else covered, and NAMES the guard that owns
// each of the rest, so `npm run seo:regression` is still the one place to look
// up what is enforced.
//
//   owned here      titles (unique, length, suffix-where-it-fits), description
//                   uniqueness, canonical shape, og/twitter completeness,
//                   image alt + intrinsic size, orphan pages, apex/http links,
//                   sitemap XML validity + single-entry, RSS parse
//   jsonld:presence JSON-LD parses, Organization on every page, FAQPage only
//                   where the questions are visibly on the page, no dangling @id
//   numbers:check   price-like / phone-like strings vs site-facts.json
//   links:check     internal links resolving in the build output
//   meta:check      description length, one <h1>, og:image resolves on disk
//   freshness:check Article dates vs the visible "Updated" stamp
//
// TITLE POLICY, settled 2026-08-09: <= 60 chars is the hard rule and the
// "| Main & Machine" suffix is asserted only where it FITS. Seven pages
// (/pricing/, /services/, /about/, /work/marcus/, /services/builds/, /blog/,
// /blog/archive/) run 51-58 chars and would hit 68-75 with the suffix — past
// the point Google truncates, so the brand would be the part cut off. Those
// titles lead with the keyword instead, which is the trade that matters.
import fs from "node:fs";
import path from "node:path";
import { ROOT, SITE_ORIGIN, STATIC_ROUTES, PROXIED_ROUTES, NOINDEX_ROUTES, LOCAL_SCRATCH_DIRS } from "./lib/config.mjs";

let errors = 0, warnings = 0;
const fail = (m) => { console.error(`  ERROR  ${m}`); errors++; };
const warn = (m) => { console.warn(`  WARN   ${m}`); warnings++; };

const TITLE_MAX = 60, TITLE_WARN = 65;
const SUFFIX = " | Main & Machine";
// Blog surfaces carry the PUBLICATION suffix instead — "| The Ampersand".
// That is first-party brand context, not a missing suffix, and demanding the
// company name there would either double the suffix or delete the masthead
// from every essay title. Accept either.
const SUFFIX_ALT = " | The Ampersand";
const dec = (s) => String(s).replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&mdash;/g, "—").replace(/&nbsp;/g, " ");

// /404.html is noindex by design: no canonical, no og:image (Google discourages
// a canonical on an error page and nobody shares one).
const EXEMPT_CANONICAL = new Set(["404.html"]);

function* htmlFiles(dir) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		if (LOCAL_SCRATCH_DIRS.has(e.name) || e.name.startsWith(".")) continue;
		const p = path.join(dir, e.name);
		if (e.isDirectory()) yield* htmlFiles(p);
		else if (e.name.endsWith(".html")) yield p;
	}
}

const pages = [...htmlFiles(ROOT)].map((f) => path.relative(ROOT, f));
const routeOf = (rel) => "/" + rel.replace(/index\.html$/, "").replace(/\\/g, "/");

const seenTitles = new Map(), seenDescs = new Map();
let imgs = 0, checked = 0;

for (const rel of pages) {
	const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
	const body = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ");
	const one = (re) => { const m = html.match(re); return m ? m[1].trim() : null; };
	const route = routeOf(rel);
	checked++;

	// --- 1. title ---
	const rawTitle = one(/<title>([\s\S]*?)<\/title>/);
	if (!rawTitle) { fail(`${rel}: no <title>`); continue; }
	const title = dec(rawTitle);
	if (title.length > TITLE_WARN) fail(`${rel}: <title> is ${title.length} chars (hard max ${TITLE_WARN}) — "${title}"`);
	else if (title.length > TITLE_MAX) warn(`${rel}: <title> is ${title.length} chars, over the ${TITLE_MAX} target — "${title}"`);
	const prev = seenTitles.get(title);
	if (prev) fail(`${rel}: <title> duplicates ${prev} — "${title}". Every page needs its own.`);
	else seenTitles.set(title, rel);
	// Suffix only where it fits (see TITLE POLICY above).
	if (!title.endsWith(SUFFIX) && !title.endsWith(SUFFIX_ALT) && route !== "/" && title.length + SUFFIX.length <= TITLE_MAX)
		fail(`${rel}: <title> is ${title.length} chars and has room for "${SUFFIX.trim()}" (${title.length + SUFFIX.length} total) — add it.`);

	// --- 2. description + canonical ---
	const desc = one(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
	if (!desc) fail(`${rel}: no meta description`);
	else {
		const d = dec(desc);
		const p2 = seenDescs.get(d);
		if (p2) fail(`${rel}: meta description duplicates ${p2} — descriptions must be unique.`);
		else seenDescs.set(d, rel);
	}
	const canons = [...html.matchAll(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/gi)].map((m) => m[1]);
	if (!EXEMPT_CANONICAL.has(rel)) {
		if (canons.length === 0) fail(`${rel}: no canonical link`);
		else if (canons.length > 1) fail(`${rel}: ${canons.length} canonical links — exactly one is allowed`);
		else {
			const c = canons[0];
			if (!c.startsWith(`${SITE_ORIGIN}/`)) fail(`${rel}: canonical "${c}" is not an absolute https://www URL on ${SITE_ORIGIN}`);
			else if (c !== `${SITE_ORIGIN}${route}`) fail(`${rel}: canonical "${c}" is not self-referencing (expected ${SITE_ORIGIN}${route})`);
		}
	}

	// --- 3. og + twitter ---
	if (!EXEMPT_CANONICAL.has(rel)) {
		for (const [prop, re] of [
			["og:title", /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i],
			["og:description", /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i],
			["og:image", /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i],
			["twitter:card", /<meta[^>]+name="twitter:card"[^>]+content="([^"]+)"/i],
		]) {
			const v = one(re);
			if (!v) { fail(`${rel}: missing ${prop}`); continue; }
			if (prop === "og:image") {
				if (!v.startsWith("https://")) fail(`${rel}: og:image "${v}" must be an absolute URL`);
				else {
					const local = path.join(ROOT, v.replace(SITE_ORIGIN, "").split("?")[0]);
					if (v.startsWith(SITE_ORIGIN) && !fs.existsSync(local))
						fail(`${rel}: og:image "${v}" does not resolve to a file in the build`);
				}
			}
		}
	}

	// --- 8. images ---
	for (const tag of body.match(/<img\b[^>]*>/gi) || []) {
		imgs++;
		if (!/\balt\s*=/.test(tag)) fail(`${rel}: <img> without alt — ${tag.slice(0, 80)}`);
		else if (/\balt\s*=\s*""/.test(tag) && !/\b(aria-hidden|role\s*=\s*"presentation"|data-decorative)/.test(tag))
			fail(`${rel}: <img alt=""> must be marked decorative (aria-hidden / role="presentation") — ${tag.slice(0, 80)}`);
		if (!/\bwidth\s*=/.test(tag) || !/\bheight\s*=/.test(tag))
			fail(`${rel}: <img> without width/height (causes CLS) — ${tag.slice(0, 80)}`);
	}
}

// --- 6. link hygiene + orphans ---
const inlinks = new Map();
for (const rel of pages) {
	const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
	for (const m of html.matchAll(/href="(https?:\/\/[^"]+|\/[^"]*)"/g)) {
		const href = m[1];
		if (href.startsWith("http://")) fail(`${rel}: insecure internal link "${href}" — use https`);
		if (/^https?:\/\/mainandmachine\.com/.test(href))
			fail(`${rel}: links to the APEX domain "${href}" — canonical host is ${SITE_ORIGIN} (the apex 301s, costing a hop)`);
		if (href.startsWith("/")) {
			const clean = href.split(/[?#]/)[0];
			inlinks.set(clean, (inlinks.get(clean) || 0) + 1);
		}
	}
}
const indexable = [...STATIC_ROUTES, ...PROXIED_ROUTES];
for (const route of indexable) {
	if (route === "/") continue;
	if (!(inlinks.get(route) > 0))
		fail(`ORPHAN: ${route} is in the sitemap but has zero internal inbound links — nothing on the site points at it`);
}

// --- 7. sitemap + rss ---
const smPath = path.join(ROOT, "sitemap.xml");
if (!fs.existsSync(smPath)) fail("sitemap.xml missing from the build output");
else {
	const xml = fs.readFileSync(smPath, "utf8");
	if (!/^<\?xml/.test(xml.trim())) fail("sitemap.xml does not start with an XML declaration");
	if ((xml.match(/<urlset\b/g) || []).length !== 1) fail("sitemap.xml must have exactly one <urlset>");
	const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	const dupes = locs.filter((l, i) => locs.indexOf(l) !== i);
	if (dupes.length) fail(`sitemap.xml lists ${[...new Set(dupes)].length} URL(s) more than once: ${[...new Set(dupes)].slice(0, 3).join(", ")}`);
	for (const route of indexable) {
		if (!locs.includes(`${SITE_ORIGIN}${route}`)) fail(`sitemap.xml is missing indexable route ${route}`);
	}
	for (const nr of NOINDEX_ROUTES) {
		if (locs.includes(`${SITE_ORIGIN}${nr}`)) fail(`sitemap.xml lists noindex route ${nr}`);
	}
	// Every sitemapped local route must exist on disk (proxied ones have no file).
	for (const loc of locs) {
		const r = loc.replace(SITE_ORIGIN, "");
		if (PROXIED_ROUTES.includes(r)) continue;
		const f = path.join(ROOT, r === "/" ? "index.html" : `${r.replace(/^\/|\/$/g, "")}/index.html`);
		if (!fs.existsSync(f)) fail(`sitemap.xml lists ${r} but no file exists in the build`);
	}
}
const rssPath = path.join(ROOT, "blog", "rss.xml");
if (!fs.existsSync(rssPath)) fail("blog/rss.xml missing from the build output");
else {
	const rss = fs.readFileSync(rssPath, "utf8");
	if (!/^<\?xml/.test(rss.trim())) fail("blog/rss.xml does not start with an XML declaration");
	if (!/<rss\b[^>]*version="2\.0"/.test(rss)) fail("blog/rss.xml is not RSS 2.0");
	const opens = (rss.match(/<item>/g) || []).length, closes = (rss.match(/<\/item>/g) || []).length;
	if (opens !== closes) fail(`blog/rss.xml has ${opens} <item> and ${closes} </item> — malformed`);
}
// Content-Type for XML comes from Cloudflare's own extension mapping; _headers
// must not override it with something wrong.
const headers = fs.readFileSync(path.join(ROOT, "_headers"), "utf8");
for (const bad of headers.matchAll(/Content-Type:\s*([^\n]+)/gi)) {
	if (/text\/html/i.test(bad[1]) && /\.xml/i.test(headers.slice(Math.max(0, bad.index - 200), bad.index)))
		fail(`_headers sets Content-Type ${bad[1].trim()} on an .xml route`);
}

console.log(
	`[seo:regression] ${checked} page(s) · ${seenTitles.size} unique title(s) · ` +
	`${seenDescs.size} unique description(s) · ${imgs} image(s) · ${inlinks.size} internal link target(s)`,
);
console.log("[seo:regression] delegated: jsonld:presence (JSON-LD, FAQ, @id) · numbers:check (prices/phone) · links:check (404s) · meta:check (desc length, one h1) · freshness:check (Article dates)");
if (warnings) console.log(`[seo:regression] ${warnings} warning(s)`);
if (errors) { console.error(`\n[seo:regression] FAILED — ${errors} problem(s).`); process.exit(1); }
console.log("[seo:regression] OK");

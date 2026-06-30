#!/usr/bin/env node
// Post-build SEO checks. Validates the prerendered output against the
// generated index so a broken template fails the deploy instead of shipping.
import fs from "node:fs";
import path from "node:path";
import {
	ROOT,
	SITE_ORIGIN,
	BLOG_DIR,
	ARCHIVE_DIR,
	RSS_PATH,
	SITEMAP_PATH,
	BLOG_INDEX_JSON,
	EXCLUDED_POST_SLUGS,
	STATIC_ROUTES,
} from "./lib/config.mjs";

const errors = [];
const fail = (m) => errors.push(m);

function read(file) {
	try {
		return fs.readFileSync(file, "utf8");
	} catch {
		return null;
	}
}

function loadIndex() {
	try {
		const all = JSON.parse(fs.readFileSync(BLOG_INDEX_JSON, "utf8")).posts || [];
		// Mirror the build's exclusion so expectations match the generated output.
		const excluded = new Set(EXCLUDED_POST_SLUGS.map((s) => s.toLowerCase()));
		return all.filter((p) => p && p.slug && !excluded.has(String(p.slug).toLowerCase()));
	} catch {
		return [];
	}
}

const posts = loadIndex();

// --- /blog ---------------------------------------------------------------
const home = read(path.join(BLOG_DIR, "index.html"));
if (!home) fail("blog/index.html missing");
else {
	if (!/<title>[^<]+<\/title>/.test(home)) fail("/blog: missing <title>");
	if (!home.includes(`<link rel="canonical" href="${SITE_ORIGIN}/blog/"`))
		fail("/blog: missing/incorrect canonical");
	if (!/"@type":\s*"Blog"/.test(home)) fail("/blog: missing Blog JSON-LD");
}

// --- /blog/archive -------------------------------------------------------
const archive = read(path.join(ARCHIVE_DIR, "index.html"));
if (!archive) fail("blog/archive/index.html missing");
else {
	if (!archive.includes(`<link rel="canonical" href="${SITE_ORIGIN}/blog/archive/"`))
		fail("/blog/archive: missing/incorrect canonical");
	if (!/"@type":\s*"CollectionPage"/.test(archive))
		fail("/blog/archive: missing CollectionPage JSON-LD");
}

// --- each post -----------------------------------------------------------
for (const p of posts) {
	const file = path.join(BLOG_DIR, p.slug, "index.html");
	const html = read(file);
	if (!html) {
		fail(`post ${p.slug}: index.html missing`);
		continue;
	}
	const h1s = (html.match(/<h1[\s>]/g) || []).length;
	if (h1s !== 1) fail(`post ${p.slug}: expected exactly 1 <h1>, found ${h1s}`);
	if (!html.includes(`<link rel="canonical" href="${SITE_ORIGIN}${p.url}"`))
		fail(`post ${p.slug}: missing/incorrect canonical`);
	if (!/"@type":\s*"BlogPosting"/.test(html))
		fail(`post ${p.slug}: missing BlogPosting JSON-LD`);
}

// --- RSS -----------------------------------------------------------------
const rss = read(RSS_PATH);
if (!rss) fail("blog/rss.xml missing");
else {
	if (!rss.startsWith("<?xml")) fail("rss: missing XML declaration");
	if (!/<rss[\s>]/.test(rss)) fail("rss: missing <rss> root");
	const items = (rss.match(/<item>/g) || []).length;
	if (items !== posts.length)
		fail(`rss: item count ${items} != post count ${posts.length}`);
}

// --- sitemap -------------------------------------------------------------
const sitemap = read(SITEMAP_PATH);
if (!sitemap) fail("sitemap.xml missing");
else {
	for (const route of ["/blog/", "/blog/archive/", ...posts.map((p) => p.url)]) {
		if (!sitemap.includes(`<loc>${SITE_ORIGIN}${route}</loc>`))
			fail(`sitemap: missing entry for ${route}`);
	}
}

// --- STATIC_ROUTES <-> disk parity (anti-drift guard) --------------------
// The sitemap is generated from STATIC_ROUTES, so a new page that isn't added
// to STATIC_ROUTES silently never gets sitemapped, and a route whose file was
// deleted/renamed becomes a sitemap 404. Fail the build on either, plus on any
// stale page-dates.json key (a date for a route that no longer exists).
function routeToIndex(route) {
	return route === "/" ? "index.html" : route.replace(/^\//, "") + "index.html";
}
// every STATIC_ROUTE must have a real file
for (const route of STATIC_ROUTES) {
	if (!fs.existsSync(path.join(ROOT, routeToIndex(route))))
		fail(`sitemap drift: STATIC_ROUTES has "${route}" but ${routeToIndex(route)} does not exist (would 404)`);
}
// every public page on disk must be declared in STATIC_ROUTES
const IGNORE_TOP = new Set(["node_modules", "scratchpad", "blog", "reports", "audit", "emails", "images", "blog-data", "src", "scripts", "functions", "js"]);
const staticSet = new Set(STATIC_ROUTES);
(function walk(dir, prefix) {
	for (const name of fs.readdirSync(dir)) {
		if (prefix === "" && IGNORE_TOP.has(name)) continue;
		const fp = path.join(dir, name);
		const st = fs.statSync(fp);
		if (st.isDirectory()) walk(fp, prefix + "/" + name);
		else if (name === "index.html") {
			const route = (prefix || "") + "/";
			if (!staticSet.has(route))
				fail(`sitemap drift: ${path.relative(ROOT, fp)} exists but route "${route}" is not in STATIC_ROUTES (missing from sitemap)`);
		}
	}
})(ROOT, "");
// page-dates.json must not carry dates for routes that no longer exist
try {
	const pageDates = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "page-dates.json"), "utf8"));
	for (const r of Object.keys(pageDates))
		if (!staticSet.has(r)) fail(`page-dates.json: stale key "${r}" (not in STATIC_ROUTES) — re-run \`npm run seo:dates\``);
} catch { /* page-dates.json optional */ }

if (errors.length) {
	console.error(`[seo:check] FAILED with ${errors.length} issue(s):`);
	for (const e of errors) console.error("  - " + e);
	process.exit(1);
}
console.log(`[seo:check] OK — ${posts.length} post(s), home, archive, rss, sitemap all valid.`);

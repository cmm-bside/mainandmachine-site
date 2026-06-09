#!/usr/bin/env node
// Post-build SEO checks. Validates the prerendered output against the
// generated index so a broken template fails the deploy instead of shipping.
import fs from "node:fs";
import path from "node:path";
import {
	SITE_ORIGIN,
	BLOG_DIR,
	ARCHIVE_DIR,
	RSS_PATH,
	SITEMAP_PATH,
	BLOG_INDEX_JSON,
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
		return JSON.parse(fs.readFileSync(BLOG_INDEX_JSON, "utf8")).posts || [];
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
	if (!home.includes(`<link rel="canonical" href="${SITE_ORIGIN}/blog"`))
		fail("/blog: missing/incorrect canonical");
	if (!/"@type":\s*"Blog"/.test(home)) fail("/blog: missing Blog JSON-LD");
}

// --- /blog/archive -------------------------------------------------------
const archive = read(path.join(ARCHIVE_DIR, "index.html"));
if (!archive) fail("blog/archive/index.html missing");
else {
	if (!archive.includes(`<link rel="canonical" href="${SITE_ORIGIN}/blog/archive"`))
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
	for (const route of ["/blog", "/blog/archive", ...posts.map((p) => p.url)]) {
		if (!sitemap.includes(`<loc>${SITE_ORIGIN}${route}</loc>`))
			fail(`sitemap: missing entry for ${route}`);
	}
}

if (errors.length) {
	console.error(`[seo:check] FAILED with ${errors.length} issue(s):`);
	for (const e of errors) console.error("  - " + e);
	process.exit(1);
}
console.log(`[seo:check] OK — ${posts.length} post(s), home, archive, rss, sitemap all valid.`);

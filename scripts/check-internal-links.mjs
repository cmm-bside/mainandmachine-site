#!/usr/bin/env node
// Offline internal-link integrity, run against the build output before deploy.
//
//   npm run links:check
//
// Distinct from scripts/check-links.mjs, which crawls the LIVE origin over the
// network to audit redirect hops after a deploy. This one touches no network,
// so it is deterministic enough to gate the build.
//
// Every same-origin href in committed HTML must resolve to something the
// deploy actually serves: a file in the build output, a proxied route, or a
// blog post that really exists in the fetched index.
//
// Why it exists: ~22 hardcoded /blog/<slug>/ links live in the guides and
// industry pages, pointing at essays the blog pipeline generates at deploy
// time. Nothing connected the two. When the 2026-07-31 audit found the beehiiv
// fetch had silently returned zero posts, every one of those links was a 404
// and the build was still green. Two fatal shapes:
//
//   dangling — an href whose target is neither on disk nor in the blog index
//   fixture  — the blog index is EMPTY while committed pages link to posts,
//              meaning the fetch failed and the site is about to ship with its
//              entire essay archive missing
import fs from "node:fs";
import path from "node:path";
import {
	ROOT,
	SITE_ORIGIN,
	BLOG_INDEX_JSON,
	PROXIED_ROUTES,
	LOCAL_SCRATCH_DIRS,
} from "./lib/config.mjs";

const errors = [];
const fail = (m) => errors.push(m);

// --- the blog index the pipeline produced ----------------------------------
let blogMeta = {};
let blogSlugs = new Set();
let blogIndexRead = false;
try {
	const raw = JSON.parse(fs.readFileSync(BLOG_INDEX_JSON, "utf8"));
	blogMeta = raw.meta || {};
	blogSlugs = new Set((raw.posts || []).map((p) => p && p.slug).filter(Boolean));
	blogIndexRead = true;
} catch {
	/* handled below — an unreadable index is itself a failure once posts are linked */
}

// --- enumerate committed HTML ----------------------------------------------
// The generated blog output is excluded: it is rebuilt from the same index we
// validate against, so checking it would only restate this script's premise.
const SKIP = new Set([
	...LOCAL_SCRATCH_DIRS,
	"blog", // generated
	"emails",
	"src",
	"scripts",
	"functions",
	"blog-data",
]);

const pages = [];
(function walk(dir, top = true) {
	for (const name of fs.readdirSync(dir)) {
		if (top && SKIP.has(name)) continue;
		if (name.startsWith(".")) continue;
		const fp = path.join(dir, name);
		if (fs.statSync(fp).isDirectory()) walk(fp, false);
		else if (name.endsWith(".html")) pages.push(fp);
	}
})(ROOT);

// --- resolution ------------------------------------------------------------
const proxied = new Set(PROXIED_ROUTES);

// Routes the blog pipeline always emits that are not post slugs.
const BLOG_NON_POST = new Set(["/blog/", "/blog/archive/", "/blog/rss.xml"]);

function resolvesOnDisk(urlPath) {
	if (urlPath === "/") return fs.existsSync(path.join(ROOT, "index.html"));
	const rel = urlPath.replace(/^\//, "");
	// Directory-style route → its index.html; file-style route → the file.
	if (urlPath.endsWith("/")) return fs.existsSync(path.join(ROOT, rel, "index.html"));
	return (
		fs.existsSync(path.join(ROOT, rel)) ||
		fs.existsSync(path.join(ROOT, rel, "index.html")) ||
		fs.existsSync(path.join(ROOT, rel + ".html"))
	);
}

const HREF_RE = /\b(?:href|action)=["']([^"']+)["']/gi;
let checked = 0;
let blogPostLinks = 0;
const dangling = new Map(); // target -> Set(pages)
const note = (target, page) =>
	(dangling.get(target) || dangling.set(target, new Set()).get(target)).add(page);

for (const file of pages) {
	const page = path.relative(ROOT, file);
	const html = fs.readFileSync(file, "utf8");
	for (const [, rawHref] of html.matchAll(HREF_RE)) {
		let href = rawHref.trim();
		// Same-origin absolute URLs are internal links wearing a hostname.
		if (href.startsWith(SITE_ORIGIN)) href = href.slice(SITE_ORIGIN.length) || "/";
		if (!href.startsWith("/")) continue; // external, mailto:, tel:, #frag, relative
		if (href.startsWith("//")) continue; // protocol-relative → external
		const target = href.split("#")[0].split("?")[0];
		if (!target || target === "/") continue;
		checked++;

		if (proxied.has(target)) continue; // served by a proxy, no local file
		if (BLOG_NON_POST.has(target)) continue; // always emitted by blog:build

		const blogPost = /^\/blog\/([a-z0-9-]+)\/$/.exec(target);
		if (blogPost) {
			blogPostLinks++;
			if (!blogSlugs.has(blogPost[1])) note(target, page);
			continue;
		}

		if (!resolvesOnDisk(target)) note(target, page);
	}
}

// --- fixture-shipping guard -------------------------------------------------
// A zero-post index with live post links means the fetch failed. Report that
// root cause instead of ~22 identical dangling-link errors.
const postCount = blogSlugs.size;
if (blogPostLinks > 0 && postCount === 0) {
	fail(
		blogIndexRead
			? `blog-data/index.json reports ${blogMeta.count ?? 0} posts, but committed pages link to ` +
					`${blogPostLinks} /blog/<slug>/ URL(s) — the beehiiv fetch returned nothing and every ` +
					`essay link would 404. Check BEEHIIV_API_KEY / BEEHIIV_PUBLICATION_ID. Do not deploy this build.`
			: `blog-data/index.json is missing or unreadable, but committed pages link to ` +
					`${blogPostLinks} /blog/<slug>/ URL(s) — run \`npm run blog:fetch\` first.`
	);
}
for (const [target, pgs] of [...dangling].sort(([a], [b]) => a.localeCompare(b)))
	fail(`dangling link ${target} — referenced by ${[...pgs].sort().join(", ")}`);

if (errors.length) {
	console.error(`[links:check] FAILED with ${errors.length} issue(s):`);
	for (const e of errors) console.error("  - " + e);
	process.exit(1);
}
console.log(
	`[links:check] OK — ${checked} internal link(s) across ${pages.length} page(s) resolve ` +
		`(${blogPostLinks} pointing at ${postCount} live blog post(s)).`
);

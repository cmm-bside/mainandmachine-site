#!/usr/bin/env node
/**
 * Build guard: the metadata every page needs to render correctly in a search
 * result and a share card. Runs in build:static — offline, no dependencies.
 *
 * Per page:
 *   title        present, <= 60 decoded characters
 *   description  present, 110-155 decoded characters
 *   canonical    present
 *   og:image     present, absolute, and RESOLVING TO A REAL FILE on disk
 *   h1           exactly one
 *
 * Lengths are measured DECODED, so `&amp;` counts as the one character it
 * renders as rather than five. head:check already does this for titles; getting
 * it wrong here would report every page carrying "Main &amp; Machine" as four
 * characters longer than Google sees it.
 *
 * The og:image file check is the one that earns its place. Six pages shipped
 * with a bespoke card sitting unused in images/og/ while the HTML still pointed
 * at the generic /og-image.png — every one of them "had an og:image", so a
 * presence-only check was green the whole time. Presence was never the failure
 * mode; pointing at the wrong file was. Resolving the URL to a path on disk
 * also catches the opposite error, a card that was renamed or never rendered.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, LOCAL_SCRATCH_DIRS, SITE_ORIGIN } from "./lib/config.mjs";
import { SCORE_TITLE, SCORE_DESCRIPTION, SCORE_OG_IMAGE, SEO_HEAD_HTML } from "../lib/score-proxy.mjs";

const TITLE_MAX = 60;
const DESC_MIN = 110;
const DESC_MAX = 155;

/**
 * Documented exemptions. An allowlist, keyed by route, with the reason inline —
 * a bare skip list becomes a place to hide failures.
 */
const EXEMPT = {
	"/404.html": {
		canonical: "a 404 must not be indexed, and Google explicitly discourages a canonical on one",
		ogImage: "an error page is never deliberately shared, so it carries no card",
	},
};

const decode = (s) =>
	String(s)
		.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/gi, "'")
		.replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&nbsp;/g, " ")
		.replace(/&middot;/g, "·").replace(/&hellip;/g, "…")
		.replace(/&rsquo;/g, "’").replace(/&lsquo;/g, "‘")
		.replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”");

// Comments and <script>/<style> are stripped before counting h1s: a commented-out
// heading or a heading inside a JSON-LD string is not a heading on the page.
const strip = (html) =>
	html.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

const pages = [];
(function walk(d) {
	for (const e of fs.readdirSync(d, { withFileTypes: true })) {
		if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "emails") continue;
		if (d === ROOT && LOCAL_SCRATCH_DIRS.has(e.name)) continue;
		const f = path.join(d, e.name);
		if (e.isDirectory()) walk(f);
		else if (e.name.endsWith(".html")) pages.push(f);
	}
})(ROOT);
pages.sort();

const routeOf = (f) => {
	const rel = "/" + path.relative(ROOT, f).split(path.sep).join("/");
	return rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel;
};

/** Absolute og:image URL -> the file it must resolve to, or null if off-site. */
function localFileFor(url) {
	if (!url) return null;
	if (url.startsWith(SITE_ORIGIN)) return path.join(ROOT, url.slice(SITE_ORIGIN.length));
	if (url.startsWith("/")) return path.join(ROOT, url);
	return null;
}

const rows = [];
let failures = 0;

for (const file of pages) {
	const route = routeOf(file);
	const raw = fs.readFileSync(file, "utf8");
	const html = strip(raw);
	const ex = EXEMPT[route] || {};
	const problems = [];

	const titleM = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
	const title = titleM ? decode(titleM[1]).trim() : null;
	if (!title) problems.push("no <title>");
	else if (title.length > TITLE_MAX) problems.push(`title ${title.length} > ${TITLE_MAX}`);

	const descM = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html);
	const desc = descM ? decode(descM[1]).trim() : null;
	if (!desc) problems.push("no meta description");
	else if (desc.length < DESC_MIN || desc.length > DESC_MAX) {
		problems.push(`description ${desc.length} outside ${DESC_MIN}-${DESC_MAX}`);
	}

	const canon = /<link\s+rel="canonical"\s+href="([^"]*)"/i.exec(html);
	if (!canon && !ex.canonical) problems.push("no canonical");

	const ogM = /<meta\s+property="og:image"\s+content="([^"]*)"/i.exec(html);
	const og = ogM ? ogM[1] : null;
	if (!og) {
		if (!ex.ogImage) problems.push("no og:image");
	} else {
		const local = localFileFor(og);
		if (!local) problems.push(`og:image is off-site: ${og}`);
		else if (!fs.existsSync(local)) problems.push(`og:image does not resolve to a file: ${og}`);
	}

	const h1s = (html.match(/<h1[\s>]/gi) || []).length;
	if (h1s !== 1) problems.push(`${h1s} <h1> (need exactly 1)`);

	if (problems.length) failures++;
	rows.push({
		route,
		title: title ? title.length : "—",
		desc: desc ? desc.length : "—",
		canon: canon ? "yes" : (ex.canonical ? "exempt" : "NO"),
		og: og ? (og.split("/").pop()) : (ex.ogImage ? "exempt" : "NO"),
		h1: h1s,
		problems,
	});
}

/**
 * /score/ has no HTML in this repo — it is proxied from the Score app, and its
 * head is assembled in lib/score-proxy.mjs. Linting only files on disk would
 * leave the one route this pass was opened for permanently unchecked, so the
 * proxy's constants are held to the same rules.
 */
{
	const problems = [];
	if (SCORE_TITLE.length > TITLE_MAX) problems.push(`title ${SCORE_TITLE.length} > ${TITLE_MAX}`);
	if (SCORE_DESCRIPTION.length < DESC_MIN || SCORE_DESCRIPTION.length > DESC_MAX) {
		problems.push(`description ${SCORE_DESCRIPTION.length} outside ${DESC_MIN}-${DESC_MAX}`);
	}
	const local = localFileFor(SCORE_OG_IMAGE);
	if (!local || !fs.existsSync(local)) problems.push(`og:image does not resolve to a file: ${SCORE_OG_IMAGE}`);
	// The proxy builds this head as a raw string and HTMLRewriter appends it with
	// html:true, escaping nothing. SCORE_TITLE ends "| Main & Machine", so a bare
	// & lands inside an attribute value — invalid HTML, and the kind of thing a
	// strict OG parser drops the whole tag over.
	//
	// ONLY the <meta>/<link> tags. The ld+json blocks in the same string carry
	// raw "Main & Machine" inside their JSON, and that is CORRECT: script content
	// is raw text, not parsed for character references. Escaping it there would
	// put a literal "&amp;" into the company name every consumer reads.
	for (const tag of SEO_HEAD_HTML.split("\n").filter((l) => /^<(meta|link)\b/i.test(l))) {
		for (const bad of tag.match(/&(?!amp;|lt;|gt;|quot;|#\d+;)/g) || []) {
			problems.push(`unescaped "${bad}" in: ${tag.slice(0, 70)}`);
		}
	}
	if (problems.length) failures++;
	rows.push({
		route: "/score/ (proxied)",
		title: SCORE_TITLE.length, desc: SCORE_DESCRIPTION.length,
		canon: "yes", og: SCORE_OG_IMAGE.split("/").pop(), h1: "—", problems,
	});
}

/* ---- table ------------------------------------------------------------- */
const w = Math.max(28, ...rows.map((r) => r.route.length)) + 2;
const pad = (s, n) => String(s).padEnd(n);
const padl = (s, n) => String(s).padStart(n);

console.log(`\nMETA CHECK — ${rows.length} pages\n`);
console.log(`${pad("route", w)}${padl("title", 6)}${padl("desc", 6)}  ${pad("canon", 7)}${pad("og:image", 30)}${padl("h1", 3)}  status`);
console.log("-".repeat(w + 6 + 6 + 2 + 7 + 30 + 3 + 9));
for (const r of rows) {
	console.log(
		pad(r.route, w) + padl(r.title, 6) + padl(r.desc, 6) + "  " +
		pad(r.canon, 7) + pad(r.og, 30) + padl(r.h1, 3) + "  " +
		(r.problems.length ? "FAIL" : "ok"),
	);
}

if (failures) {
	console.error(`\n${failures} page(s) failed:\n`);
	for (const r of rows.filter((x) => x.problems.length)) {
		console.error(`  ✗ ${r.route}`);
		for (const p of r.problems) console.error(`      ${p}`);
	}
	console.error(`\nTitles <= ${TITLE_MAX}, descriptions ${DESC_MIN}-${DESC_MAX} (decoded), canonical + og:image present, one h1.\n`);
	process.exit(1);
}
console.log(`\nAll ${rows.length} pages pass.\n`);

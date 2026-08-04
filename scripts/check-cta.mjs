#!/usr/bin/env node
/**
 * Build guard: the booking funnel cannot go dark without the build saying so.
 *
 * WHY. Placement used to be INFERRED from a link's ancestor classes in
 * js/analytics.js, and inference fails silently in both directions — a link in
 * an unrecognised container fired nothing, and `.hero__cta` (a shared CTA-row
 * wrapper) labelled 30 pre-footer CTAs as "hero". Nothing objected either way;
 * the dashboard simply under-reported and mislabelled for as long as it did.
 * `data-cta` in the markup fixes that, but only while every link carries one —
 * so a new CTA added without the attribute has to fail the build, not quietly
 * fall back.
 *
 * Offline and dependency-free, so unlike test:funnel it runs in build:static.
 *
 * Checks:
 *   1. every internal /book link in committed HTML carries a non-empty data-cta
 *   2. the three blog-chrome links in templates.mjs carry theirs (blog pages are
 *      generated, so the stamper never sees them)
 *   3. /book/ still maps all three Calendly postMessage names to Plausible
 *      events, and still checks the origin — the funnel's middle is exactly
 *      what a well-meaning refactor drops without anyone noticing
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, LOCAL_SCRATCH_DIRS } from "./lib/config.mjs";

const errors = [];

/* ---- 1. every /book link in committed HTML is stamped ------------------- */
const pages = [];
(function walk(d) {
	for (const e of fs.readdirSync(d, { withFileTypes: true })) {
		if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "emails") continue;
		if (d === ROOT && LOCAL_SCRATCH_DIRS.has(e.name)) continue;
		// blog/ is generated from templates.mjs, which check 2 covers.
		if (d === ROOT && e.name === "blog") continue;
		const f = path.join(d, e.name);
		if (e.isDirectory()) walk(f);
		else if (e.name.endsWith(".html")) pages.push(f);
	}
})(ROOT);

const OPEN_TAG = /<a\b[^>]*\bhref="\/book[^"]*"[^>]*>/gi;
let stamped = 0;
const seen = new Set();

for (const file of pages) {
	const src = fs.readFileSync(file, "utf8");
	const lines = src.split("\n");
	for (const [i, line] of lines.entries()) {
		for (const tag of line.match(OPEN_TAG) || []) {
			const m = tag.match(/\bdata-cta="([^"]*)"/);
			if (!m || !m[1].trim()) {
				errors.push(`${path.relative(ROOT, file)}:${i + 1}  booking CTA has no data-cta\n      ${tag.slice(0, 110)}`);
			} else { stamped++; seen.add(m[1]); }
		}
	}
}

/* ---- 2. the generated blog chrome ------------------------------------- */
const tpl = fs.readFileSync(path.join(ROOT, "scripts", "lib", "templates.mjs"), "utf8");
for (const tag of tpl.match(OPEN_TAG) || []) {
	if (!/\bdata-cta="[^"]+"/.test(tag)) {
		errors.push(`scripts/lib/templates.mjs  blog-chrome booking CTA has no data-cta\n      ${tag.slice(0, 110)}`);
	}
}
for (const want of ["ticker", "nav", "footer"]) {
	if (!new RegExp(`data-cta="${want}"`).test(tpl)) {
		errors.push(`scripts/lib/templates.mjs  blog chrome is missing the "${want}" booking CTA — it must match the static pages`);
	}
}

/* ---- 3. /book/ still maps the whole funnel ---------------------------- */
const book = fs.readFileSync(path.join(ROOT, "book", "index.html"), "utf8");
const REQUIRED = [
	["origin guard", /e\.origin\s*!==\s*'https:\/\/calendly\.com'/],
	["calendly.event_type_viewed → calendly_widget_viewed", /'calendly\.event_type_viewed'\s*:\s*'calendly_widget_viewed'/],
	["calendly.date_and_time_selected → calendly_time_selected", /'calendly\.date_and_time_selected'\s*:\s*'calendly_time_selected'/],
	["calendly.event_scheduled → calendly_booked", /calendly\.event_scheduled[\s\S]{0,1600}plausible\('calendly_booked'/],
	["namespace check on the event name", /indexOf\('calendly\.'\)\s*!==\s*0/],
	["duplicate-include latch", /window\.__mmBooking/],
];
for (const [what, re] of REQUIRED) {
	if (!re.test(book)) errors.push(`book/index.html  the funnel lost its ${what}`);
}

/* ---- report ----------------------------------------------------------- */
if (errors.length) {
	console.error("\nCTA CHECK — FAILED\n");
	for (const e of errors) console.error(`  ✗ ${e}`);
	console.error(`\n${errors.length} problem(s). Run \`npm run cta:stamp\` to stamp new booking links.\n`);
	process.exit(1);
}
console.log(`cta:check — ${stamped} booking CTAs stamped across ${pages.length} pages; ` +
	`${seen.size} distinct placements (${[...seen].sort().join(", ")}); /book/ funnel intact.`);

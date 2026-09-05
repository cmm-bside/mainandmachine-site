#!/usr/bin/env node
// Generate src/data/page-dates.json — the real last-modified date (YYYY-MM-DD)
// of each static route, taken from the last git commit that changed main
// content or SEO metadata. Shared navigation and cache edits do not count.
//
// Run this LOCALLY (where full git history exists) whenever static pages
// change: `npm run seo:dates`. The result is committed and read by the sitemap
// builder at deploy time, so sitemap <lastmod> stays accurate even on
// Cloudflare's shallow clone (which can't run `git log` per file reliably).
//
// Dates only ever move FORWARD: if git returns nothing for a file (e.g. a brand
// new uncommitted page), the previously recorded date is kept rather than
// stamping "today" on everything.
import fs from "node:fs";
import path from "node:path";
import { ROOT, STATIC_ROUTES } from "./lib/config.mjs";
import { lastEditorialCommitDate } from "./lib/page-editorial-date.mjs";

const EDITORIAL_DATES = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/guide-editorial-dates.json"), "utf8"));

const OUT = path.join(ROOT, "src", "data", "page-dates.json");

function routeToFile(route) {
	const rel = route === "/" ? "index.html" : `${route.replace(/^\/|\/$/g, "")}/index.html`;
	return rel;
}

function main() {
	let prev = {};
	try {
		prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
	} catch {
		/* first run */
	}

	const dates = {};
	let resolved = 0;
	for (const route of STATIC_ROUTES) {
		const file = routeToFile(route);
		const abs = path.join(ROOT, file);
		if (!fs.existsSync(abs)) continue; // route with no static file (skip)
		// Untracked/brand-new pages have no git history yet. Fall back to the
		// file's own mtime so a new route still gets a lastmod instead of being
		// silently dropped from the sitemap.
		let date = EDITORIAL_DATES[route] || lastEditorialCommitDate(ROOT, file) || prev[route] || null;
		// A manually reviewed, uncommitted change can already have a newer date.
		if (prev[route] && (!date || prev[route] > date)) date = prev[route];
		if (!date) {
			try { date = fs.statSync(abs).mtime.toISOString().slice(0, 10); } catch { /* keep null */ }
		}
		if (date) {
			dates[route] = date;
			resolved++;
		}
	}

	fs.writeFileSync(OUT, JSON.stringify(dates, null, 2) + "\n");
	console.log(`[seo:dates] Wrote ${resolved} route date(s) to src/data/page-dates.json`);
}

main();

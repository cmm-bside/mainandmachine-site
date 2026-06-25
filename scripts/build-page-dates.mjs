#!/usr/bin/env node
// Generate src/data/page-dates.json — the real last-modified date (YYYY-MM-DD)
// of each static route, taken from git history (the date of the last commit
// that touched the route's index.html).
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
import { execFileSync } from "node:child_process";
import { ROOT, STATIC_ROUTES } from "./lib/config.mjs";

const OUT = path.join(ROOT, "src", "data", "page-dates.json");

function routeToFile(route) {
	const rel = route === "/" ? "index.html" : `${route.replace(/^\/|\/$/g, "")}/index.html`;
	return rel;
}

function gitLastDate(file) {
	try {
		const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], {
			cwd: ROOT,
			encoding: "utf8",
		}).trim();
		return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
	} catch {
		return null;
	}
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
		const date = gitLastDate(file) || prev[route] || null;
		if (date) {
			dates[route] = date;
			resolved++;
		}
	}

	fs.writeFileSync(OUT, JSON.stringify(dates, null, 2) + "\n");
	console.log(`[seo:dates] Wrote ${resolved} route date(s) to src/data/page-dates.json`);
}

main();

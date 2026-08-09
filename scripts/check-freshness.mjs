#!/usr/bin/env node
// The visible "Updated <Month Year>" and the JSON-LD dateModified must be the
// same date. Offline, in build:static.
//
//   npm run freshness:check
//
// This is the guard the brief asked for, and the failure it prevents is
// specific: a page that TELLS a reader it was updated in one month while
// TELLING a crawler it was updated in another. Whichever is fresher, one of
// them is a false freshness claim, and the JSON-LD one is the one Google acts
// on. Before this pass all 14 guides carried a hardcoded
// "dateModified": "2026-07-29" with no visible stamp at all, so there was
// nothing to disagree with and nothing to notice.
//
// It also asserts the byline exists where it is supposed to, because a
// freshness stamp with no author is half an E-E-A-T signal.
import fs from "node:fs";
import path from "node:path";
import { STATIC_ROUTES, ROOT } from "./lib/config.mjs";
import { modifiedIso, updatedLabel, AUTHOR_NAME, YMYL_GUIDES } from "./lib/byline.mjs";

let errors = 0;
const fail = (m) => { console.error("  ERROR  " + m); errors++; };

const guides = STATIC_ROUTES.filter((r) => r.startsWith("/guides/") && r !== "/guides/");
let checked = 0;

for (const route of guides) {
	const rel = path.join(route.replace(/^\/|\/$/g, ""), "index.html");
	const abs = path.join(ROOT, rel);
	if (!fs.existsSync(abs)) continue;
	const html = fs.readFileSync(abs, "utf8");
	const visible = html.replace(/<script[\s\S]*?<\/script>/g, " ");

	// Byline present, and it credits the author with a link to /about/.
	if (!/class="byline"/.test(html)) { fail(`${rel}: no byline component`); continue; }
	if (!/<a href="\/about\/"[^>]*rel="author"/.test(html))
		fail(`${rel}: byline does not link to /about/ with rel="author"`);
	if (!visible.includes(AUTHOR_NAME))
		fail(`${rel}: byline does not name ${AUTHOR_NAME}`);

	// The visible stamp.
	const shown = /Updated\s+([A-Z][a-z]+\s+\d{4})/.exec(visible);
	if (!shown) { fail(`${rel}: no visible "Updated <Month Year>" stamp`); continue; }

	const wantLabel = updatedLabel(route);
	const wantIso = modifiedIso(route);
	if (shown[1] !== wantLabel)
		fail(`${rel}: visible stamp says "${shown[1]}" but git last-commit is "${wantLabel}"`);

	// The machine-readable one, on every Article node.
	let sawArticle = false;
	for (const m of html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
		let j; try { j = JSON.parse(m[1]); } catch { continue; }
		for (const n of (j["@graph"] || [j])) {
			if (!n || typeof n !== "object") continue;
			if (!["Article", "BlogPosting"].includes([].concat(n["@type"] || [])[0])) continue;
			sawArticle = true;
			if (n.dateModified !== wantIso)
				fail(`${rel}: JSON-LD dateModified is "${n.dateModified}" but git last-commit is "${wantIso}"`);
			// The visible month must be the same month the JSON-LD claims.
			if (n.dateModified && updatedLabel(route) && !String(n.dateModified).startsWith(wantIso.slice(0, 7)))
				fail(`${rel}: JSON-LD dateModified "${n.dateModified}" is a different month from the visible "${shown[1]}"`);
			if (n.datePublished && n.dateModified && n.dateModified < n.datePublished)
				fail(`${rel}: dateModified ${n.dateModified} predates datePublished ${n.datePublished}`);
		}
	}
	if (!sawArticle) fail(`${rel}: no Article node to carry dateModified`);

	// YMYL guides carry the reviewer line.
	if (YMYL_GUIDES.has(route) && !/class="byline__reviewed"/.test(html))
		fail(`${rel}: YMYL guide is missing the "Reviewed by" line`);
	// …and non-YMYL guides must not, or the signal means nothing.
	if (!YMYL_GUIDES.has(route) && /class="byline__reviewed"/.test(html))
		fail(`${rel}: carries a "Reviewed by" line but is not in YMYL_GUIDES — either add it there or remove the line`);

	checked++;
}

console.log(`[freshness:check] ${checked} guide(s) checked`);
if (errors) { console.error(`\n[freshness:check] FAILED — ${errors} problem(s).`); process.exit(1); }
console.log("[freshness:check] OK — byline present, visible stamp and JSON-LD dateModified agree.");

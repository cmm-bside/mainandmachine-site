#!/usr/bin/env node
// Stamp the author byline + freshness stamp on the guides, and bring their
// JSON-LD dateModified onto the same source.
//
//   npm run byline:render              all guides
//   npm run byline:render --only=/guides/ai-consultant-cost/
//
// Blog posts are NOT touched here: build-blog.mjs already derives their byline,
// their visible Updated stamp, their JSON-LD dateModified and their sitemap
// lastmod from one function (modifiedOf). That half of the brief needed the
// author LINKED, which is a template change, not a stamping pass.
//
// Idempotent, marker-delimited. Inserted directly after the guide's <h1> — the
// byline belongs with the headline it credits, not below the lead.
import fs from "node:fs";
import path from "node:path";
import { STATIC_ROUTES, ROOT } from "./lib/config.mjs";
import { bylineHtml, modifiedIso, YMYL_GUIDES } from "./lib/byline.mjs";

const CHECK = process.argv.includes("--check");
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1];

const OPEN = "<!-- BYLINE:auto -->";
const CLOSE = "<!-- /BYLINE:auto -->";

let changed = 0;
const report = [];
const problems = [];

const guides = STATIC_ROUTES.filter((r) => r.startsWith("/guides/") && r !== "/guides/")
	.filter((r) => !only || r === only);

for (const route of guides) {
	const rel = path.join(route.replace(/^\/|\/$/g, ""), "index.html");
	const abs = path.join(ROOT, rel);
	if (!fs.existsSync(abs)) continue;
	const original = fs.readFileSync(abs, "utf8");
	let html = original;

	const iso = modifiedIso(route);
	if (!iso) { problems.push(`${rel}: no date in src/data/page-dates.json — run npm run seo:dates`); continue; }

	// --- 1. visible byline ---
	const block = `${OPEN}\n        ${bylineHtml(route, { reviewed: YMYL_GUIDES.has(route) })}\n        ${CLOSE}`;
	const re = new RegExp(`${OPEN}[\\s\\S]*?${CLOSE}`);
	if (re.test(html)) html = html.replace(re, block);
	else {
		// Directly after the closing </h1>.
		const m = /<h1[^>]*>[\s\S]*?<\/h1>/.exec(html);
		if (!m) { problems.push(`${rel}: no <h1> to attach a byline to`); continue; }
		const at = m.index + m[0].length;
		html = html.slice(0, at) + `\n        ${block}` + html.slice(at);
	}

	// --- 2. JSON-LD dateModified from the same source ---
	html = html.replace(
		/(<script[^>]+application\/ld\+json[^>]*>\n?)([\s\S]*?)(\n?<\/script>)/g,
		(whole, open, body, close) => {
			let graph;
			try { graph = JSON.parse(body); } catch { return whole; }
			let dirty = false;
			for (const n of (graph["@graph"] || [graph])) {
				if (!n || typeof n !== "object") continue;
				if (!["Article", "BlogPosting"].includes([].concat(n["@type"] || [])[0])) continue;
				if (n.dateModified !== iso) { n.dateModified = iso; dirty = true; }
				// dateModified must never predate publication — head:check errors on it.
				if (n.datePublished && n.dateModified < n.datePublished) {
					n.dateModified = n.datePublished;
				}
			}
			return dirty ? open + JSON.stringify(graph, null, 2) + close : whole;
		},
	);

	if (html !== original) {
		changed++; report.push(rel);
		if (!CHECK) fs.writeFileSync(abs, html);
	}
}

if (problems.length) { for (const p of problems) console.error("  ! " + p); process.exit(1); }

if (CHECK) {
	if (changed) {
		console.error(`[byline:check] FAILED — ${changed} guide(s) disagree with the model. Run: npm run byline:render`);
		for (const r of report) console.error("  - " + r);
		process.exit(1);
	}
	console.log(`[byline:check] OK — byline + dateModified consistent across ${guides.length} guide(s).`);
} else {
	console.log(`[byline:render] ${changed} guide(s) updated of ${guides.length}`);
	for (const r of report) console.log("  - " + r);
}

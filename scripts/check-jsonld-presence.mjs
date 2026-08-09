#!/usr/bin/env node
// Structural guard for the JSON-LD layer. Offline, in build:static.
//
//   npm run jsonld:presence
//
// This is the check whose ABSENCE let an external audit report "no JSON-LD on
// any page" against a site carrying 67 blocks and 1090 nodes: nothing asserted
// the layer existed, so nothing contradicted the claim. It is deliberately
// structural — presence, parseability, and graph integrity — and does NOT
// validate against the schema.org vocabulary. That is jsonld:check's job, and
// it stays out of the build because it downloads a ~1.5MB vocabulary and a
// deploy must never depend on schema.org being reachable.
//
// Six assertions, each of which has a real failure behind it:
//   1. every indexable page has >= 1 ld+json block
//   2. every block parses as JSON
//   3. every page carries the three shared entities (#org, #website, #person)
//   4. no @id is REFERENCED without being DEFINED somewhere (a dangling
//      pointer is an entity claim about nothing — /work/marcus/results/
//      pointed at /work/marcus/#article for months while that Article node
//      had no @id at all)
//   5. no @id is DEFINED twice with conflicting @type
//   6. FAQPage questions must appear in the page's visible text — structured
//      data that says something the page does not is the one schema error
//      that can earn a manual action
import fs from "node:fs";
import path from "node:path";
import { COMPANY, STATIC_ROUTES, NOINDEX_ROUTES } from "./lib/config.mjs";
import { ID } from "./lib/jsonld.mjs";

const ROOT = process.cwd();
let errors = 0;
const fail = (m) => { console.error("  ERROR  " + m); errors++; };

// /404.html is exempt: noindex by design, and an error page carries no entity.
const EXEMPT = new Set(["404.html"]);

/**
 * Compare TYPOGRAPHY-INSENSITIVELY. scripts/educate-quotes.mjs curls the
 * apostrophes in visible copy, so a page reads "What if AI isn’t right…"
 * while its JSON-LD carries the straight "isn't". That is the same question —
 * Google normalizes it too — and treating it as a mismatch produced three
 * false failures on /book/, /security/ and /services/ that looked exactly like
 * the two REAL content mismatches they were sitting next to. Normalize first,
 * then the survivors are genuine.
 */
function normalizeText(s) {
	return String(s)
		.replace(/&amp;/g, "&")
		.replace(/&#39;|&rsquo;|&lsquo;|[‘’]/g, "'")
		.replace(/&quot;|&ldquo;|&rdquo;|[“”]/g, '"')
		.replace(/&nbsp;| /g, " ")
		.replace(/&mdash;|—/g, "—")
		.replace(/\s+/g, " ")
		.trim();
}

const routeToFile = (r) => (r === "/" ? "index.html" : path.join(r.slice(1), "index.html"));
const pages = [...STATIC_ROUTES, ...NOINDEX_ROUTES]
	.map(routeToFile)
	.filter((f) => !EXEMPT.has(f) && fs.existsSync(path.join(ROOT, f)));

const defined = new Map();   // @id -> Set(@type)
const referenced = new Map(); // @id -> Set(page)
let blocks = 0, nodes = 0;

const REQUIRED = [
	[ID.org, "#org"],
	[ID.website, "#website"],
	[ID.person, "#person-cmyers"],
];

for (const rel of pages) {
	const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
	const found = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)];

	// 1. presence
	if (!found.length) { fail(`${rel}: no application/ld+json block`); continue; }

	const idsHere = new Set();
	const faqQuestions = [];

	for (const m of found) {
		blocks++;
		let graph;
		// 2. parseability
		try { graph = JSON.parse(m[1]); }
		catch (e) { fail(`${rel}: ld+json does not parse — ${e.message.split("\n")[0]}`); continue; }

		const walk = (n) => {
			if (Array.isArray(n)) return n.forEach(walk);
			if (!n || typeof n !== "object") return;
			const id = n["@id"];
			if (n["@type"]) {
				nodes++;
				if (id) {
					idsHere.add(id);
					if (!defined.has(id)) defined.set(id, new Set());
					[].concat(n["@type"]).forEach((t) => defined.get(id).add(t));
				}
				if ([].concat(n["@type"]).includes("Question") && typeof n.name === "string") {
					faqQuestions.push(n.name);
				}
			} else if (id) {
				// A bare {"@id": …} is a pointer.
				if (!referenced.has(id)) referenced.set(id, new Set());
				referenced.get(id).add(rel);
			}
			for (const v of Object.values(n)) walk(v);
		};
		walk(graph["@graph"] || graph);
	}

	// 3. the three shared entities
	for (const [id, label] of REQUIRED) {
		if (!idsHere.has(id)) fail(`${rel}: missing the shared ${label} node (${id})`);
	}

	// 6. FAQ questions must be on the page
	if (faqQuestions.length) {
		const visible = normalizeText(html
			.replace(/<script[\s\S]*?<\/script>/g, " ")
			.replace(/<style[\s\S]*?<\/style>/g, " ")
			.replace(/<[^>]+>/g, " "));
		for (const q of faqQuestions) {
			const norm = normalizeText(q);
			if (!visible.includes(norm)) {
				fail(
					`${rel}: FAQPage asks "${norm.slice(0, 70)}${norm.length > 70 ? "…" : ""}" but that ` +
					`question is not in the page's visible text. Markup must describe what a ` +
					`visitor can actually see.`,
				);
			}
		}
	}
}

// 4. dangling references
for (const [id, pagesRef] of referenced) {
	if (!defined.has(id)) {
		fail(
			`dangling @id "${id}" — referenced by ${[...pagesRef].join(", ")} but no node ` +
			`anywhere defines it. A pointer to an undefined entity is a claim about nothing.`,
		);
	}
}

// 5. one @id, one entity
for (const [id, types] of defined) {
	if (types.size > 1) {
		fail(`@id "${id}" is defined with conflicting @types: ${[...types].join(", ")}`);
	}
}

console.log(
	`[jsonld:presence] ${pages.length} page(s) · ${blocks} block(s) · ${nodes} node(s) · ` +
	`${defined.size} entity @id(s) · ${referenced.size} cross-reference target(s)`,
);
if (errors) {
	console.error(`\n[jsonld:presence] FAILED — ${errors} problem(s).`);
	process.exit(1);
}
console.log(`[jsonld:presence] OK — graph present, parseable, and fully connected on every indexable page.`);

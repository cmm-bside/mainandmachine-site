#!/usr/bin/env node
// Stamp the SHARED JSON-LD nodes in committed HTML from the canonical facts —
// the JSON-LD equivalent of render-facts.mjs, and the write half of the
// structured-data contract.
//
//   npm run jsonld:render
//
// The shared entities (#org, #website, #person-cmyers, the two city #local
// nodes) are hand-embedded on ~40 pages. One @id is one entity, so all 40 must
// make identical claims about it — but nothing enforced that for most fields,
// and a value added to site-facts.json reached them only if somebody edited 40
// files by hand.
//
// IDEMPOTENT AND MERGE-BASED, not regenerate-based. Page-specific properties
// (/about/'s `affiliation`, /'s `contactPoint`, /blog/'s SearchAction, the 11
// pages carrying `hasOfferCatalog`) are PRESERVED — see the shape-variance note
// in lib/jsonld.mjs. Only the canonical fields are overwritten.
//
// Serialization is safe to do blind: all 67 blocks were verified to round-trip
// byte-identically through JSON.parse -> JSON.stringify(_, null, 2), so the
// diff this produces contains only the values that actually changed.
import fs from "node:fs";
import path from "node:path";
import { COMPANY } from "../src/data/company.mjs";
import {
	ID,
	orgCanonicalFields,
	websiteCanonicalFields,
	personCanonicalFields,
	hubCanonicalFields,
} from "./lib/jsonld.mjs";

const ROOT = process.cwd();
const SKIP = new Set([
	"node_modules", "scratchpad", "audit", "reports", "_to_delete",
	"kobo_downloads", ".git", ".claude", "design", "emails",
	// The blog is GENERATED — its graph comes from orgJsonLd() in
	// lib/templates.mjs at build time, so patching its output would be
	// overwritten on the next blog:build and mask a real drift.
	"blog",
]);

const argv = new Set(process.argv.slice(2));
const CHECK_ONLY = argv.has("--check");

let filesChanged = 0, nodesPatched = 0;
const changed = [];

function* htmlFiles(dir) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		if (SKIP.has(e.name) || e.name.startsWith(".")) continue;
		const p = path.join(dir, e.name);
		if (e.isDirectory()) yield* htmlFiles(p);
		else if (e.name.endsWith(".html")) yield p;
	}
}

// Merge canonical fields into a node IN PLACE, preserving key order for keys
// that already exist and appending genuinely new ones. Returns true if the
// node's serialization changed.
function merge(node, fields) {
	const before = JSON.stringify(node);
	for (const [k, v] of Object.entries(fields)) node[k] = v;
	return JSON.stringify(node) !== before;
}

const HUB_BY_ID = new Map(COMPANY.hubs.map((h) => [ID.local(h.path), h]));

for (const file of htmlFiles(ROOT)) {
	const rel = path.relative(ROOT, file);
	const original = fs.readFileSync(file, "utf8");
	let out = original;
	let touched = 0;

	out = out.replace(
		/(<script[^>]+application\/ld\+json[^>]*>\n?)([\s\S]*?)(\n?<\/script>)/g,
		(whole, open, body, close) => {
			let graph;
			try { graph = JSON.parse(body); } catch { return whole; }
			const nodes = graph["@graph"] || [graph];
			let dirty = false;

			for (const n of nodes) {
				if (!n || typeof n !== "object" || !n["@type"]) continue;
				const id = n["@id"];
				if (id === ID.org && merge(n, orgCanonicalFields())) { dirty = true; touched++; }
				else if (id === ID.website && merge(n, websiteCanonicalFields())) { dirty = true; touched++; }
				else if (id === ID.person && merge(n, personCanonicalFields())) { dirty = true; touched++; }
				else if (HUB_BY_ID.has(id) && merge(n, hubCanonicalFields(HUB_BY_ID.get(id)))) { dirty = true; touched++; }
			}
			if (!dirty) return whole;
			return open + JSON.stringify(graph, null, 2) + close;
		},
	);

	if (out !== original) {
		filesChanged++;
		nodesPatched += touched;
		changed.push(`${rel} (${touched} node${touched === 1 ? "" : "s"})`);
		if (!CHECK_ONLY) fs.writeFileSync(file, out);
	}
}

if (CHECK_ONLY) {
	if (filesChanged) {
		console.error(
			`[jsonld:render --check] ${filesChanged} page(s) have shared JSON-LD nodes that ` +
			`disagree with src/data/site-facts.json. Run: npm run jsonld:render`,
		);
		for (const c of changed) console.error("  - " + c);
		process.exit(1);
	}
	console.log("[jsonld:render --check] OK — every shared JSON-LD node matches the facts file.");
} else {
	console.log(
		`[jsonld:render] ${nodesPatched} shared node(s) stamped across ${filesChanged} file(s) ` +
		`from src/data/site-facts.json`,
	);
	for (const c of changed) console.log("  - " + c);
}

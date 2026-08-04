#!/usr/bin/env node
/**
 * Validate every JSON-LD block against the REAL schema.org vocabulary.
 *
 * Not in build:static — it downloads the ~1.5MB vocabulary dump on first run
 * and caches it, and a deploy must never depend on schema.org being reachable:
 *     npm run jsonld:check
 *
 * Builds type -> allowed-properties (including inherited via rdfs:subClassOf)
 * from the official dump, which is what makes this equivalent to pasting each
 * page into validator.schema.org rather than eyeballing the markup.
 *
 * ONE PARSING TRAP, and it produces total nonsense if you miss it: the dump
 * writes ids as `schema:Question`, not `https://schema.org/Question`. Strip only
 * the URL form and EVERY type resolves as unknown — the first run of this
 * reported 3,539 errors including "unknown @type Question" and "unknown
 * property name", i.e. it flagged the entire vocabulary as invalid. A validator
 * that fails everything looks the same as a site that is broken everywhere.
 *
 * Checks each ld+json block on every page (plus the two graphs the /score/
 * proxy injects, which live in JS and are in no HTML file) for:
//   * parse errors
//   * unknown @type
//   * properties not defined for the node's type (what the schema.org
//     validator flags)
//   * @id references that resolve to nothing in the same page's graph
//   * BreadcrumbList position sequences
//   * empty / null values
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, LOCAL_SCRATCH_DIRS } from "./lib/config.mjs";
import { SCORE_GRAPH, SCORE_FAQ } from "../lib/score-proxy.mjs";

const VOCAB_URL = "https://schema.org/version/latest/schemaorg-current-https.jsonld";
const CACHE = path.join(ROOT, "node_modules", ".cache", "schemaorg-vocab.jsonld");
if (!fs.existsSync(CACHE)) {
	console.log(`[jsonld:check] fetching the schema.org vocabulary …`);
	const res = await fetch(VOCAB_URL);
	if (!res.ok) { console.error(`[jsonld:check] cannot fetch the vocabulary: HTTP ${res.status}`); process.exit(2); }
	fs.mkdirSync(path.dirname(CACHE), { recursive: true });
	fs.writeFileSync(CACHE, await res.text());
}
const VOCAB = JSON.parse(fs.readFileSync(CACHE, "utf8"))["@graph"];
const strip = (u) => String(u).replace(/^https?:\/\/schema\.org\//, "").replace(/^schema:/, "");
const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

const types = new Map();      // name -> { parents:[], props:Set }
const propOf = new Map();     // property name -> Set(domain type names)

for (const n of VOCAB) {
	const id = strip(n["@id"]);
	const t = arr(n["@type"]).map(strip);
	if (t.includes("rdfs:Class") || t.includes("Class")) {
		types.set(id, { parents: arr(n["rdfs:subClassOf"]).map((x) => strip(x["@id"] || x)), props: new Set() });
	}
	if (t.includes("rdf:Property") || t.includes("Property")) {
		const domains = arr(n["schema:domainIncludes"]).map((x) => strip(x["@id"] || x));
		propOf.set(id, new Set(domains));
	}
}
for (const [prop, domains] of propOf) for (const d of domains) types.get(d)?.props.add(prop);

// Inherited properties, memoized.
const allProps = new Map();
function propsFor(name, seen = new Set()) {
	if (allProps.has(name)) return allProps.get(name);
	if (seen.has(name) || !types.has(name)) return new Set();
	seen.add(name);
	const t = types.get(name);
	const out = new Set(t.props);
	for (const p of t.parents) for (const x of propsFor(p, seen)) out.add(x);
	allProps.set(name, out);
	return out;
}

// Keywords and JSON-LD syntax tokens are not schema.org properties.
const JSONLD_KEYS = new Set(["@context", "@type", "@id", "@graph", "@value", "@list", "@language", "@reverse"]);

/**
 * Findings that are correct as written. An allowlist with the reason inline,
 * because both look like errors to a validator and neither is one.
 */
const KNOWN_OK = [
	{
		match: /unknown property "query-input" \(on SearchAction\)/,
		why: "Google's sitelinks-searchbox extension. It is in Google's structured-data " +
		     "docs and in schema.org's Actions examples, but it is not a formal property " +
		     "in the vocabulary, so any validator flags it. Removing it turns the " +
		     "searchbox off, which is the only thing it is there for.",
	},
	{
		match: /empty value for "blogPost" on Blog/,
		why: "Only reachable with ZERO posts fetched, i.e. local dev without a beehiiv " +
		     "key under ALLOW_EMPTY_BLOG=1. build-blog.mjs fails the build on a zero-post " +
		     "index otherwise, so a deploy can never emit it.",
	},
];

const findings = [];
function validateGraph(label, doc) {
	const nodes = [];
	(function collect(v) {
		if (Array.isArray(v)) return v.forEach(collect);
		if (!v || typeof v !== "object") return;
		nodes.push(v);
		for (const [k, val] of Object.entries(v)) if (k !== "@context") collect(val);
	})(doc["@graph"] ?? doc);

	const defined = new Set(nodes.filter((n) => n["@id"] && n["@type"]).map((n) => n["@id"]));

	for (const n of nodes) {
		const tnames = arr(n["@type"]).map(String);
		// A bare {"@id": ...} is a reference, not a node — nothing to type-check.
		if (!tnames.length) {
			if (n["@id"] && Object.keys(n).length === 1) {
				if (!defined.has(n["@id"]) && !/^https?:\/\//.test(n["@id"])) {
					findings.push(`${label}: @id reference "${n["@id"]}" resolves to no node`);
				}
			}
			continue;
		}
		for (const t of tnames) {
			if (!types.has(t)) { findings.push(`${label}: unknown @type "${t}"`); continue; }
		}
		const allowed = new Set();
		for (const t of tnames) for (const p of propsFor(t)) allowed.add(p);
		for (const [k, val] of Object.entries(n)) {
			if (JSONLD_KEYS.has(k)) continue;
			if (!propOf.has(k)) { findings.push(`${label}: unknown property "${k}" (on ${tnames.join("/")})`); continue; }
			if (allowed.size && !allowed.has(k)) {
				findings.push(`${label}: property "${k}" is not valid for ${tnames.join("/")} (domain: ${[...propOf.get(k)].slice(0, 6).join(", ")})`);
			}
			if (val === null || val === "" || (Array.isArray(val) && !val.length)) {
				findings.push(`${label}: empty value for "${k}" on ${tnames.join("/")}`);
			}
		}
		if (tnames.includes("BreadcrumbList")) {
			const items = arr(n.itemListElement);
			items.forEach((it, i) => {
				if (it.position !== i + 1) findings.push(`${label}: BreadcrumbList position ${it.position} at index ${i} (must run 1..n in order)`);
				if (!it.name) findings.push(`${label}: BreadcrumbList item ${i + 1} has no name`);
				if (!it.item && i < items.length - 1) findings.push(`${label}: BreadcrumbList item ${i + 1} has no item URL`);
			});
		}
		if (tnames.includes("FAQPage")) {
			for (const q of arr(n.mainEntity)) {
				if (!q.acceptedAnswer?.text) findings.push(`${label}: FAQPage question "${q.name}" has no acceptedAnswer.text`);
			}
		}
	}
	return nodes.length;
}

const pages = [];
(function walk(d) {
	for (const e of fs.readdirSync(d, { withFileTypes: true })) {
		if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "emails") continue;
		if (d === ROOT && LOCAL_SCRATCH_DIRS.has(e.name)) continue;
		const f = path.join(d, e.name);
		if (e.isDirectory()) walk(f); else if (e.name.endsWith(".html")) pages.push(f);
	}
})(ROOT);

let blocks = 0, nodeCount = 0;
for (const f of pages.sort()) {
	const html = fs.readFileSync(f, "utf8");
	const rel = path.relative(ROOT, f);
	const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
	let m, i = 0;
	while ((m = re.exec(html))) {
		i++; blocks++;
		let doc;
		try { doc = JSON.parse(m[1]); }
		catch (err) { findings.push(`${rel} block ${i}: JSON parse error — ${err.message}`); continue; }
		if (!doc["@context"]) findings.push(`${rel} block ${i}: no @context`);
		nodeCount += validateGraph(`${rel} block ${i}`, doc);
	}
}
blocks += 2;
nodeCount += validateGraph("lib/score-proxy.mjs SCORE_GRAPH", SCORE_GRAPH);
nodeCount += validateGraph("lib/score-proxy.mjs SCORE_FAQ", SCORE_FAQ);

console.log(`\nJSON-LD validation — ${pages.length} pages, ${blocks} ld+json blocks, ${nodeCount} nodes`);
console.log(`vocabulary: ${types.size} types, ${propOf.size} properties\n`);
const known = findings.filter((f) => KNOWN_OK.some((k) => k.match.test(f)));
const real = findings.filter((f) => !KNOWN_OK.some((k) => k.match.test(f)));

if (known.length) {
	console.log(`${known.length} known-good finding(s), allowlisted:`);
	for (const k of KNOWN_OK) {
		const hits = known.filter((f) => k.match.test(f));
		if (!hits.length) continue;
		console.log(`  ${hits.length}x  ${hits[0].replace(/^[^:]+: /, "")}`);
		console.log(`        ${k.why.replace(/(.{72}) /g, "$1\n        ")}`);
	}
	console.log();
}
if (!real.length) { console.log("No errors.\n"); process.exit(0); }
const uniq = [...new Set(real)];
console.log(`${real.length} finding(s), ${uniq.length} distinct:\n`);
const byMsg = {};
for (const f of real) {
	const key = f.replace(/^[^:]+: /, "");
	(byMsg[key] = byMsg[key] || []).push(f.split(":")[0]);
}
for (const [msg, where] of Object.entries(byMsg).sort((a, b) => b[1].length - a[1].length)) {
	console.log(`  ${String(where.length).padStart(3)}×  ${msg}`);
	console.log(`        e.g. ${[...new Set(where)].slice(0, 3).join(", ")}`);
}
process.exit(1);

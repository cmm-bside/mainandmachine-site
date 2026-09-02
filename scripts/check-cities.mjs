#!/usr/bin/env node
// Guard the two city pages. Offline, in build:static.
//
//   npm run cities:check
//
// Four assertions, each behind a measured defect (2026-08-09):
//
//   1. NAP matches the LocalBusiness JSON-LD on the same page. A citation that
//      disagrees with its own structured data is the precise thing local search
//      punishes, and nothing checked it — there was no NAP block at all; the
//      only visible phone was the shared footer, which says "Denver and
//      Phoenix" on both pages.
//   2. Both cities link ALL FIVE industry pages. Denver linked 2 of 5,
//      Phoenix 3 of 5 — asymmetric depth, which is what "both cities matter
//      equally" rules out.
//   3. Cross-links INTO the city pages use a descriptive anchor. Every one of
//      the 7 referring pages used the bare word "Denver" / "Phoenix".
//   4. The two pages stay symmetric in depth: neither may carry fewer
//      industry links or FAQ entries than the other.
//
// It does NOT check prose uniqueness. That was measured once (Denver 71.2%,
// Phoenix 70.5% locally unique) and prose drifts for good reasons; a
// similarity threshold in CI would fire on legitimate edits and get muted.
import fs from "node:fs";
import path from "node:path";
import { COMPANY } from "./lib/config.mjs";
import { CITY_SLUGS, INDUSTRIES, napParts, cityAnchor, hub } from "./lib/cities.mjs";

const ROOT = process.cwd();
let errors = 0;
const fail = (m) => { console.error("  ERROR  " + m); errors++; };

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const stripLd = (h) => h.replace(/<script[\s\S]*?<\/script>/g, " ");

const perCity = {};

for (const slug of CITY_SLUGS) {
	const rel = `${slug}/index.html`;
	const html = read(rel);
	const visible = stripLd(html);
	const nap = napParts(slug);

	// --- 1. NAP present, and matching the LocalBusiness node ---
	const hasNapBlock = /class="nap"/.test(html);
	if (!hasNapBlock) fail(`${rel}: no NAP block (expected an element with class="nap")`);
	else {
		const block = /<[^>]*class="nap"[\s\S]*?<\/(?:div|address|p)>/.exec(html)?.[0] || "";
		const text = block.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
		for (const [label, want] of [["name", nap.name], ["phone", nap.phone], ["location", nap.locationLine]]) {
			if (!text.includes(want)) fail(`${rel}: NAP block is missing the canonical ${label} "${want}" (got: "${text.slice(0, 90)}")`);
		}
	}

	// The LocalBusiness node must agree.
	const localId = `${COMPANY.origin}/${slug}/#local`;
	let local = null;
	for (const m of html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
		let j; try { j = JSON.parse(m[1]); } catch { continue; }
		for (const n of (j["@graph"] || [j])) if (n && n["@id"] === localId) local = n;
	}
	if (!local) fail(`${rel}: no LocalBusiness node with @id ${localId}`);
	else {
		if (local.telephone !== COMPANY.phoneE164)
			fail(`${rel}: LocalBusiness telephone "${local.telephone}" != canonical "${COMPANY.phoneE164}"`);
		const areas = JSON.stringify(local.areaServed || "");
		if (!areas.includes(hub(slug).city))
			fail(`${rel}: LocalBusiness areaServed does not mention ${hub(slug).city}`);
		// Service-area business: a street address must never appear.
		if (JSON.stringify(local).includes("streetAddress"))
			fail(`${rel}: LocalBusiness carries a streetAddress — we are a service-area business with no verified public address`);
	}

	// --- 2. all five industries linked ---
	const linked = INDUSTRIES.filter((i) => html.includes(`href="${i.path}"`));
	const missing = INDUSTRIES.filter((i) => !linked.includes(i));
	if (missing.length)
		fail(`${rel}: city×industry strip is missing ${missing.length} of 5 — ${missing.map((m) => m.path).join(", ")}`);

	// FAQ depth, for the symmetry check below.
	const faqs = (visible.match(/<summary/g) || []).length;
	perCity[slug] = { industries: linked.length, faqs };
}

// --- 3. descriptive anchors on every page that links to a city ---
const REFERRERS = [
	"index.html",
	"industries/index.html",
	...INDUSTRIES.map((i) => `${i.path.replace(/^\/|\/$/g, "")}/index.html`),
];
for (const rel of REFERRERS) {
	if (!fs.existsSync(path.join(ROOT, rel))) continue;
	// CONTENT ONLY — the footer and nav are excluded, the same way cta:check and
	// qa:matrix exclude chrome. The footer's contact line reads
	// "cmyers@… · 928-363-6639 · Denver and Phoenix", where the city names are a
	// LOCATION STATEMENT that happens to be linked. Rewriting it to "AI
	// consulting in Denver and AI consulting in Phoenix" is bad copy, and that
	// block is duplicated across 40 pages plus templates.mjs, so it would also
	// break the chrome-parity check for a keyword. A descriptive anchor belongs
	// in a sentence, not in a NAP line.
	const html = read(rel)
		.replace(/<footer[\s\S]*?<\/footer>/gi, " ")
		.replace(/<header[\s\S]*?<\/header>/gi, " ");
	for (const slug of CITY_SLUGS) {
		const want = cityAnchor(slug);
		const re = new RegExp(`<a[^>]+href="/${slug}/"[^>]*>([\\s\\S]*?)</a>`, "g");
		for (const m of html.matchAll(re)) {
			const text = m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
			// The city page's own nav/footer chrome is excluded elsewhere; here we
			// only require that a CONTENT link says more than the bare city name.
			if (text.toLowerCase() === hub(slug).city.toLowerCase()) {
				fail(
					`${rel}: link to /${slug}/ uses the bare anchor "${text}" — use a descriptive ` +
					`anchor such as "${want}". A one-word anchor tells a crawler nothing about the target.`,
				);
			}
		}
	}
}

// --- 4. symmetry ---
const [a, b] = CITY_SLUGS;
if (perCity[a] && perCity[b]) {
	if (perCity[a].industries !== perCity[b].industries)
		fail(`city pages are asymmetric: ${a} links ${perCity[a].industries} industries, ${b} links ${perCity[b].industries}`);
	if (Math.abs(perCity[a].faqs - perCity[b].faqs) > 1)
		fail(`city pages are asymmetric: ${a} has ${perCity[a].faqs} FAQ entries, ${b} has ${perCity[b].faqs}`);
}

const summary = CITY_SLUGS.map((s) => `${s}: ${perCity[s]?.industries ?? 0}/5 industries, ${perCity[s]?.faqs ?? 0} FAQ`).join(" · ");
console.log(`[cities:check] ${summary}`);
if (errors) {
	console.error(`\n[cities:check] FAILED — ${errors} problem(s).`);
	process.exit(1);
}
console.log("[cities:check] OK — NAP matches JSON-LD, both cities link all five industries, anchors are descriptive.");

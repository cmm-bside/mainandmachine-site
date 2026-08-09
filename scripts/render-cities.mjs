#!/usr/bin/env node
// Insert/refresh the three generated city-page blocks on /denver/ and
// /phoenix/: the NAP line, the local-operations panel, and the city×industry
// strip. Marker-delimited and idempotent, the same contract build-work.mjs
// uses for the proof regions.
//
//   npm run cities:render
//
// It ADDS to the pages rather than rewriting them. Both already measure ~71%
// locally unique with strong city-specific copy (the three economic clusters,
// the Colorado trust-fund statute, Arizona's twenty-day notice); that copy is
// left exactly as it is. What goes in is the four things that were missing.
//
// PLACEHOLDERS ARE HTML COMMENTS, NEVER PROSE. Two reasons, and the first is
// hard: placeholders:check fails the build on TODO/TBD/placeholder in visible
// text, and it is right to. The second is the point of the exercise — a
// half-written commitment ("we respond within X hours") shipped as prose is a
// promise to a customer that nobody made. Verified: comments are stripped by
// that guard before it scans, so a NEEDS-INPUT comment is safe and invisible.
import fs from "node:fs";
import path from "node:path";
import { COMPANY } from "./lib/config.mjs";
import { CITY_SLUGS, INDUSTRIES, INDUSTRY_COPY, LOCAL_OPS, napParts, hub } from "./lib/cities.mjs";

const ROOT = process.cwd();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mark = (name) => [`<!-- CITY:${name} -->`, `<!-- /CITY:${name} -->`];

let changed = 0;

/** Replace between markers, or return null if the markers are absent. */
function replaceRegion(html, name, block) {
	const [open, close] = mark(name);
	const re = new RegExp(`${open}[\\s\\S]*?${close}`);
	if (!re.test(html)) return null;
	return html.replace(re, `${open}\n${block}\n${close}`);
}

function napBlock(slug) {
	const n = napParts(slug);
	// One line, the citation form. Matches the LocalBusiness node on this page;
	// cities:check compares them.
	return `<section class="section section--tight paper napband">
  <div class="wrap">
    <p class="nap">
      <span class="nap__name">${esc(n.name)}</span>
      <span class="nap__sep" aria-hidden="true">&middot;</span>
      <a class="nap__tel" href="${n.phoneHref}">${esc(n.phone)}</a>
      <span class="nap__sep" aria-hidden="true">&middot;</span>
      <span class="nap__loc">${esc(n.locationLine)}</span>
    </p>
    <p class="nap__note">Service-area business &mdash; we work at your place, not ours. No storefront in ${esc(n.locality)}.</p>
  </div>
</section>`;
}

function localOpsBlock(slug) {
	const ops = LOCAL_OPS[slug];
	const h = hub(slug);
	const areas = ops.areas.map(esc).join(", ");
	// Every unset field becomes a NEEDS-INPUT comment, not a sentence.
	const need = (field, question) =>
		ops[field]
			? `      <div class="lops__row"><span class="tick-lbl">${esc(field)}</span><p>${esc(ops[field])}</p></div>`
			: `      <!-- NEEDS-INPUT (${slug}.${field}): ${question}
           Fill LOCAL_OPS.${slug}.${field} in scripts/lib/cities.mjs, then run
           npm run cities:render. Left unwritten on purpose — this is a
           commitment to a customer and must not be invented. -->`;
	return `<section class="section paper-2 lops">
  <div class="wrap">
    <div class="head-block">
      <div>
        <span class="kicker">${esc(h.metro.split(",")[0])}</span>
        <h2 class="h2 mt-s">How working together actually goes in ${esc(h.city)}.</h2>
      </div>
      <p>In person means at your place: ${areas}, or a job trailer if that is where the work is. When distance wins we work remotely, at the same published prices.</p>
    </div>
    <div class="lops__grid">
      <div class="lops__row"><span class="tick-lbl">Coverage</span><p>${esc(ops.radiusNote)} in person, remote across the US.</p></div>
${need("kickoff", "What is the kickoff format and how long does it run?")}
${need("cadence", "How often are on-site working sessions during a sprint?")}
${need("responseTime", "What response time do we actually commit to?")}
${need("communities", "Which local chambers / trade associations do we belong to?")}
    </div>
  </div>
</section>`;
}

function industryStrip(slug) {
	const h = hub(slug);
	const items = INDUSTRIES.map((ind) => {
		const copy = INDUSTRY_COPY[slug][ind.key];
		if (!copy) throw new Error(`cities.mjs: no INDUSTRY_COPY.${slug}.${ind.key}`);
		return `      <li class="cxi__item">
        <h3 class="cxi__h">${esc(ind.name)} in ${esc(h.city)}</h3>
        <p>${copy}</p>
        <p class="cxi__go"><a href="${ind.path}">${esc(ind.name)} &rarr; what we build <span class="arr">&#8594;</span></a></p>
      </li>`;
	}).join("\n");
	return `<section class="section paper cxi">
  <div class="wrap">
    <div class="head-block">
      <div>
        <span class="kicker">Five sectors</span>
        <h2 class="h2 mt-s">What we build for ${esc(h.city)} operators, by sector.</h2>
      </div>
      <p>The same four SKUs and the same published prices in every one. What changes is the first workflow worth automating.</p>
    </div>
    <ul class="cxi__grid">
${items}
    </ul>
  </div>
</section>`;
}

for (const slug of CITY_SLUGS) {
	const rel = `${slug}/index.html`;
	const abs = path.join(ROOT, rel);
	const original = fs.readFileSync(abs, "utf8");
	let html = original;

	const regions = [
		["NAP", napBlock(slug), "</section>\n\n<!-- ============ SERVICES AND PRICES ============ -->"],
		["INDUSTRY-STRIP", industryStrip(slug), "\n<!-- ============ LOCAL PROOF ============ -->"],
		["LOCAL-OPS", localOpsBlock(slug), "\n<!-- ============ FAQ ============ -->"],
	];

	for (const [name, block, anchor] of regions) {
		const replaced = replaceRegion(html, name, block);
		if (replaced !== null) { html = replaced; continue; }
		// First run: insert at the anchor point.
		const [open, close] = mark(name);
		const idx = html.indexOf(anchor);
		if (idx === -1) { console.error(`  ! ${rel}: anchor for ${name} not found`); process.exit(1); }
		const insertAt = name === "NAP" ? idx + "</section>\n".length : idx;
		html = html.slice(0, insertAt) + `\n${open}\n${block}\n${close}\n` + html.slice(insertAt);
	}

	if (html !== original) { fs.writeFileSync(abs, html); changed++; console.log(`  updated ${rel}`); }
}

console.log(`[cities:render] ${changed} city page(s) updated`);

// --- city cross-links on the industry pages (item 6) -------------------------
// A descriptive anchor belongs in a sentence. These pages linked the cities
// only from the footer's NAP line, where the city names are a location
// statement; six of the seven referring pages had no CONTENT link at all.
// One line per page, stamped between markers, immediately above the closing
// CTA band.
const CITY_LINK_ANCHOR = '<section class="section ink final">';
const industryPages = [
	["industries/index.html", "every sector we serve"],
	...INDUSTRIES.map((i) => [`${i.path.replace(/^\/|\/$/g, "")}/index.html`, i.name.toLowerCase()]),
];
let linkChanged = 0;
for (const [rel, what] of industryPages) {
	const abs = path.join(ROOT, rel);
	if (!fs.existsSync(abs)) continue;
	const original = fs.readFileSync(abs, "utf8");
	let html = original;
	const links = CITY_SLUGS
		.map((s) => `<a href="/${s}/">AI consulting in ${esc(hub(s).city)}</a>`)
		.join(" and ");
	const block = `<section class="section section--tight paper-2 citylinks">
  <div class="wrap">
    <p class="citylinks__p"><span class="tick-lbl">Local</span> We work with ${esc(what)} in person from two hubs &mdash; ${links} &mdash; and remotely across the US, at the same published prices.</p>
  </div>
</section>`;
	const replaced = replaceRegion(html, "CITY-LINKS", block);
	if (replaced !== null) html = replaced;
	else {
		const idx = html.indexOf(CITY_LINK_ANCHOR);
		if (idx === -1) { console.error(`  ! ${rel}: no final CTA anchor`); process.exit(1); }
		const [open, close] = mark("CITY-LINKS");
		html = html.slice(0, idx) + `${open}\n${block}\n${close}\n\n` + html.slice(idx);
	}
	if (html !== original) { fs.writeFileSync(abs, html); linkChanged++; }
}
console.log(`[cities:render] ${linkChanged} industry page(s) got a city cross-link line`);

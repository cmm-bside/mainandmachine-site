#!/usr/bin/env node
// Inject FAQPage JSON-LD + a visible <details> FAQ into service/industry pages
// from scripts/lib/faq-data.mjs. Idempotent: re-running replaces the marked
// blocks rather than duplicating them. Matches the existing denver/phoenix FAQ
// markup (.faq / .faq__list / <details>), so it needs no new CSS.
//
//   npm run faq:inject
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/config.mjs";
import { FAQ } from "./lib/faq-data.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pad = (n) => ("0" + n).slice(-2);

const JSONLD_RE = /\n?<!-- FAQ-JSONLD:auto -->[\s\S]*?<\/script>/;
const VIS_RE = /\n?<!-- FAQ:auto -->[\s\S]*?<!-- \/FAQ:auto -->/;

function jsonLdBlock(items) {
	const obj = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: items.map((it) => ({
			"@type": "Question",
			name: it.q,
			acceptedAnswer: { "@type": "Answer", text: it.a },
		})),
	};
	return `\n<!-- FAQ-JSONLD:auto -->\n<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}

function visibleBlock(label, heading, items) {
	const details = items
		.map(
			(it, i) => `        <details>
          <summary><span class="q-no">${pad(i + 1)}</span><span class="q-tx">${esc(it.q)}</span><span class="q-pm">+</span></summary>
          <p>${esc(it.a)}</p>
        </details>`,
		)
		.join("\n");
	return `\n<!-- FAQ:auto -->
<section class="section paper-2" data-screen-label="${esc(label)}">
  <div class="wrap">
    <div class="faq">
      <div>
        <span class="kicker">Fair questions</span>
        <h2 class="h2 mt-s">${esc(heading)}</h2>
        <div class="faq__aside" style="margin-top:28px;">
          <h3 class="accent-tx" style="color:var(--accent-ink);">Want the numbers?</h3>
          <p>The full price list is published — audits, sprints, managed services, all on one page.</p>
          <a class="btn btn--accent" href="/pricing/">Read the price list <span class="arr">→</span></a>
        </div>
      </div>
      <div class="faq__list">
${details}
      </div>
    </div>
  </div>
</section>
<!-- /FAQ:auto -->`;
}

// Insert the visible FAQ just before the final CTA (so the FAQ precedes the
// closing ask, matching the city pages), falling back to before the footer.
function visibleInsertIndex(html) {
	const labelIdx = html.indexOf('data-screen-label="Start here"');
	if (labelIdx !== -1) {
		const secStart = html.lastIndexOf("<section", labelIdx);
		const commentStart = html.lastIndexOf("<!-- ", labelIdx);
		// Prefer the comment banner above the section if it's adjacent.
		if (commentStart !== -1 && secStart !== -1 && commentStart < secStart && secStart - commentStart < 200) {
			return commentStart;
		}
		if (secStart !== -1) return secStart;
	}
	const finalSec = html.indexOf('<section class="section ink final"');
	if (finalSec !== -1) return finalSec;
	return html.indexOf("<footer");
}

function process(rel) {
	const file = path.join(ROOT, rel);
	let html = fs.readFileSync(file, "utf8");
	const { label, heading, items } = FAQ[rel];

	// Strip any prior auto blocks (idempotent).
	html = html.replace(JSONLD_RE, "").replace(VIS_RE, "");

	// JSON-LD before </head>.
	html = html.replace("</head>", `${jsonLdBlock(items)}\n</head>`);

	// Visible block before the final CTA / footer.
	const idx = visibleInsertIndex(html);
	if (idx === -1) throw new Error(`${rel}: no insertion point found`);
	html = html.slice(0, idx) + visibleBlock(label, heading, items) + "\n\n" + html.slice(idx);

	fs.writeFileSync(file, html);
	return items.length;
}

let pages = 0, qs = 0;
for (const rel of Object.keys(FAQ)) {
	qs += process(rel);
	pages++;
}
console.log(`[faq:inject] Injected FAQ into ${pages} page(s), ${qs} Q&A total.`);

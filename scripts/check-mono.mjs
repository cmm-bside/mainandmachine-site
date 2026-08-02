#!/usr/bin/env node
// mono:check — enforces THE MONO RULE (see CLAUDE.md, "The mono rule"):
//   --mono is for short labels and data values only, never for a sentence.
// Concretely: no rendered element may set Space Mono on more than MAX_WORDS
// words of its OWN text.
//
// Why this is a RENDERED check and not a grep: most mono text inherits its
// family rather than declaring one, so the source says nothing. `text-transform`
// and `font-family` are both inherited, and a container styled `.kicker` three
// levels up is what makes a paragraph mono. Computed style is the only
// reliable test — the same reason the CLAUDE.md note says to audit by
// rendering.
//
// Counting rule — a MONO BLOCK, not an element. The unit charged is the
// outermost element that renders mono (its parent does not), and it is charged
// for every text node under it whose nearest element ancestor is also mono.
// Two failures this avoids, both of which a naive count hits:
//   - charge each element for its own text nodes only, and a mono sentence
//     broken by an inline <a> ("Read his essay X, or see the method") reads as
//     three short fragments and passes;
//   - charge each element for its whole subtree, and a mono container is
//     reported once plus once more for every mono span inside it.
//
// Separator and affordance glyphs (· / — – | → ←) are NOT words. They carry no
// reading load, and counting them is what previously made four legitimate
// eyebrows ("The Ampersand · free, a few times a month" — eight words and a
// middot) read as nine-word violations.
//
// Needs Playwright, which is deliberately NOT a dependency (keep the Pages
// build lean), so this is not wired into build:static. Run:
//   npm i -D playwright && npm run mono:check
//   PLAYWRIGHT_PATH=/path/to/node_modules/playwright npm run mono:check
// Serves the repo root itself on 127.0.0.1:8124 — no server needed.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { ROOT, STATIC_ROUTES } from "./lib/config.mjs";

const MAX_WORDS = 8;
const PORT = 8124;
const ROUTES = [...STATIC_ROUTES, "/blog/", "/blog/archive/", "/404.html"];

async function loadPlaywright() {
	for (const candidate of [process.env.PLAYWRIGHT_PATH, "playwright"].filter(Boolean)) {
		try {
			return await import(candidate.startsWith("/") ? path.join(candidate, "index.mjs") : candidate);
		} catch { /* try next */ }
	}
	console.error("Playwright not found. `npm i -D playwright` or set PLAYWRIGHT_PATH.");
	process.exit(2);
}

function serve() {
	const types = { html: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript", json: "application/json", png: "image/png", svg: "image/svg+xml", ico: "image/x-icon", xml: "application/xml", txt: "text/plain", woff2: "font/woff2" };
	const server = http.createServer((req, res) => {
		const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
		let file = path.join(ROOT, p);
		if (p.endsWith("/")) file = path.join(file, "index.html");
		try {
			const data = fs.readFileSync(file);
			res.writeHead(200, { "Content-Type": types[path.extname(file).slice(1)] || "application/octet-stream" });
			res.end(data);
		} catch {
			res.writeHead(404, { "Content-Type": "text/html" });
			try { res.end(fs.readFileSync(path.join(ROOT, "404.html"))); } catch { res.end("not found"); }
		}
	});
	return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

const collect = (maxWords) => {
	const out = [];
	const selOf = (el) => {
		const cls = typeof el.className === "string" && el.className.trim()
			? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
			: "";
		return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + cls;
	};
	const isMono = (el) => /mono/i.test(getComputedStyle(el).fontFamily);
	const shown = (el) => {
		const cs = getComputedStyle(el);
		return cs.display !== "none" && cs.visibility !== "hidden";
	};
	// A token is a word only if it contains a letter or a digit; "·", "→",
	// "—" and friends are separators and affordance marks.
	const isWord = (t) => /[\p{L}\p{N}]/u.test(t);

	// Does this element have prose of its own, i.e. direct text carrying a
	// word? That is what separates a SENTENCE from a CONTAINER OF LABELS.
	const hasOwnProse = (el) =>
		Array.from(el.childNodes).some((c) => c.nodeType === 3 && isWord(c.textContent));

	// Attribute every mono text node to its "mono block". Climbing merges a
	// sentence that inline links have split — but only across an ancestor that
	// has interstitial text of its own. Without that condition a pure wrapper
	// of sibling labels gets merged into one long pseudo-sentence: the utility
	// bar's two clauses read as one 10-word run, and the footer's legal line
	// plus its four link labels read as one 16-word run, when each is a short
	// label sitting on its own.
	const blocks = new Map();
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
	for (let n = walker.nextNode(); n; n = walker.nextNode()) {
		const text = n.textContent.replace(/\s+/g, " ").trim();
		if (!text) continue;
		const el = n.parentElement;
		if (!el || el.closest("script, style, template") || !isMono(el) || !shown(el)) continue;
		let root = el;
		while (
			root.parentElement &&
			root.parentElement !== document.body &&
			isMono(root.parentElement) &&
			hasOwnProse(root.parentElement)
		) {
			root = root.parentElement;
		}
		if (!blocks.has(root)) blocks.set(root, []);
		blocks.get(root).push(text);
	}

	for (const [root, parts] of blocks) {
		const text = parts.join(" ").replace(/\s+/g, " ").trim();
		const words = text.split(" ").filter(isWord).length;
		if (words <= maxWords) continue;
		const cs = getComputedStyle(root);
		out.push({
			sel: selOf(root),
			words,
			size: cs.fontSize,
			transform: cs.textTransform,
			text: text.length > 90 ? text.slice(0, 90) + "…" : text,
		});
	}
	return out;
};

const pw = await loadPlaywright();
const server = await serve();
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

const findings = [];
for (const route of ROUTES) {
	await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: "networkidle" });
	await page.evaluate(() => document.fonts.ready);
	for (const hit of await page.evaluate(collect, MAX_WORDS)) findings.push({ route, ...hit });
}

await browser.close();
server.close();

if (!findings.length) {
	console.log(`[mono:check] OK — no mono element over ${MAX_WORDS} words across ${ROUTES.length} route(s).`);
	process.exit(0);
}

console.error(`[mono:check] ${findings.length} mono element(s) over ${MAX_WORDS} words:\n`);
for (const f of findings) {
	console.error(`  ${f.route}  ${f.sel}  (${f.words} words, ${f.size}, ${f.transform})`);
	console.error(`    "${f.text}"`);
}
console.error(`\nThe mono rule: --mono is for short labels and data values only, never a`);
console.error(`sentence. Re-set the offender in --sans at --t-sm (14px) in sentence case.`);
process.exit(1);

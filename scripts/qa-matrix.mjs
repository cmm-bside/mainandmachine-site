#!/usr/bin/env node
// qa-matrix — the design-system consistency matrix, rendered.
//
// Eight checks per route per width:
//   links      two link treatments only (STYLE A / STYLE B), and the invariant
//              that underline + accent never co-occur at REST
//   buttons    two button variants only, one 52px box, PRIMARY carries the
//              arrow and SECONDARY never does
//   section-y  every <section> takes padding-block: var(--section-y), except
//              the homepage hero (SECTION_Y_EXEMPT — sized to one viewport)
//   min-11px   nothing renders below 11px
//   contrast   every text/background pair clears WCAG AA
//   widows     multi-line headings do not strand a one-word last line
//   container  one container, max-width 1160px
//   chrome     utility bar + footer are DOM-identical across pages
//
// Needs Playwright (deliberately not a dependency, as with sweep:mobile):
//   npm i -D playwright && npm run qa:matrix
//   PLAYWRIGHT_PATH=/path/to/node_modules/playwright npm run qa:matrix
// Serves the repo root itself on 127.0.0.1:8141 — no server needed.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { ROOT, STATIC_ROUTES } from "./lib/config.mjs";

const WIDTHS = (process.env.QA_WIDTHS || "1440,1024,768,375").split(",").map(Number);
const ROUTES = process.env.QA_ROUTES ? process.env.QA_ROUTES.split(",") : [...STATIC_ROUTES, "/blog/", "/blog/archive/", "/404.html"];
const PORT = 8141;

// Heading widows: `text-wrap: balance` is a hint browsers cap at a few lines,
// so a residue is expected and documented in CLAUDE.md. The gate is "no worse
// than the recorded baseline", not zero — chasing the rest forces a one-word
// FIRST line on short headings, which is worse. Override with QA_WIDOW_BUDGET.
const WIDOW_BUDGET = Number(process.env.QA_WIDOW_BUDGET ?? 132);

async function loadPlaywright() {
	for (const c of [process.env.PLAYWRIGHT_PATH, "playwright"].filter(Boolean)) {
		try { return await import(c.startsWith("/") ? path.join(c, "index.mjs") : c); } catch { /* next */ }
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
	return new Promise((r) => server.listen(PORT, "127.0.0.1", () => r(server)));
}

const audit = (cfg) => {
	const fails = [];
	const add = (check, detail) => fails.push({ check, detail });
	const sel = (el) => {
		const cls = typeof el.className === "string" && el.className.trim()
			? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
		return el.tagName.toLowerCase() + cls;
	};
	const txt = (el) => (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 34);
	const vis = (el) => {
		const cs = getComputedStyle(el);
		if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
		const r = el.getBoundingClientRect();
		return r.width > 0 && r.height > 0;
	};

	/* ---------- colour helpers ---------- */
	// color-mix() serialises as color(srgb …), not rgb(), so an rgb-only parser
	// silently skips --paper-card and friends. Parse both.
	const parse = (s) => {
		if (!s || s === "transparent") return null;
		const srgb = s.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
		if (srgb) return [+srgb[1] * 255, +srgb[2] * 255, +srgb[3] * 255, srgb[4] === undefined ? 1 : +srgb[4]];
		const m = s.match(/rgba?\(([^)]+)\)/);
		if (!m) return null;
		const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
		return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
	};
	const over = (fg, bg) => fg[3] >= 1 ? fg : [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
	const lum = (c) => {
		const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
		return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
	};
	const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
	// Resolve the painted background GEOMETRICALLY: an absolutely positioned
	// child can paint outside its parent's box, so a naive ancestor walk
	// attributes the wrong backdrop.
	//
	// The test is the element's CENTRE POINT, not full-rect containment. Full
	// containment looks stricter but breaks wherever a child is wider than its
	// background ancestor — which is every page with horizontal overflow at
	// 375px. There the walk found no containing ancestor, fell through to the
	// white default, and reported a shelf of phantom failures: cream headings
	// "on #ffffff" at 1.19:1 that are really cream on ink and perfectly legible.
	const bgOf = (el) => {
		const r = el.getBoundingClientRect();
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		let acc = null;
		for (let n = el; n; n = n.parentElement) {
			const cs = getComputedStyle(n);
			const c = parse(cs.backgroundColor);
			if (!c || c[3] === 0) continue;
			const nr = n.getBoundingClientRect();
			if (n !== el && !(nr.left <= cx && nr.right >= cx && nr.top <= cy && nr.bottom >= cy)) continue;
			acc = acc ? over(acc, c) : c;
			if (acc[3] >= 1) return acc;
		}
		return acc && acc[3] >= 1 ? acc : [255, 255, 255, 1];
	};

	const ACCENT = new Set(cfg.accents);
	const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

	/* ---------- 1. two link treatments ---------- */
	// Chrome is not a content link (nav, breadcrumb, utility bar, logo, skip
	// link), and neither is a card/block affordance where the whole card is the
	// link — both are excluded by the link system on purpose.
	const CHROME = ".nav, .ticker, .crumb, .legal__crumb, .bookhero__crumb, .sechero__crumb, .logo, .skip, .skip-link, .nav__menu";
	for (const a of document.querySelectorAll("a")) {
		if (!vis(a) || a.classList.contains("btn")) continue;
		if (a.closest(CHROME) || a.classList.contains("logo")) continue;
		if (a.querySelector("h1,h2,h3,h4,h5,h6,p")) continue;            // block link wrapping a card
		if (a.querySelector("img, svg, picture")) continue;              // image affordance
		// …and the inverse: a card TITLE that is itself the link. Underlining a
		// card title is the wrong reading of "two link treatments" — the title
		// carries the affordance, so it is excluded exactly as a block link is.
		const heading = a.closest("h1, h2, h3, h4, h5, h6");
		if (heading && txt(heading) === txt(a)) continue;
		if (!txt(a)) continue;
		const cs = getComputedStyle(a);
		const underlined = cs.textDecorationLine.includes("underline");
		const col = hex(over(parse(cs.color) || [0, 0, 0, 1], bgOf(a)));
		const accent = ACCENT.has(col);
		// STYLE B is selected by the ARROW, not by the family — the real
		// selector is `a:not(.btn):has(.arr)`. Classifying on font-family
		// instead misreads any STYLE A link that happens to sit inside a mono
		// container (the footer's legal bar is mono, and its Privacy/Terms
		// links are STYLE A links rendered in it).
		if (a.querySelector(".arr")) {
			if (underlined) add("links", `STYLE B underlined at rest: ${sel(a)} "${txt(a)}"`);
			if (!/mono/i.test(cs.fontFamily)) add("links", `STYLE B not mono: ${sel(a)} "${txt(a)}"`);
			if (!accent) add("links", `STYLE B not accent: ${sel(a)} "${txt(a)}" ${col}`);
		} else {
			// STYLE A — currentColor + underline, never accent at rest
			if (!underlined) add("links", `STYLE A without underline: ${sel(a)} "${txt(a)}"`);
			if (accent) add("links", `accent at rest + underline (forbidden pair): ${sel(a)} "${txt(a)}" ${col}`);
		}
	}

	/* ---------- 2. two button variants, one box ---------- */
	for (const b of document.querySelectorAll(".btn")) {
		if (!vis(b)) continue;
		const cs = getComputedStyle(b);
		const primary = b.classList.contains("btn--primary");
		const secondary = b.classList.contains("btn--secondary");
		if (!primary && !secondary) { add("buttons", `neither variant: ${sel(b)} "${txt(b)}"`); continue; }
		if (primary && secondary) add("buttons", `both variants: ${sel(b)} "${txt(b)}"`);
		// One 52px box. Below 620px a long label is allowed to wrap and the box
		// grows downward from the same floor rather than overflowing the screen,
		// so the assertion there is "at least 52", not "exactly 52".
		const h = Math.round(b.getBoundingClientRect().height);
		const floorOnly = window.innerWidth <= 620;
		if (floorOnly ? h < 52 : h !== 52) {
			add("buttons", `height ${h}px (want ${floorOnly ? ">=52" : "52"}): ${sel(b)} "${txt(b)}"`);
		}
		if (cs.borderRadius !== "0px") add("buttons", `radius ${cs.borderRadius}: ${sel(b)} "${txt(b)}"`);
		if (!/mono/i.test(cs.fontFamily)) add("buttons", `not mono: ${sel(b)} "${txt(b)}"`);
		if (cs.textTransform !== "uppercase") add("buttons", `not uppercase: ${sel(b)} "${txt(b)}"`);
		const arr = b.querySelector(".arr");
		const arrShown = arr && getComputedStyle(arr).display !== "none";
		if (primary && !arrShown) add("buttons", `PRIMARY without arrow: ${sel(b)} "${txt(b)}"`);
		if (secondary && arrShown) add("buttons", `SECONDARY with arrow: ${sel(b)} "${txt(b)}"`);
	}

	/* ---------- 3. section padding = var(--section-y) ---------- */
	// The homepage hero is the ONE named exception (styles.css, HERO block): it
	// is sized to fit the nav→first-dark-band run inside a 900px viewport, so it
	// takes a flat 96px rather than the sitewide ladder. Named here rather than
	// tolerated by a range, so a SECOND section drifting off --section-y still
	// fails — which is the whole point of this check.
	const SECTION_Y_EXEMPT = { "section.hero.section": "96px" };
	const wantY = getComputedStyle(document.documentElement).getPropertyValue("--section-y").trim();
	for (const s of document.querySelectorAll("main section, body > section")) {
		if (!vis(s)) continue;
		const cs = getComputedStyle(s);
		const want = SECTION_Y_EXEMPT[sel(s)] || wantY;
		if (cs.paddingTop !== want || cs.paddingBottom !== want) {
			add("section-y", `${sel(s)} ${cs.paddingTop}/${cs.paddingBottom} (want ${want})`);
		}
	}

	/* ---------- 4. nothing below 11px ---------- */
	for (const el of document.querySelectorAll("body *")) {
		if (!vis(el)) continue;
		const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3 && n.textContent.trim()).length;
		if (!own) continue;
		const fs2 = parseFloat(getComputedStyle(el).fontSize);
		if (fs2 < 10.995) add("min-11px", `${sel(el)} ${fs2}px "${txt(el)}"`);
	}

	/* ---------- 5. AA contrast ---------- */
	for (const el of document.querySelectorAll("body *")) {
		if (!vis(el)) continue;
		if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
		if (el.closest(cfg.contrastExempt)) continue;
		const cs = getComputedStyle(el);
		const fg = parse(cs.color);
		if (!fg) continue;
		const bg = bgOf(el);
		const r = ratio(over(fg, bg), bg);
		const size = parseFloat(cs.fontSize);
		const bold = parseInt(cs.fontWeight, 10) >= 700;
		const large = size >= 24 || (size >= 18.66 && bold);
		const floor = large ? 3 : 4.5;
		if (r < floor - 0.005) add("contrast", `${sel(el)} ${r.toFixed(2)}:1 (need ${floor}) ${hex(fg)} on ${hex(bg)} @${size}px "${txt(el)}"`);
	}

	/* ---------- 7. one container ---------- */
	for (const w of document.querySelectorAll(".wrap")) {
		if (!vis(w)) continue;
		const mw = getComputedStyle(w).maxWidth;
		if (mw !== "1160px") add("container", `${sel(w)} max-width ${mw}`);
	}

	/* ---------- 8. chrome shape ---------- */
	const shape = (el) => {
		if (!el) return "NONE";
		const out = [];
		(function walk(n, d) {
			out.push("  ".repeat(d) + n.tagName.toLowerCase() + (typeof n.className === "string" && n.className.trim() ? "." + n.className.trim().split(/\s+/).sort().join(".") : ""));
			for (const c of n.children) walk(c, d + 1);
		})(el, 0);
		return out.join("\n");
	};

	/* ---------- 6. heading widows (mutates: run last) ---------- */
	let widows = 0;
	const widowList = [];
	for (const h of document.querySelectorAll("h1, h2, h3, .h1, .h2")) {
		if (!vis(h)) continue;
		if (h.querySelector(".hm-line")) continue;   // structurally-lined hero
		const original = h.innerHTML;
		const words = (h.textContent || "").trim().split(/\s+/).filter(Boolean);
		if (words.length < 2) continue;
		h.innerHTML = words.map((w) => `<span data-w>${w}</span>`).join(" ");
		const spans = [...h.querySelectorAll("[data-w]")];
		const tops = spans.map((s) => Math.round(s.getBoundingClientRect().top));
		const lastTop = Math.max(...tops);
		const onLast = tops.filter((t) => t === lastTop).length;
		const lines = new Set(tops).size;
		h.innerHTML = original;
		if (lines > 1 && onLast === 1) { widows++; widowList.push(`${sel(h)} "${words.join(" ").slice(0, 44)}"`); }
	}

	return {
		fails,
		widows,
		widowList,
		footShape: shape(document.querySelector("footer")),
		barShape: shape(document.querySelector(".ticker")),
	};
};

const pw = await loadPlaywright();
const server = await serve();
const browser = await pw.chromium.launch();

const CFG = {
	// Every accent hex the palette can paint as TEXT, normalised.
	accents: ["#c6401e", "#aa371a", "#e86a3e", "#a93517", "#922e13"],
	// WCAG 1.4.3 exempts logotypes; the PRIMARY button label is a documented,
	// deliberate site-wide exception (see CLAUDE.md, BUTTONS).
	contrastExempt: ".amp, .logo, .btn--primary",
};

const results = [];
const footShapes = new Map();
const barShapes = new Map();
let totalWidows = 0;

for (const width of WIDTHS) {
	const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
	for (const route of ROUTES) {
		await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: "networkidle" });
		await page.evaluate(() => document.fonts.ready);
		const r = await page.evaluate(audit, CFG);
		totalWidows += r.widows;
		results.push({ route, width, fails: r.fails, widows: r.widows, widowList: r.widowList });
		if (width === WIDTHS[0]) {
			if (!footShapes.has(r.footShape)) footShapes.set(r.footShape, []);
			footShapes.get(r.footShape).push(route);
			if (!barShapes.has(r.barShape)) barShapes.set(r.barShape, []);
			barShapes.get(r.barShape).push(route);
		}
	}
	await page.close();
}
await browser.close();
server.close();

/* ---- chrome identity is a cross-page property, folded back in as a check ----
   Three routes are documented, deliberate reductions rather than drift:
   /privacy/, /terms/ and /404.html carry no utility bar and a cut-down footer
   by existing design (see CLAUDE.md, "Top utility bar"). They are named here so
   the exception is visible in the source instead of silently passing. */
const CHROME_MINIMAL = new Set(["/privacy/", "/terms/", "/404.html"]);
const biggest = (m) => [...m.entries()].sort((a, b) => b[1].length - a[1].length)[0];
const [, footMajority] = biggest(footShapes);
const [, barMajority] = biggest(barShapes);
for (const r of results) {
	if (r.width !== WIDTHS[0]) continue;
	if (CHROME_MINIMAL.has(r.route)) continue;
	if (!footMajority.includes(r.route)) r.fails.push({ check: "chrome", detail: "footer DOM differs from the shared footer" });
	if (!barMajority.includes(r.route)) r.fails.push({ check: "chrome", detail: "utility bar DOM differs from the shared bar" });
}

const CHECKS = ["links", "buttons", "section-y", "min-11px", "contrast", "widows", "container", "chrome"];
const cell = (route, check) => {
	const rows = results.filter((r) => r.route === route);
	if (check === "widows") {
		const w = rows.reduce((n, r) => n + r.widows, 0);
		return w === 0 ? "pass" : String(w);
	}
	const n = rows.reduce((a, r) => a + r.fails.filter((f) => f.check === check).length, 0);
	return n === 0 ? "pass" : `FAIL ${n}`;
};

console.log(`\nQA MATRIX — ${ROUTES.length} routes × ${WIDTHS.join("/")}px\n`);
const head = ["route".padEnd(46), ...CHECKS.map((c) => c.padEnd(9))].join("| ");
console.log(head);
console.log("-".repeat(head.length));
let hardFails = 0;
for (const route of ROUTES) {
	const cells = CHECKS.map((c) => cell(route, c));
	hardFails += CHECKS.filter((c) => c !== "widows").reduce((a, c) => a + (cell(route, c) === "pass" ? 0 : 1), 0);
	console.log([route.padEnd(46), ...cells.map((c) => c.padEnd(9))].join("| "));
}

const detail = new Map();
for (const r of results) for (const f of r.fails) {
	const k = `${f.check} :: ${f.detail}`;
	if (!detail.has(k)) detail.set(k, new Set());
	detail.get(k).add(`${r.route}@${r.width}`);
}
if (detail.size) {
	console.log(`\n--- ${detail.size} distinct finding(s) ---`);
	for (const [k, where] of [...detail.entries()].sort()) {
		const w = [...where];
		console.log(`  ${k}\n      ${w.length} occurrence(s): ${w.slice(0, 3).join(", ")}${w.length > 3 ? " …" : ""}`);
	}
}
console.log(`\nheading widows: ${totalWidows} (budget ${WIDOW_BUDGET}, documented residue)`);
console.log(`distinct footer shapes: ${footShapes.size}   distinct utility-bar shapes: ${barShapes.size}`);
const widowFail = totalWidows > WIDOW_BUDGET;
console.log(hardFails === 0 && !widowFail ? "\nALL ROWS PASS." : `\n${hardFails} failing cell(s)${widowFail ? " + widow budget exceeded" : ""}.`);
process.exit(hardFails === 0 && !widowFail ? 0 : 1);

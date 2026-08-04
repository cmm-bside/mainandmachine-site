#!/usr/bin/env node
/**
 * Mobile checklist audit at 390x844. Reports PASS/FAIL per item; exits 1 on any
 * failure. Companion to mobile-shots.mjs (screenshots + overflow gate).
 *
 *   npm run audit:mobile
 *   BASE_URL=https://<preview>.pages.dev npm run audit:mobile
 *
 * TWO MEASUREMENT TRAPS, both of which produce a confident green that means
 * nothing:
 *
 *  1. js/reveal.js RETURNS EARLY on `navigator.webdriver`. Under Playwright it
 *     never runs, so every element is already in its final state and "is any
 *     content stuck hidden?" answers itself. The reveal checks below stub
 *     webdriver to false BEFORE any script runs, so the animation path is the
 *     one actually measured. Without that, this file would be theatre.
 *
 *  2. A tap target's size is not its bounding rect. Inline links get their 44px
 *     from padding that paints outside the line box, and several controls are
 *     wrapped in a larger label. Measure the union of the element's client
 *     rects and let an ancestor label satisfy the floor, or every inline link
 *     on the site reports as failing.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { ROOT } from "./lib/config.mjs";

const PORT = 8190;
const VP = { width: 390, height: 844 };
const VP_H = VP.height;
const SCORE_UPSTREAM = process.env.SCORE_ORIGIN || "https://score.mainandmachine.com";
const BASE_URL = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/+$/, "") : null;

const TYPES = { html: "text/html", css: "text/css", js: "text/javascript", json: "application/json", svg: "image/svg+xml", png: "image/png", ico: "image/x-icon", woff2: "font/woff2" };
function serve() {
	const server = http.createServer(async (req, res) => {
		const url = new URL(req.url, "http://x");
		const p = decodeURIComponent(url.pathname);
		if (p === "/score" || p.startsWith("/score/") || p.startsWith("/s/")) {
			try {
				const r = await fetch(SCORE_UPSTREAM + (p === "/score/" ? "/score" : p) + url.search, { headers: { "x-mm-proxy": "1" }, redirect: "follow" });
				const buf = Buffer.from(await r.arrayBuffer());
				res.writeHead(r.status, { "Content-Type": r.headers.get("content-type") || "text/html" });
				return res.end(buf);
			} catch { res.writeHead(502); return res.end("upstream down"); }
		}
		let file = path.join(ROOT, p);
		if (p.endsWith("/")) file = path.join(file, "index.html");
		try {
			const d = fs.readFileSync(file);
			res.writeHead(200, { "Content-Type": TYPES[path.extname(file).slice(1)] || "application/octet-stream" });
			res.end(d);
		} catch { res.writeHead(404); res.end("nf"); }
	});
	return new Promise((r) => server.listen(PORT, "127.0.0.1", () => r(server)));
}
async function loadPlaywright() {
	for (const c of [process.env.PLAYWRIGHT_PATH, "playwright"].filter(Boolean)) {
		try { return await import(c.startsWith("/") ? path.join(c, "index.mjs") : c); } catch { /* next */ }
	}
	console.error("Playwright not found."); process.exit(2);
}

const results = [];
let fails = 0;
const check = (group, name, ok, detail = "") => {
	results.push({ group, name, ok, detail });
	if (!ok) fails++;
};

// Shared in-page helper: the true interactive size of an element.
const TAP_FN = `(el) => {
  const rects = [...el.getClientRects()];
  const own = rects.length
    ? { w: Math.max(...rects.map(r => r.width)), h: rects.reduce((a, r) => a + r.height, 0) }
    : { w: 0, h: 0 };
  // An ancestor label/button is the real target for a wrapped control.
  const host = el.closest('label, button, .btn') || el;
  const hr = host.getBoundingClientRect();
  return { w: Math.max(own.w, hr.width), h: Math.max(own.h, hr.height) };
}`;

const { chromium } = await loadPlaywright();
const server = BASE_URL ? null : await serve();
const origin = BASE_URL || `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch();

async function newPage({ reveal = false, js = true, reduced = false } = {}) {
	const context = await browser.newContext({
		viewport: VP, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
		javaScriptEnabled: js,
		reducedMotion: reduced ? "reduce" : "no-preference",
	});
	if (reveal) {
		// TRAP 1: make reveal.js believe it is a real browser.
		await context.addInitScript(() => {
			Object.defineProperty(navigator, "webdriver", { get: () => false, configurable: true });
		});
	}
	return { context, page: await context.newPage() };
}

/* ================= A. Header / hamburger at 390px ===================== */
{
	const { context, page } = await newPage();
	await page.goto(`${origin}/`, { waitUntil: "load" });

	const toggleVisible = await page.locator(".nav__toggle").isVisible();
	check("header", "hamburger is visible at 390px", toggleVisible);

	// A booking CTA reachable WITHOUT opening the menu.
	const ctaReachable = await page.evaluate(() => {
		const inNav = [...document.querySelectorAll('.nav a[href^="/book"]')];
		const vis = inNav.filter((a) => {
			const r = a.getBoundingClientRect();
			const cs = getComputedStyle(a);
			return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" &&
				!a.closest(".nav__links");           // must not require the panel
		});
		return { count: vis.length, label: vis[0] ? vis[0].textContent.replace(/\s+/g, " ").trim() : null };
	});
	check("header", "booking CTA reachable without opening the menu",
		ctaReachable.count > 0, ctaReachable.count ? `"${ctaReachable.label}"` : "no /book link outside .nav__links is visible");

	await page.locator(".nav__toggle").click();
	check("header", "hamburger opens the panel",
		await page.evaluate(() => document.querySelector(".nav").classList.contains("is-open")));

	// Focus trap: Tab from the last focusable in the panel must stay inside.
	const trap = await page.evaluate(async () => {
		const nav = document.querySelector(".nav");
		if (!nav.classList.contains("is-open")) return { supported: false };
		const sel = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
		const inPanel = [...nav.querySelectorAll(sel)].filter((e) => e.offsetParent !== null);
		if (!inPanel.length) return { supported: false };
		inPanel[inPanel.length - 1].focus();
		return { supported: true, lastIsInNav: nav.contains(document.activeElement) };
	});
	if (trap.supported) {
		await page.keyboard.press("Tab");
		const stillInside = await page.evaluate(() => document.querySelector(".nav").contains(document.activeElement));
		check("header", "focus is trapped inside the open panel (Tab wraps)", stillInside,
			stillInside ? "" : "Tab from the last item escaped to the page behind the panel");
	} else {
		check("header", "focus is trapped inside the open panel (Tab wraps)", false, "could not evaluate");
	}

	await page.keyboard.press("Escape");
	check("header", "Esc closes the panel",
		await page.evaluate(() => !document.querySelector(".nav").classList.contains("is-open")));
	check("header", "Esc returns focus to the hamburger",
		await page.evaluate(() => document.activeElement === document.querySelector(".nav__toggle")));

	await page.locator(".nav__toggle").click();
	// The drawer is FULL-WIDTH (x:0 w:390, y:92->703 at 390x844), so there is no
	// "outside" to its left or right — a click at (200,700) lands inside the
	// panel and the handler is correct to ignore it. Tap below the panel's
	// bottom edge, which is the only outside a phone actually has.
	// Pick a point that is BOTH outside the drawer and not on a link — the first
	// naive attempt clicked a CTA below the panel and navigated the page, which
	// destroys the execution context and looks like a crash rather than a
	// failing assertion.
	const pt = await page.evaluate(() => {
		const panel = document.querySelector(".nav__links").getBoundingClientRect();
		for (let y = Math.ceil(panel.bottom) + 8; y < window.innerHeight - 4; y += 12) {
			for (const x of [12, window.innerWidth / 2, window.innerWidth - 12]) {
				const el = document.elementFromPoint(x, y);
				if (!el) continue;
				if (el.closest(".nav")) continue;                       // still inside
				if (el.closest("a, button, input, select, textarea, summary, label")) continue;
				return { x, y };
			}
		}
		return null;
	});
	if (!pt) {
		check("header", "outside tap closes the panel (below the full-width drawer)", false,
			"no inert point exists outside the drawer at this viewport");
	} else {
		await page.mouse.click(pt.x, pt.y);
	}
	if (pt)
	check("header", "outside tap closes the panel (below the full-width drawer)",
		await page.evaluate(() => !document.querySelector(".nav").classList.contains("is-open")));

	// aria-hidden on the rest of the page would be nice-to-have; assert the
	// essentials only (expanded state is the one screen readers act on).
	await context.close();
}

/* ================= B. Hero stacking at 390px ========================== */
{
	const { context, page } = await newPage();
	await page.goto(`${origin}/`, { waitUntil: "load" });
	await page.evaluate(() => document.fonts && document.fonts.ready);
	const hero = await page.evaluate(() => {
		const h1 = document.querySelector(".hero__headline") || document.querySelector(".hero h1");
		const card = document.querySelector(".statrail");
		if (!h1 || !card) return null;
		const a = h1.getBoundingClientRect(), b = card.getBoundingClientRect();
		const accent = document.querySelector("[data-machine-word]");
		// Orphan test: does the accent line's last visual row hold one word?
		let lastRowWords = null;
		if (accent) {
			const words = (accent.textContent || "").trim().split(/\s+/);
			const spans = words.map((w) => { const s = document.createElement("span"); s.textContent = w; return s; });
			const keep = accent.innerHTML;
			accent.textContent = "";
			spans.forEach((s, i) => { accent.appendChild(s); if (i < spans.length - 1) accent.appendChild(document.createTextNode(" ")); });
			const tops = spans.map((s) => Math.round(s.getBoundingClientRect().top));
			const last = Math.max(...tops);
			lastRowWords = tops.filter((t) => t === last).length;
			accent.innerHTML = keep;
		}
		return {
			stacked: b.top >= a.bottom - 2,
			cardWidth: Math.round(b.width), heroWidth: Math.round(h1.getBoundingClientRect().width),
			h1Size: parseFloat(getComputedStyle(h1).fontSize),
			lastRowWords, accentWords: accent ? accent.textContent.trim().split(/\s+/).length : 0,
		};
	});
	check("hero", "spec card stacks under the headline", !!hero && hero.stacked,
		hero ? `card top ${hero.stacked ? ">=" : "<"} headline bottom` : "elements not found");
	check("hero", "spec card is full-width in the stack", !!hero && Math.abs(hero.cardWidth - hero.heroWidth) <= 2,
		hero ? `card ${hero.cardWidth}px vs headline ${hero.heroWidth}px` : "");
	check("hero", "headline steps down at 390px", !!hero && hero.h1Size <= 56,
		hero ? `${hero.h1Size}px` : "");
	check("hero", "accent line does not orphan its last word",
		!!hero && (hero.accentWords <= 1 || hero.lastRowWords === null || hero.lastRowWords > 1),
		hero ? `last row holds ${hero.lastRowWords} of ${hero.accentWords} words` : "");
	await context.close();
}

/* ================= C. Tap targets ==================================== */
{
	const GROUPS = [
		["nav links (panel open)", "/", ".nav__links a", true],
		["doors buttons", "/", ".paths .btn", false],
		["footer links", "/", ".foot a", false],
		["FAQ toggles", "/book/", ".faq__list summary, .faq summary, details > summary", false],
	];
	for (const [label, route, sel, openNav] of GROUPS) {
		const { context, page } = await newPage();
		await page.goto(`${origin}${route}`, { waitUntil: "load" });
		if (openNav) await page.locator(".nav__toggle").click();
		const bad = await page.evaluate(([sel, tapFn]) => {
			const size = eval(tapFn);
			const out = [];
			for (const el of document.querySelectorAll(sel)) {
				if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") continue;
				const { w, h } = size(el);
				if (w < 44 || h < 44) {
					out.push({ t: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30), w: Math.round(w), h: Math.round(h) });
				}
			}
			return out;
		}, [sel, TAP_FN]);
		check("tap targets", `${label} >= 44x44`, bad.length === 0,
			bad.length ? bad.slice(0, 4).map((b) => `"${b.t}" ${b.w}x${b.h}`).join("; ") + (bad.length > 4 ? ` (+${bad.length - 4})` : "") : "");
		await context.close();
	}

	// ROI slider: it must be draggable and have a real thumb.
	const { context, page } = await newPage();
	await page.goto(`${origin}/`, { waitUntil: "load" });
	const slider = await page.$("#bandRange");
	if (!slider) {
		check("tap targets", "ROI slider present", false, "#bandRange not found");
	} else {
		// MUST scroll it into view before touching it: Playwright's mouse takes
		// VIEWPORT coordinates, and this control sits ~8000px down the homepage.
		// Dragging its boundingBox without scrolling drags empty space and
		// reports a working slider as broken.
		await page.locator("#bandRange").scrollIntoViewIfNeeded();
		await page.waitForTimeout(120);
		const box = await slider.boundingBox();
		check("tap targets", "ROI slider track >= 44px tall", box.height >= 44, `${Math.round(box.height)}px`);
		// getComputedStyle(el, "::-webkit-slider-thumb") returns the HOST's box in
		// Chromium, not the thumb's — it reported 304x44, the track. Read the
		// authored rule out of the stylesheet instead.
		const thumb = await page.evaluate(() => {
			// Take the LAST rule that applies at this viewport, media queries
			// included — reading the first match returns the base 16px rule and
			// never sees a mobile override, which is a guard that can only ever
			// report the desktop value.
			let hit = { w: 0, h: 0 };
			const visit = (rules) => {
				for (const r of rules || []) {
					if (r.media) { if (matchMedia(r.conditionText || r.media.mediaText).matches) visit(r.cssRules); continue; }
					if (r.selectorText && r.selectorText.includes("-webkit-slider-thumb") && r.style.width) {
						hit = { w: parseFloat(r.style.width), h: parseFloat(r.style.height || r.style.width) };
					}
				}
			};
			for (const sheet of document.styleSheets) {
				let rules; try { rules = sheet.cssRules; } catch { continue; }
				visit(rules);
			}
			return hit;
		});
		check("tap targets", "ROI slider thumb >= 24px (visible grab handle)",
			thumb.w >= 24 && thumb.h >= 24, `${thumb.w}x${thumb.h}px (from the authored ::-webkit-slider-thumb rule)`);
		const before = await page.inputValue("#bandRange");
		await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 12 });
		await page.mouse.up();
		const after = await page.inputValue("#bandRange");
		check("tap targets", "ROI slider is draggable by touch/pointer", before !== after, `${before} -> ${after}`);
	}
	await context.close();
}

/* ================= D. /book/ at 390px ================================ */
{
	const { context, page } = await newPage();
	await page.goto(`${origin}/book/`, { waitUntil: "load" });
	await page.waitForTimeout(600);

	const embed = await page.evaluate(() => {
		const mount = document.getElementById("calEmbed");
		if (!mount) return null;
		const r = mount.getBoundingClientRect();
		const f = mount.querySelector("iframe");
		const fr = f ? f.getBoundingClientRect() : null;
		return {
			mountW: Math.round(r.width), vw: window.innerWidth,
			minH: parseFloat(getComputedStyle(mount).minHeight) || 0,
			frameW: fr ? Math.round(fr.width) : null, frameH: fr ? Math.round(fr.height) : null,
			hasFrame: !!f,
		};
	});
	check("/book/", "Calendly mount spans the content width", !!embed && embed.mountW >= embed.vw - 48,
		embed ? `${embed.mountW}px of ${embed.vw}px viewport` : "no #calEmbed");
	check("/book/", "iframe mounted", !!embed && embed.hasFrame);
	check("/book/", "embed is tall enough for Calendly's mobile flow (>=700px)",
		!!embed && Math.max(embed.minH, embed.frameH || 0) >= 700,
		embed ? `min-height ${embed.minH}px, frame ${embed.frameH}px` : "");

	// iOS zoom-on-focus: every text-entry control must compute >= 16px.
	const small = await page.evaluate(() => {
		const out = [];
		// iOS zooms on focus only for controls you TYPE into. Radios and
		// checkboxes never trigger it, and holding them to 16px would inflate
		// every styled radio row on the page for no benefit.
		const TEXTUAL = new Set(["text", "email", "tel", "url", "search", "password", "number", "textarea", "select-one", "select-multiple"]);
		for (const el of document.querySelectorAll("input, select, textarea")) {
			if (el.type === "hidden" || el.tabIndex === -1) continue;
			if (!TEXTUAL.has(el.type)) continue;
			const fs = parseFloat(getComputedStyle(el).fontSize);
			if (fs < 16) out.push({ id: el.id || el.name || el.tagName.toLowerCase(), fs });
		}
		return out;
	});
	check("/book/", "all form controls >= 16px (no iOS zoom-on-focus)", small.length === 0,
		small.map((s) => `${s.id} ${s.fs}px`).join(", "));

	const attrs = await page.evaluate(() => {
		const want = {
			name: { autocomplete: "name" },
			email: { autocomplete: "email", inputmode: "email" },
			phone: { autocomplete: "tel", inputmode: "tel" },
			company: { autocomplete: "organization" },
		};
		const out = [];
		for (const [id, need] of Object.entries(want)) {
			const el = document.getElementById(id);
			if (!el) { out.push(`#${id} missing`); continue; }
			for (const [a, v] of Object.entries(need)) {
				const got = el.getAttribute(a);
				if (got !== v) out.push(`#${id} ${a}="${got}" (want "${v}")`);
			}
		}
		return out;
	});
	check("/book/", "name/email/tel/organization carry autocomplete + inputmode", attrs.length === 0, attrs.join("; "));

	const usable = await page.evaluate(() => {
		const q = document.getElementById("cal-workflows");
		const form = document.getElementById("assessForm");
		const inside = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right <= window.innerWidth + 1; };
		return { ctx: !!q && inside(q), form: !!form && inside(form) };
	});
	check("/book/", "context field is present and within the viewport", usable.ctx);
	check("/book/", "fallback form is present and within the viewport", usable.form);
	await context.close();
}

/* ================= E. reveal.js — nothing stuck hidden =============== */
for (const mode of ["js-on", "reduced-motion", "no-js"]) {
	const { context, page } = await newPage({
		reveal: mode === "js-on",
		js: mode !== "no-js",
		reduced: mode === "reduced-motion",
	});
	await page.goto(`${origin}/`, { waitUntil: "load" });
	if (mode === "js-on") {
		await page.evaluate(async () => {
			const step = Math.floor(window.innerHeight * 0.8);
			for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
				window.scrollTo(0, y);
				await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
			}
		});
		await page.waitForTimeout(900);
	}
	const hidden = await page.evaluate(() => {
		const out = [];
		for (const el of document.querySelectorAll(".reveal, .head-block, .diff, .svc__item, .path, .failstat")) {
			const cs = getComputedStyle(el);
			if (parseFloat(cs.opacity) < 0.9) {
				out.push({ c: (el.className || "").toString().slice(0, 40), o: cs.opacity });
			}
		}
		return out;
	});
	check("reveal.js", `no content stuck hidden (${mode})`, hidden.length === 0,
		hidden.slice(0, 4).map((h) => `${h.c} opacity ${h.o}`).join("; ") + (hidden.length > 4 ? ` (+${hidden.length - 4})` : ""));
	// Prove the trap is defeated: with reveal active the class must exist.
	if (mode === "js-on") {
		const n = await page.evaluate(() => document.querySelectorAll(".reveal").length);
		check("reveal.js", "reveal actually ran under automation (webdriver stub works)", n > 0, `${n} .reveal elements`);
	}
	await context.close();
}

/* ================= F. Footer + utility bar =========================== */
{
	const { context, page } = await newPage();
	await page.goto(`${origin}/`, { waitUntil: "load" });
	const foot = await page.evaluate(() => {
		const cols = [...document.querySelectorAll(".foot__col")];
		const tops = cols.map((c) => Math.round(c.getBoundingClientRect().top));
		const stacked = new Set(tops).size === cols.length || cols.length <= 1;
		const signup = document.querySelector(".foot__signup input, .signup input");
		const sr = signup ? signup.getBoundingClientRect() : null;
		const ticker = document.querySelector(".ticker__left");
		const tr = ticker ? ticker.getBoundingClientRect() : null;
		return {
			cols: cols.length, stacked,
			signupW: sr ? Math.round(sr.width) : null,
			signupInside: sr ? sr.right <= window.innerWidth + 1 : null,
			tickerInside: tr ? tr.right <= window.innerWidth + 1 : null,
			tickerH: tr ? Math.round(tr.height) : null,
			barH: (() => { const b = document.querySelector(".ticker"); return b ? Math.round(b.getBoundingClientRect().height) : null; })(),
		};
	});
	check("footer", "footer columns stack (no side-by-side squeeze)", foot.stacked, `${foot.cols} columns`);
	check("footer", "newsletter field fits the viewport", foot.signupInside !== false, `${foot.signupW}px`);
	check("footer", "utility bar text stays inside the viewport", foot.tickerInside !== false);
	check("footer", "utility bar does not wrap into a tall block", foot.tickerH === null || foot.tickerH <= 48,
		`${foot.tickerH}px inside a ${foot.barH}px bar`);
	await context.close();
}

await browser.close();
if (server) server.close();

/* ---- report ---- */
console.log(`\nMOBILE AUDIT — ${VP.width}x${VP.height}  (${origin})\n`);
let last = "";
for (const r of results) {
	if (r.group !== last) { console.log(`  ${r.group}`); last = r.group; }
	console.log(`    ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `\n            ${r.detail}` : ""}`);
}
console.log();
if (fails) { console.error(`${fails} FAILED of ${results.length}\n`); process.exit(1); }
console.log(`All ${results.length} checks pass.\n`);

#!/usr/bin/env node
/**
 * Hero headline reveal — timing budget and progressive-enhancement contract.
 *
 * The h1 "The machine belongs to Main Street." ships COMPLETE in the HTML.
 * js/hero-machine.js upgrades it by splitting the accent line into per-letter
 * spans and animating them. That upgrade must never leave the payoff line
 * missing, and must finish inside 1.2s of first paint.
 *
 * The subtlety this measures, and the reason a naive "when did it become
 * visible" probe is useless here: the line is ALREADY complete at first paint
 * (font-display:swap paints it from raw HTML). The script then HIDES it to
 * animate it. So the number that matters is not the first moment the line is
 * whole — it is the LAST time it settles whole, plus how long it spent hidden
 * in between. A probe that records the first `complete` reading reports a
 * perfect 0ms on a page that blanks its headline for two seconds.
 *
 * Runs, each a fresh context:
 *   1. Fast 3G + 4x CPU throttle (the acceptance condition) — settle vs first
 *      paint, hidden window, CLS attributed to the hero subtree
 *   2. unthrottled desktop — same measurements
 *   3. hero-machine.js blocked at the network layer — headline must be whole
 *   4. prefers-reduced-motion — headline whole, no animation, never armed
 *   5. script throws on entry — must force-finish to the complete headline
 *   6. layout identity across unsplit / armed / play / done
 *
 * Needs Playwright (not a build dependency):
 *   npm i -D playwright && npm run test:hero
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { ROOT } from "./lib/config.mjs";

const PORT = 8183;
const BUDGET_MS = 1200;
const HEADLINE = "The machine belongs to Main Street.";
const ACCENT = "Main Street.";

function serve() {
	const types = { html: "text/html", css: "text/css", js: "text/javascript", json: "application/json", svg: "image/svg+xml", png: "image/png", ico: "image/x-icon", woff2: "font/woff2", txt: "text/plain", xml: "application/xml" };
	const server = http.createServer((req, res) => {
		let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
		let file = path.join(ROOT, p);
		if (p.endsWith("/")) file = path.join(file, "index.html");
		try {
			const data = fs.readFileSync(file);
			res.writeHead(200, { "Content-Type": types[path.extname(file).slice(1)] || "application/octet-stream", "Cache-Control": "no-store" });
			res.end(data);
		} catch { res.writeHead(404, { "Content-Type": "text/html" }); res.end("not found"); }
	});
	return new Promise((r) => server.listen(PORT, "127.0.0.1", () => r(server)));
}

async function loadPlaywright() {
	for (const c of [process.env.PLAYWRIGHT_PATH, "playwright"].filter(Boolean)) {
		try { return await import(c.startsWith("/") ? path.join(c, "index.mjs") : c); } catch { /* next */ }
	}
	console.error("Playwright not found. `npm i -D playwright` or set PLAYWRIGHT_PATH.");
	process.exit(2);
}

/**
 * Installed before any page script. Samples the accent line every frame and
 * records a compact timeline, so Node can find the LAST settle rather than the
 * first. Also collects layout-shift entries whose sources are inside the hero.
 */
const PROBE = () => {
	window.__hm = { samples: [], cls: 0, clsHero: 0, clsHeadline: 0, shifts: [] };
	const complete = () => {
		const line = document.querySelector("[data-machine-word]");
		if (!line) return false;
		if ((line.textContent || "").replace(/\s+/g, " ").trim() !== "Main Street.") return false;
		const letters = line.querySelectorAll(".hm-letter");
		if (!letters.length) return true; // unsplit: the raw HTML is already whole
		for (const l of letters) {
			const cs = getComputedStyle(l);
			if (parseFloat(cs.opacity) < 0.99) return false;
			const t = cs.transform;
			if (t && t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)") return false;
		}
		return true;
	};
	const tick = () => {
		const st = document.querySelector("[data-hero-machine]");
		window.__hm.samples.push({
			t: performance.now(),
			c: complete(),
			s: st ? st.dataset.state : null,
		});
		requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);

	// ATTRIBUTION TRAP: a layout-shift entry's `value` is the score for the whole
	// FRAME, not for one source. Charging the full value to the hero because any
	// one of its sources sits inside the hero reports the sitewide webfont swap —
	// which moves the nav, a stat label and the hero's CTA button in a single
	// entry at ~43ms — as a hero shift worth 5.4e-5. It is not one: it happens
	// with hero-machine.js blocked entirely (the control run proves it), and no
	// element of the headline is ever a source. Track the headline subtree
	// specifically, and keep the coarse "any hero source" number beside it so the
	// difference stays visible rather than being quietly defined away.
	try {
		new PerformanceObserver((list) => {
			for (const e of list.getEntries()) {
				if (e.hadRecentInput) continue;
				window.__hm.cls += e.value;
				const srcs = (e.sources || []).map((s) => s.node).filter(Boolean);
				const inHead = srcs.some((n) => n.closest && (n.closest(".hero__headline") || n.closest("[data-machine-word]")));
				const inHero = srcs.some((n) => n.closest && n.closest("[data-hero-machine]"));
				if (inHead) window.__hm.clsHeadline += e.value;
				if (inHero) window.__hm.clsHero += e.value;
				window.__hm.shifts.push({
					v: e.value, t: Math.round(e.startTime), inHead, inHero,
					srcs: srcs.map((n) => (n.nodeName === "#text" ? "#text" : n.nodeName.toLowerCase() +
						(n.className ? "." + String(n.className).trim().split(/\s+/).join(".") : ""))).slice(0, 6),
				});
			}
		}).observe({ type: "layout-shift", buffered: true });
	} catch { /* no layout-shift support: reported as unavailable */ }
};

const results = [];
let failures = 0;
function check(name, ok, detail) {
	results.push({ name, ok, detail });
	if (!ok) failures++;
}

const { chromium } = await loadPlaywright();
const server = await serve();
const browser = await chromium.launch();
const URL_ = `http://127.0.0.1:${PORT}/`;

/** One measured load. Returns settle time relative to first paint. */
async function measure({ label, throttle, reducedMotion, blockHero, breakHero }) {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		reducedMotion: reducedMotion ? "reduce" : "no-preference",
		javaScriptEnabled: true,
	});
	await context.addInitScript(PROBE);
	const page = await context.newPage();
	if (blockHero) await page.route("**/hero-machine.js*", (r) => r.abort());
	if (breakHero) {
		// Inject the fault into the real script, immediately AFTER it arms. That
		// is the worst case for the contract: the letters are already split and
		// hidden when the throw lands, so only the catch's force-finish can put
		// the headline back. Patching the served body rather than stubbing a DOM
		// method keeps every other line of the real script running — a stub broad
		// enough to break the script also breaks this test's own probe.
		await page.route("**/hero-machine.js*", async (route) => {
			const res = await route.fetch();
			const src = await res.text();
			const anchor = "root.dataset.state = 'armed';";
			if (!src.includes(anchor)) throw new Error("test is stale: no arming line to inject after");
			await route.fulfill({
				status: 200,
				contentType: "text/javascript",
				body: src.replace(anchor, anchor + "\n    throw new Error('synthetic failure after arming');"),
			});
		});
	}

	if (throttle) {
		const cdp = await context.newCDPSession(page);
		await cdp.send("Network.enable");
		// Chrome DevTools' "Fast 3G" preset: 1.6 Mb/s down, 750 Kb/s up, 562.5ms RTT.
		await cdp.send("Network.emulateNetworkConditions", {
			offline: false,
			latency: 562.5,
			downloadThroughput: (1.6 * 1024 * 1024) / 8,
			uploadThroughput: (750 * 1024) / 8,
		});
		await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
	}

	await page.goto(URL_, { waitUntil: "load", timeout: 120000 });
	await page.waitForTimeout(3000); // outlast the 1.5s safety net and any animation
	try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch { /* ignore */ }

	const data = await page.evaluate(() => {
		const paints = performance.getEntriesByType("paint");
		const fp = paints.find((p) => p.name === "first-paint");
		const fcp = paints.find((p) => p.name === "first-contentful-paint");
		const line = document.querySelector("[data-machine-word]");
		const h1 = document.querySelector(".hero__headline") || document.querySelector("h1");
		return {
			firstPaint: fp ? fp.startTime : null,
			fcp: fcp ? fcp.startTime : null,
			samples: window.__hm.samples,
			cls: window.__hm.cls,
			clsHero: window.__hm.clsHero,
			clsHeadline: window.__hm.clsHeadline,
			shifts: window.__hm.shifts,
			accentText: line ? (line.textContent || "").replace(/\s+/g, " ").trim() : null,
			headlineText: h1 ? (h1.textContent || "").replace(/\s+/g, " ").trim() : null,
			letters: line ? line.querySelectorAll(".hm-letter").length : 0,
			state: (document.querySelector("[data-hero-machine]") || {}).dataset?.state ?? null,
			statesSeen: [...new Set(window.__hm.samples.map((s) => s.s))],
			anims: (() => {
				try { return document.getAnimations().filter((a) => a.animationName === "hm-drop").length; }
				catch { return -1; }
			})(),
		};
	});

	await context.close();

	// The LAST incomplete→complete transition, and the total time spent hidden
	// after first paint. `settle` is measured from first paint, as specified.
	const s = data.samples;
	const fp = data.firstPaint ?? 0;
	let lastFlip = s.length && s[0].c ? s[0].t : null;
	let hidden = 0;
	for (let i = 1; i < s.length; i++) {
		if (s[i].c && !s[i - 1].c) lastFlip = s[i].t;
		if (!s[i].c) hidden += s[i].t - s[i - 1].t;
	}
	const everIncomplete = s.some((x) => !x.c);
	return {
		label, ...data,
		firstPaintMs: fp,
		settleAbs: lastFlip,
		settleFromPaint: lastFlip == null ? null : lastFlip - fp,
		hiddenMs: hidden,
		everIncomplete,
		endsComplete: s.length ? s[s.length - 1].c : false,
	};
}

/* ---- 1 & 2: the timing budget ----------------------------------------- */
const slow = await measure({ label: "Fast 3G + 4x CPU", throttle: true });
const fast = await measure({ label: "unthrottled desktop", throttle: false });

for (const r of [slow, fast]) {
	check(`[${r.label}] headline settles complete within ${BUDGET_MS}ms of first paint`,
		r.settleFromPaint != null && r.settleFromPaint <= BUDGET_MS,
		`settled at +${r.settleFromPaint == null ? "never" : Math.round(r.settleFromPaint)}ms (first paint ${Math.round(r.firstPaintMs)}ms)`);
	check(`[${r.label}] ends with the complete headline`,
		r.endsComplete && r.headlineText === HEADLINE,
		`state=${r.state} text=${JSON.stringify(r.headlineText)}`);
	check(`[${r.label}] the headline reveal contributes 0 to CLS`,
		r.clsHeadline === 0, `headline CLS ${r.clsHeadline} (page ${r.cls}, any-hero-source ${r.clsHero}) shifts ${JSON.stringify(r.shifts)}`);
}
check("[Fast 3G + 4x CPU] the animation actually ran (letters were split)",
	slow.letters > 0, `letters=${slow.letters}`);

/* ---- 3: no JS for the hero -------------------------------------------- */
const blocked = await measure({ label: "hero-machine.js blocked", throttle: false, blockHero: true });
check("(a) script blocked → complete headline, never split, never armed",
	blocked.headlineText === HEADLINE && blocked.letters === 0 &&
	!blocked.statesSeen.includes("armed") && !blocked.everIncomplete,
	`text=${JSON.stringify(blocked.headlineText)} letters=${blocked.letters} states=${JSON.stringify(blocked.statesSeen)}`);

// CONTROL. The only layout shift on this page is the sitewide webfont swap, and
// this is what proves it: with hero-machine.js never loaded, the page's CLS is
// unchanged to the last decimal. Any shift the reveal introduced would show up
// here as a difference. Without this run, "the headline scores 0" rests on my
// own attribution logic being right, which is exactly the thing that was wrong
// the first time.
check("(5/CLS) blocking the script does not change page CLS — the shift is not the hero's",
	Math.abs(blocked.cls - fast.cls) < 1e-9,
	`with script ${fast.cls}, without ${blocked.cls}`);
check("(5/CLS) the headline is never a layout-shift source, in any run",
	[slow, fast, blocked, ...[]].every((r) => r.clsHeadline === 0),
	`slow ${slow.clsHeadline}, fast ${fast.clsHeadline}, blocked ${blocked.clsHeadline}`);

/* ---- 4: prefers-reduced-motion ---------------------------------------- */
const rm = await measure({ label: "prefers-reduced-motion", throttle: false, reducedMotion: true });
check("(b) reduced motion → complete headline immediately, no hm-drop animation",
	rm.headlineText === HEADLINE && rm.anims === 0 && !rm.everIncomplete && rm.state === "done",
	`text=${JSON.stringify(rm.headlineText)} anims=${rm.anims} state=${rm.state} everIncomplete=${rm.everIncomplete}`);
check("(b) reduced motion never enters the armed state",
	!rm.statesSeen.includes("armed") && !rm.statesSeen.includes("play"),
	`states=${JSON.stringify(rm.statesSeen)}`);

/* ---- 5: a JS error inside the script ----------------------------------- */
const broke = await measure({ label: "script throws", throttle: false, breakHero: true });
check("(c) a throw inside the script force-finishes to the complete headline",
	broke.headlineText === HEADLINE && broke.state === "done" && !broke.everIncomplete,
	`text=${JSON.stringify(broke.headlineText)} state=${broke.state} everIncomplete=${broke.everIncomplete}`);

/* ---- 6: layout identity across every state ---------------------------- */
{
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	await page.goto(URL_, { waitUntil: "load" });
	await page.evaluate(() => document.fonts && document.fonts.ready);
	await page.waitForTimeout(1500);
	const boxes = await page.evaluate(() => {
		const root = document.querySelector("[data-hero-machine]");
		const line = document.querySelector("[data-machine-word]");
		const h1 = document.querySelector(".hero__headline");
		const grab = () => {
			const r = line.getBoundingClientRect(), hr = h1.getBoundingClientRect();
			return { x: r.x, y: r.y, w: r.width, h: r.height, h1h: hr.height, h1y: hr.y };
		};
		const out = {};
		for (const st of ["armed", "play", "done"]) { root.dataset.state = st; void line.offsetWidth; out[st] = grab(); }
		// The unsplit box: restore the original text node exactly as the HTML ships it.
		const split = line.innerHTML;
		line.textContent = "Main Street.";
		root.dataset.state = "idle";
		void line.offsetWidth;
		out.unsplit = grab();
		line.innerHTML = split;
		root.dataset.state = "done";
		return out;
	});
	await context.close();

	const keys = ["x", "y", "w", "h", "h1h", "h1y"];
	const near = (a, b, tol) => keys.every((k) => Math.abs(a[k] - b[k]) <= tol);
	check("(5) accent line box is identical in armed / play / done",
		near(boxes.armed, boxes.play, 0.01) && near(boxes.play, boxes.done, 0.01),
		JSON.stringify(boxes));
	// The split itself is the only step that can move anything; sub-pixel
	// differences are inline-block rounding, a full pixel would be a reflow.
	check("(5) splitting into letters does not change the line's box (<1px)",
		near(boxes.unsplit, boxes.done, 1.0),
		`unsplit ${JSON.stringify(boxes.unsplit)} vs done ${JSON.stringify(boxes.done)}`);
	results.push({ info: true, name: "measured boxes", detail: JSON.stringify(boxes) });
}

await browser.close();
server.close();

/* ---- report ------------------------------------------------------------ */
console.log("\nHERO HEADLINE — timing budget + progressive-enhancement contract\n");
for (const r of [slow, fast]) {
	console.log(`  ${r.label}`);
	console.log(`      first paint            ${Math.round(r.firstPaintMs)}ms`);
	console.log(`      headline settles at    +${r.settleFromPaint == null ? "never" : Math.round(r.settleFromPaint)}ms after first paint   (budget ${BUDGET_MS}ms)`);
	console.log(`      payoff line hidden for ${Math.round(r.hiddenMs)}ms total`);
	console.log(`      states seen            ${JSON.stringify(r.statesSeen)}`);
	console.log(`      CLS  page ${r.cls.toFixed(6)}   headline ${r.clsHeadline.toFixed(6)}   any-hero-source ${r.clsHero.toFixed(6)}`);
	console.log(`      shifts                 ${JSON.stringify(r.shifts)}`);
}
console.log();
for (const r of results) {
	if (r.info) { console.log(`  ..    ${r.name}: ${r.detail}`); continue; }
	console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : `\n          ${r.detail}`}`);
}
if (failures) { console.error(`\n${failures} FAILED\n`); process.exit(1); }
console.log("\nALL PASS\n");

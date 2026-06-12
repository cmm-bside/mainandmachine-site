#!/usr/bin/env node
// Mobile regression sweep — renders every route at 320/390/430px and asserts:
//   1. no horizontal overflow      (scrollWidth ≤ innerWidth)
//   2. no dead vertical scroll     (scrollHeight within 100px of footer bottom)
//   3. nothing escapes its card    (descendants stay inside bordered cards)
//   4. announcement bar never clips (scrollHeight == clientHeight)
//   5. touch targets ≥44px tall / ≥24px wide, minus the documented whitelist
//   6. JS-off body text within 5% of the JS-on render (reveals are fail-open)
//
// Needs Playwright, which is deliberately NOT a dependency (keep the Pages
// build lean). Run either way:
//   npm i -D playwright && node scripts/mobile-sweep.mjs
//   PLAYWRIGHT_PATH=/path/to/node_modules/playwright node scripts/mobile-sweep.mjs
// Serves the repo root itself on 127.0.0.1:8123 — no server needed.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { ROOT, STATIC_ROUTES } from "./lib/config.mjs";

const WIDTHS = [320, 390, 430];
const ROUTES = [...STATIC_ROUTES, "/blog/", "/blog/archive/", "/404.html"];

// Interactive elements allowed under 44px tall:
//   - inline links inside prose (WCAG 2.5.8 inline exception)
//   - radios/checkboxes wrapped in a styled label (the label is the target)
//   - the form honeypot (tabindex=-1, invisible to users)
const TARGET_WHITELIST = `(
  (el.closest('p, li') && !el.closest('footer')) ||
  ((el.type === 'radio' || el.type === 'checkbox') && el.closest('label')) ||
  (el.tagName === 'INPUT' && el.tabIndex === -1)
)`;

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
	const types = { html: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript", json: "application/json", png: "image/png", svg: "image/svg+xml", ico: "image/x-icon", xml: "application/xml", txt: "text/plain" };
	const server = http.createServer((req, res) => {
		let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
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
	return new Promise((resolve) => server.listen(8123, "127.0.0.1", () => resolve(server)));
}

async function checkRoute(browser, route, width) {
	const fails = [];
	const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
	await page.goto(`http://127.0.0.1:8123${route}`, { waitUntil: "networkidle" });
	await page.waitForTimeout(250);

	const r = await page.evaluate((whitelistSrc) => {
		const out = { fails: [] };
		const fail = (check, sel) => out.fails.push({ check, sel });
		const selOf = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");

		// 1 — horizontal overflow
		if (document.documentElement.scrollWidth > window.innerWidth) fail("h-overflow", "scrollWidth=" + document.documentElement.scrollWidth);

		// 2 — dead vertical scroll
		const footer = document.querySelector("footer");
		if (footer) {
			const gap = document.documentElement.scrollHeight - (footer.getBoundingClientRect().bottom + scrollY);
			if (gap > 100) fail("dead-scroll", "gap=" + Math.round(gap) + "px");
		}

		// 3 — escape from bordered cards
		const cards = document.querySelectorAll(".crop, .ind, .doc, .formcard, .feed__card, .feed__featured, .feed__empty, .build, .svc__item, .math__fig, .essay__cta, .path, .plain-card, .spec, [class*='card']");
		cards.forEach((cardEl) => {
			const cr = cardEl.getBoundingClientRect();
			if (!cr.width) return;
			cardEl.querySelectorAll("a, button, h1, h2, h3, p, span, td, th, img").forEach((child) => {
				const cs = getComputedStyle(child);
				if (cs.position === "absolute" || cs.position === "fixed" || cs.visibility === "hidden") return;
				const r = child.getBoundingClientRect();
				if (!r.width || !r.height) return;
				if (r.left < cr.left - 1.5 || r.right > cr.right + 1.5) fail("card-escape", selOf(child) + " in " + selOf(cardEl));
			});
		});

		// 4 — announcement bar clipping
		const bar = document.querySelector(".topbar");
		if (bar) {
			const inner = bar.querySelector(".topbar__in") || bar;
			if (bar.scrollHeight > bar.clientHeight + 1 || inner.scrollHeight > inner.clientHeight + 1) fail("topbar-clip", "scrollH=" + inner.scrollHeight + " clientH=" + inner.clientHeight);
		}

		// 5 — touch targets
		const whitelisted = new Function("el", "return " + whitelistSrc);
		document.querySelectorAll("a, button, input, select, textarea, summary, [role=button]").forEach((el) => {
			const r = el.getBoundingClientRect();
			if (!r.width || !r.height) return;
			if (getComputedStyle(el).visibility === "hidden") return;
			if (whitelisted(el)) return;
			if (r.height < 43.5 || r.width < 24) fail("tap-target", selOf(el) + "[" + (el.textContent || "").trim().slice(0, 24) + "] in " + selOf(el.parentElement) + " " + Math.round(r.width) + "x" + Math.round(r.height));
		});

		out.textLen = document.body.innerText.length;
		return out;
	}, TARGET_WHITELIST);
	r.fails.forEach((f) => fails.push(f));
	const jsTextLen = r.textLen;
	await page.close();

	// 6 — JS-off parity (once per route, at 390 only; reveals must fail open)
	if (width === 390) {
		const ctx = await browser.newContext({ viewport: { width, height: 844 }, javaScriptEnabled: false });
		const p2 = await ctx.newPage();
		await p2.goto(`http://127.0.0.1:8123${route}`, { waitUntil: "networkidle" });
		const offLen = await p2.evaluate(() => document.body.innerText.length);
		await ctx.close();
		if (jsTextLen && Math.abs(jsTextLen - offLen) / jsTextLen > 0.05) {
			fails.push({ check: "nojs-parity", sel: `js=${jsTextLen} nojs=${offLen}` });
		}
	}
	return fails;
}

const pw = await loadPlaywright();
const server = await serve();
const browser = await pw.chromium.launch();

const rows = [];
let failCount = 0;
for (const route of ROUTES) {
	for (const width of WIDTHS) {
		const fails = await checkRoute(browser, route, width);
		failCount += fails.length;
		rows.push({ route, width, fails });
		const status = fails.length ? `FAIL ${fails.map((f) => f.check + "(" + f.sel + ")").join("; ")}` : "pass";
		if (fails.length) console.log(`${route} @${width}: ${status}`);
	}
}

console.log("\n| route | 320 | 390 | 430 |");
console.log("|---|---|---|---|");
for (const route of ROUTES) {
	const cells = WIDTHS.map((w) => {
		const row = rows.find((r) => r.route === route && r.width === w);
		return row.fails.length ? "❌ " + [...new Set(row.fails.map((f) => f.check))].join(", ") : "✅";
	});
	console.log(`| ${route} | ${cells.join(" | ")} |`);
}
console.log(failCount ? `\n${failCount} failure(s).` : "\nAll checks pass on every route at every width.");

await browser.close();
server.close();
process.exit(failCount ? 1 : 0);

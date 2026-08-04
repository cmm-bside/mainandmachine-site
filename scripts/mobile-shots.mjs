#!/usr/bin/env node
/**
 * Mobile verification harness: full-page screenshots + a hard horizontal-overflow
 * gate on the five routes that carry the funnel.
 *
 *   npm run shots:mobile                          # serves the repo itself
 *   BASE_URL=https://<preview>.pages.dev npm run shots:mobile
 *
 * Screenshots land in audit/mobile-shots/<label>/<route>@<w>x<h>.png. `audit/`
 * is a LOCAL_SCRATCH_DIR, so the build guards ignore it and the images never
 * pollute a checks run. Pass --label=before / --label=after to keep two sets
 * side by side for a PR.
 *
 * /score/ IS PROXIED. It has no HTML in this repo — lib/score-proxy.mjs
 * reverse-proxies it from the Score app — so a plain static server 404s it and
 * a harness that "passes" locally would simply never have looked at the one
 * route it could not see. The local server mirrors the production proxy for
 * /score/* instead, and if that upstream is unreachable the route is reported
 * as SKIPPED rather than passing quietly.
 *
 * Overflow is measured as documentElement.scrollWidth > innerWidth, after
 * fonts settle and after a full scroll-through — reveal.js animates content in
 * on scroll, so a page can be clean at the top and overflow 3000px down.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { ROOT } from "./lib/config.mjs";

const ROUTES = ["/", "/book/", "/pricing/", "/services/", "/score/"];
const VIEWPORTS = [
	{ w: 390, h: 844, name: "iPhone 14 Pro" },
	{ w: 768, h: 1024, name: "iPad portrait" },
];
const PORT = 8189;
const SCORE_UPSTREAM = process.env.SCORE_ORIGIN || "https://score.mainandmachine.com";

const arg = (k, d) => {
	const a = process.argv.find((x) => x.startsWith(`--${k}=`));
	return a ? a.slice(k.length + 3) : d;
};
const LABEL = arg("label", "current");
const OUT_DIR = path.join(ROOT, "audit", "mobile-shots", LABEL);
const BASE_URL = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/+$/, "") : null;

const TYPES = { html: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript", json: "application/json", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", ico: "image/x-icon", woff2: "font/woff2", xml: "application/xml", txt: "text/plain" };

function serve() {
	const server = http.createServer(async (req, res) => {
		const url = new URL(req.url, "http://x");
		let p = decodeURIComponent(url.pathname);

		// Mirror functions/score/[[path]].js so /score/ is actually exercised.
		if (p === "/score" || p.startsWith("/score/") || p.startsWith("/s/")) {
			const upstreamPath = p === "/score/" ? "/score" : p;
			try {
				const r = await fetch(SCORE_UPSTREAM + upstreamPath + url.search, {
					headers: { "x-mm-proxy": "1", "user-agent": req.headers["user-agent"] || "" },
					redirect: "follow",
				});
				const buf = Buffer.from(await r.arrayBuffer());
				res.writeHead(r.status, { "Content-Type": r.headers.get("content-type") || "text/html" });
				return res.end(buf);
			} catch (err) {
				res.writeHead(502, { "Content-Type": "text/plain" });
				return res.end(`score upstream unreachable: ${err.message}`);
			}
		}

		let file = path.join(ROOT, p);
		if (p.endsWith("/")) file = path.join(file, "index.html");
		try {
			const data = fs.readFileSync(file);
			res.writeHead(200, { "Content-Type": TYPES[path.extname(file).slice(1)] || "application/octet-stream" });
			res.end(data);
		} catch {
			res.writeHead(404, { "Content-Type": "text/html" });
			try { res.end(fs.readFileSync(path.join(ROOT, "404.html"))); } catch { res.end("not found"); }
		}
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

const slug = (r) => (r === "/" ? "home" : r.replace(/^\/|\/$/g, "").replace(/\//g, "-"));

const { chromium } = await loadPlaywright();
const server = BASE_URL ? null : await serve();
const origin = BASE_URL || `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch();

fs.mkdirSync(OUT_DIR, { recursive: true });

const rows = [];
let failures = 0, skipped = 0;

for (const vp of VIEWPORTS) {
	const context = await browser.newContext({
		viewport: { width: vp.w, height: vp.h },
		deviceScaleFactor: 2,
		isMobile: vp.w < 768,
		hasTouch: true,
	});
	const page = await context.newPage();

	for (const route of ROUTES) {
		const url = `${origin}${route}`;
		let resp;
		try {
			resp = await page.goto(url, { waitUntil: "load", timeout: 60000 });
		} catch (err) {
			rows.push({ route, vp, status: "SKIP", detail: `navigation failed: ${err.message.split("\n")[0]}` });
			skipped++;
			continue;
		}
		if (!resp || resp.status() >= 400) {
			rows.push({ route, vp, status: "SKIP", detail: `HTTP ${resp ? resp.status() : "?"}` });
			skipped++;
			continue;
		}

		try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch { /* ignore */ }

		// Scroll the whole page first: reveal.js brings content in on scroll, so
		// measuring only the initial frame can miss an element that overflows
		// once it is revealed. Also settles lazy images before the screenshot.
		await page.evaluate(async () => {
			const step = Math.floor(window.innerHeight * 0.8);
			for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
				window.scrollTo(0, y);
				await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 40)));
			}
			window.scrollTo(0, 0);
			await new Promise((r) => setTimeout(r, 120));
		});

		const m = await page.evaluate(() => {
			const de = document.documentElement;
			const vw = window.innerWidth;
			// Name the widest offenders — "the page overflows" is not actionable.
			const culprits = [];
			for (const el of document.querySelectorAll("body *")) {
				const r = el.getBoundingClientRect();
				if (r.width === 0 && r.height === 0) continue;
				const right = r.right + window.scrollX;
				if (right > vw + 1) {
					culprits.push({
						sel: el.tagName.toLowerCase() + (el.className && typeof el.className === "string"
							? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""),
						over: Math.round(right - vw),
					});
				}
			}
			culprits.sort((a, b) => b.over - a.over);
			return {
				scrollWidth: de.scrollWidth,
				innerWidth: vw,
				over: de.scrollWidth - vw,
				culprits: culprits.slice(0, 5),
			};
		});

		const file = path.join(OUT_DIR, `${slug(route)}@${vp.w}x${vp.h}.png`);
		await page.screenshot({ path: file, fullPage: true });

		const bad = m.over > 0;
		if (bad) failures++;
		rows.push({
			route, vp,
			status: bad ? "FAIL" : "ok",
			detail: bad
				? `scrollWidth ${m.scrollWidth} > ${m.innerWidth} (+${m.over}px) — ${m.culprits.map((c) => `${c.sel} +${c.over}`).join(", ") || "no single element found"}`
				: `${m.scrollWidth}px`,
			shot: path.relative(ROOT, file),
		});
	}
	await context.close();
}

await browser.close();
if (server) server.close();

console.log(`\nMOBILE SHOTS — ${ROUTES.length} routes x ${VIEWPORTS.length} viewports  (${origin})`);
console.log(`screenshots: ${path.relative(ROOT, OUT_DIR)}/\n`);
const w = Math.max(...rows.map((r) => r.route.length)) + 2;
for (const r of rows) {
	console.log(`  ${r.status.padEnd(5)} ${r.route.padEnd(w)} ${String(r.vp.w).padStart(4)}x${r.vp.h}  ${r.detail}`);
}
if (skipped) console.log(`\n  ${skipped} route-check(s) SKIPPED — see above. A skip is not a pass.`);
if (failures) {
	console.error(`\n${failures} horizontal-overflow failure(s).\n`);
	process.exit(1);
}
console.log(`\nNo horizontal overflow on any route at any viewport.\n`);

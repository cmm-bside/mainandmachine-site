#!/usr/bin/env node
/**
 * Booking-funnel guard test for /book/.
 *
 * Exercises the REAL listener in book/index.html — nothing is re-implemented
 * here, because a test that reimplements the predicate only proves the copy is
 * right. Playwright's request routing lets us serve a stub page AT
 * https://calendly.com and another at https://evil.example, so `event.origin`
 * is the genuine article rather than a forged property: the browser stamps it,
 * and it is exactly what a real attacker could not fake.
 *
 * Asserts:
 *   1. calendly.event_type_viewed      → exactly one calendly_widget_viewed
 *   2. calendly.date_and_time_selected → exactly one calendly_time_selected
 *   3. both are latched — a repeat of either fires nothing further
 *   4. an identical message from ANY other origin fires nothing
 *   5. malformed data on the right origin fires nothing (string body, null,
 *      missing/non-string `event`, a name outside the calendly. namespace)
 *   6. calendly.event_scheduled → exactly one calendly_booked, and NO field of
 *      the invitee payload reaches the props (the no-PII contract)
 *
 * Needs Playwright, which is deliberately NOT a dependency — so this is not in
 * build:static, same as sweep:mobile / qa:matrix / mono:check:
 *   npm i -D playwright && npm run test:funnel
 *   PLAYWRIGHT_PATH=/path/to/node_modules/playwright npm run test:funnel
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { ROOT } from "./lib/config.mjs";

const PORT = 8181;

function serve() {
	const types = { html: "text/html", css: "text/css", js: "text/javascript", json: "application/json", svg: "image/svg+xml", png: "image/png", ico: "image/x-icon", txt: "text/plain", xml: "application/xml" };
	const server = http.createServer((req, res) => {
		let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
		let file = path.join(ROOT, p);
		if (p.endsWith("/")) file = path.join(file, "index.html");
		try {
			const data = fs.readFileSync(file);
			res.writeHead(200, { "Content-Type": types[path.extname(file).slice(1)] || "application/octet-stream" });
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

// A do-nothing page. It exists only so the browser gives us a frame whose
// origin is the one under test; every message is pushed from Node below.
const STUB = `<!doctype html><meta charset="utf-8"><title>stub</title><body>stub</body>`;

let failures = 0;
const results = [];
function check(name, ok, detail) {
	results.push({ name, ok, detail });
	if (!ok) failures++;
}

const { chromium } = await loadPlaywright();
const server = await serve();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// Every Calendly request — including the iframe the page mounts itself — is
// answered locally. No network, and the frame's origin is https://calendly.com.
await context.route("https://calendly.com/**", (route) =>
	route.fulfill({ status: 200, contentType: "text/html", body: STUB }));
await context.route("https://evil.example/**", (route) =>
	route.fulfill({ status: 200, contentType: "text/html", body: STUB }));

// Plausible calls land in Node, so a redirect cannot destroy the record.
const fired = [];
await context.exposeBinding("__mmRecord", (_src, ev) => { fired.push(ev); });
await context.addInitScript(() => {
	window.plausible = function (name, opts) {
		window.__mmRecord({ name: name, props: (opts && opts.props) || null });
		// Honour the beacon callback so the page's redirect path still runs.
		if (opts && typeof opts.callback === "function") opts.callback();
	};
});

const page = await context.newPage();
await page.goto(`http://127.0.0.1:${PORT}/book/`, { waitUntil: "load" });

// The page mounts the Calendly iframe itself; wait for that frame to exist.
await page.waitForFunction(() => !!document.querySelector("#calEmbed iframe"), null, { timeout: 15000 });
const calFrame = page.frames().find((f) => f.url().startsWith("https://calendly.com/"));
if (!calFrame) { console.error("FAIL: the Calendly iframe never mounted."); process.exit(1); }

// Tolerates a detached frame. If the origin guard is broken, a forged
// event_scheduled drives the real redirect to /book/thanks/ and tears every
// frame down mid-batch — which would otherwise surface as an opaque
// "Frame was detached" stack instead of the assertion that actually failed.
const post = async (frame, data) => {
	try { await frame.evaluate((d) => { window.parent.postMessage(d, "*"); }, data); }
	catch (err) { if (!/detached|destroyed|closed/i.test(String(err))) throw err; }
};
const settle = () => page.waitForTimeout(150);
const namesSince = (n) => fired.slice(n).map((e) => e.name);

// ---- 1 & 3a: event_type_viewed, once ------------------------------------
let mark = fired.length;
await post(calFrame, { event: "calendly.event_type_viewed", payload: {} });
await settle();
check("event_type_viewed → calendly_widget_viewed",
	namesSince(mark).filter((n) => n === "calendly_widget_viewed").length === 1,
	`got ${JSON.stringify(namesSince(mark))}`);

mark = fired.length;
await post(calFrame, { event: "calendly.event_type_viewed", payload: {} });
await post(calFrame, { event: "calendly.event_type_viewed", payload: {} });
await settle();
check("event_type_viewed is latched (repeats fire nothing)",
	namesSince(mark).length === 0, `got ${JSON.stringify(namesSince(mark))}`);

// ---- 2 & 3b: date_and_time_selected, once -------------------------------
mark = fired.length;
await post(calFrame, { event: "calendly.date_and_time_selected", payload: {} });
await settle();
check("date_and_time_selected → calendly_time_selected",
	namesSince(mark).filter((n) => n === "calendly_time_selected").length === 1,
	`got ${JSON.stringify(namesSince(mark))}`);

mark = fired.length;
await post(calFrame, { event: "calendly.date_and_time_selected", payload: {} });
await settle();
check("date_and_time_selected is latched (repeat fires nothing)",
	namesSince(mark).length === 0, `got ${JSON.stringify(namesSince(mark))}`);

// ---- 4: a hostile origin sending the exact same payloads ----------------
const evilFrame = await (async () => {
	await page.evaluate(() => {
		const f = document.createElement("iframe");
		f.src = "https://evil.example/forge";
		f.id = "evilFrame";
		f.style.cssText = "position:absolute;left:-9999px;width:10px;height:10px";
		document.body.appendChild(f);
	});
	await page.waitForFunction(() => {
		const f = document.getElementById("evilFrame");
		return !!(f && f.contentWindow);
	});
	for (let i = 0; i < 60 && !page.frames().some((f) => f.url().startsWith("https://evil.example/")); i++) await settle();
	return page.frames().find((f) => f.url().startsWith("https://evil.example/"));
})();
if (!evilFrame) { console.error("FAIL: the cross-origin test frame never loaded."); process.exit(1); }

mark = fired.length;
for (const evt of ["calendly.event_type_viewed", "calendly.date_and_time_selected", "calendly.event_scheduled"]) {
	await post(evilFrame, { event: evt, payload: { invitee: { uri: "x", email: "forged@evil.example" } } });
}
await settle();
check("forged messages from https://evil.example are ignored",
	namesSince(mark).length === 0, `got ${JSON.stringify(namesSince(mark))}`);
const stayed = page.url().includes("/book/") && !page.url().includes("/book/thanks");
check("forged event_scheduled did not navigate away",
	stayed, `url is ${page.url()}`);

// Everything below needs a live page. If the guard is broken the forged booking
// has already redirected us, so stop here with the reason stated rather than
// letting the remaining steps die on a detached frame.
if (!stayed) {
	await browser.close();
	server.close();
	console.error("\nBOOKING FUNNEL — guard test\n");
	for (const r of results) console.error(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : `\n          ${r.detail}`}`);
	console.error("\nABORTED: the origin guard let a forged message through and the page " +
		"navigated to the booked-confirmation. Remaining assertions were not run.\n");
	process.exit(1);
}

// ---- 5: malformed data on the CORRECT origin ---------------------------
mark = fired.length;
for (const bad of [
	"calendly.event_scheduled",              // a bare string, not an object
	null,
	{ event: 123 },                          // non-string event
	{ event: "calendly" },                   // no dot — outside the namespace
	{ event: "notcalendly.event_scheduled" },// wrong namespace
	{ payload: { invitee: {} } },            // no event at all
]) await post(calFrame, bad);
await settle();
check("malformed messages on the right origin are ignored",
	namesSince(mark).length === 0, `got ${JSON.stringify(namesSince(mark))}`);

// ---- 6: the booking itself, and the no-PII contract --------------------
mark = fired.length;
await post(calFrame, {
	event: "calendly.event_scheduled",
	payload: {
		event: { uri: "https://api.calendly.com/scheduled_events/EVT" },
		invitee: {
			uri: "https://api.calendly.com/scheduled_events/EVT/invitees/INV",
			name: "Test Person",
			email: "test.person@example.com",
			questions_and_answers: [{ question: "anything else?", answer: "secret context" }],
		},
	},
});
await settle();
const booked = fired.slice(mark).filter((e) => e.name === "calendly_booked");
check("event_scheduled → exactly one calendly_booked",
	booked.length === 1, `got ${JSON.stringify(namesSince(mark))}`);

const props = booked[0] ? booked[0].props : null;
const propsJson = JSON.stringify(props || {});
const PII = ["Test Person", "test.person@example.com", "secret context", "INV", "EVT", "invitee"];
const leaked = PII.filter((s) => propsJson.includes(s));
check("no invitee payload field reaches the props",
	leaked.length === 0, `props ${propsJson} leaked ${JSON.stringify(leaked)}`);
check("calendly_booked props are exactly { page }",
	props && Object.keys(props).length === 1 && props.page === "/book/",
	`props ${propsJson}`);

await browser.close();
server.close();

console.log("\nBOOKING FUNNEL — guard test\n");
for (const r of results) console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : `\n          ${r.detail}`}`);
console.log(`\n  all events recorded: ${JSON.stringify(fired.map((e) => e.name))}`);
if (failures) { console.error(`\n${failures} FAILED\n`); process.exit(1); }
console.log("\nALL PASS\n");

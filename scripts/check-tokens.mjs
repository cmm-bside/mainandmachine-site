#!/usr/bin/env node
// Every var(--token) must resolve to a token that actually exists.
//
//   npm run tokens:check
//
// Why this exists: a var() pointing at an undefined custom property is
// "invalid at computed-value time" — CSS does not fall back to the cascade,
// it throws the declaration away and uses the inherited or initial value.
// That failure is SILENT. No console warning, no lint error, nothing red.
//
// It had already happened four times in page-scoped <style> blocks that the
// token refactor never reached: /careers/ asked for --s-20 (the scale has no
// 20 step) and its "what happens next" list collapsed to zero gap; /terms/
// and /privacy/ asked for --fs-14 and /security/ for --fs-18 and --fs-22, all
// survivors of the retired 1.2 type scale. Each one silently rendered at the
// inherited size instead of the intended one.
//
// Scope: styles.css plus every page-scoped <style> block in committed HTML.
// A page may define its own tokens locally; those count as defined for that
// page only.
import fs from "node:fs";
import path from "node:path";
import { ROOT, LOCAL_SCRATCH_DIRS } from "./lib/config.mjs";

const SKIP = new Set([...LOCAL_SCRATCH_DIRS, "blog", "emails", "src", "functions", "blog-data", "images", "fonts"]);

const DEF_RE = /(--[a-zA-Z0-9-]+)\s*:/g;
const USE_RE = /var\(\s*(--[a-zA-Z0-9-]+)\s*(,|\))/g;
const STYLE_RE = /<style[^>]*>([\s\S]*?)<\/style>/gi;
// Inline style="" attributes carry var() too.
const INLINE_RE = /\sstyle="([^"]*)"/gi;

function defined(css) {
	const out = new Set();
	for (const [, name] of css.matchAll(DEF_RE)) out.add(name);
	return out;
}

// A var() with a fallback — var(--x, 12px) — still renders if --x is missing,
// so it is not a hard error. Only bare references are.
function used(css) {
	const out = [];
	for (const m of css.matchAll(USE_RE)) if (m[2] === ")") out.push(m[1]);
	return out;
}

const globalCss = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
const globalTokens = defined(globalCss);

// Some tokens are legitimately set at runtime rather than in a stylesheet —
// hero-machine.js stamps a per-letter --i for its stagger, the ROI band sets
// --roi-fill on the slider. Those are defined, just not by CSS, so collect
// every setProperty('--x') in the shipped scripts and in inline <script>.
const SETPROP_RE = /setProperty\(\s*['"](--[a-zA-Z0-9-]+)['"]/g;
const jsDir = path.join(ROOT, "js");
let runtimeSrc = "";
if (fs.existsSync(jsDir))
	for (const f of fs.readdirSync(jsDir))
		if (f.endsWith(".js")) runtimeSrc += fs.readFileSync(path.join(jsDir, f), "utf8");

const pages = [];
(function walk(dir, top = true) {
	for (const name of fs.readdirSync(dir)) {
		if (top && SKIP.has(name)) continue;
		if (name.startsWith(".")) continue;
		const fp = path.join(dir, name);
		if (fs.statSync(fp).isDirectory()) walk(fp, false);
		else if (name.endsWith(".html")) pages.push(fp);
	}
})(ROOT);

const errors = [];
let checked = 0;

const runtimeTokens = new Set();
for (const [, t] of runtimeSrc.matchAll(SETPROP_RE)) runtimeTokens.add(t);
for (const file of pages) {
	const html = fs.readFileSync(file, "utf8");
	for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi))
		for (const [, t] of m[1].matchAll(SETPROP_RE)) runtimeTokens.add(t);
}
for (const t of runtimeTokens) globalTokens.add(t);

// styles.css must be internally consistent too.
for (const t of used(globalCss)) {
	checked++;
	if (!globalTokens.has(t)) errors.push(`styles.css: var(${t}) is not defined anywhere`);
}

for (const file of pages) {
	const page = path.relative(ROOT, file);
	const html = fs.readFileSync(file, "utf8");
	const blocks = [...html.matchAll(STYLE_RE)].map((m) => m[1]);
	const inline = [...html.matchAll(INLINE_RE)].map((m) => m[1]);
	const local = defined(blocks.join("\n"));
	for (const css of [...blocks, ...inline]) {
		for (const t of used(css)) {
			checked++;
			if (!globalTokens.has(t) && !local.has(t))
				errors.push(`${page}: var(${t}) is not defined in styles.css or this page`);
		}
	}
}

const unique = [...new Set(errors)].sort();
if (unique.length) {
	console.error(`[tokens:check] FAILED — ${unique.length} undefined token reference(s):`);
	for (const e of unique) console.error("  - " + e);
	console.error(
		"\n  A var() with no fallback pointing at a missing token is invalid at\n" +
			"  computed-value time: the declaration is DROPPED, silently. Map it to a\n" +
			"  live step in styles.css rather than defining a new one."
	);
	process.exit(1);
}
console.log(`[tokens:check] OK — ${checked} var() reference(s) across styles.css + ${pages.length} page(s) all resolve.`);
